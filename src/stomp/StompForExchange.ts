import * as SockJS from 'sockjs-client'
import { Stomp } from 'stompjs/lib/stomp'
import { getCachedSdkJwtToken } from '../utils/cacheUtils'
import { JSSDK_ERRORS } from '../utils/errors'
import { getWebsocketUrl } from '../config/urls'

const MAX_TRIED_TIMES = 3
const TRY_CONNECT_INTERVAL = 1000

// 提供ws服务的端点名称
const endpoint = 'exchange'

export default class StompForExchange {
  stompClient = null

  _path = null
  _header = null
  _callback = null
  _subscribeName = null

  tokenlonRateSubscription = null
  userRateSubscription = null
  newOrderSubscription = null
  lastOrderSubscription = null

  connecting = false
  triedFailedTimes = 0
  // 避免页面退出后仍一直重连
  connectInterrupt = false

  private tryConnectStompAsync = async () => {
    const token = await getCachedSdkJwtToken()
    const Authorization = `JSSDK ${token}`
    const host = getWebsocketUrl().replace(/\/rpc$/, '')
    return new Promise((resolve, reject) => {
      try {
        const socket = new SockJS(`${host}/${endpoint}?Authorization=${encodeURIComponent(Authorization)}`)
        this.stompClient = Stomp.over(socket)
        this.stompClient.debug = null
        this.stompClient.connect(
          '',
          '',
          resolve,
          reject,
        )
      } catch (e) {
        console.log('connect init error', e)
        reject(e)
      }
    })
  }

  connectStompAsync = async () => {
    if (this.connectInterrupt) {
      return
    }
    if (this.connecting) {
      throw JSSDK_ERRORS.ALREADY_CONNETING
    }
    if (this.triedFailedTimes >= MAX_TRIED_TIMES) {
      throw JSSDK_ERRORS.CONNECT_FAILED
    }
    try {
      this.connecting = true
      await this.tryConnectStompAsync()
      this.triedFailedTimes = 0
      this.connecting = false
    } catch (e) {
      this.connecting = false
      this.triedFailedTimes += 1
      if (this.connectInterrupt) {
        return
      }
      await new Promise(resolve => {
        setTimeout(resolve, TRY_CONNECT_INTERVAL)
      })
      await this.connectStompAsync()
    }
  }

  disconnectStomp = () => {
    this.connectInterrupt = true
    this.tokenlonRateSubscription && this.tokenlonRateSubscription.unsubscribe()
    this.userRateSubscription && this.userRateSubscription.unsubscribe()
    this.newOrderSubscription && this.newOrderSubscription.unsubscribe()
    this.lastOrderSubscription && this.lastOrderSubscription.unsubscribe()
    this.stompClient && this.stompClient.disconnect()
    this.tokenlonRateSubscription = null
    this.newOrderSubscription = null
    this.lastOrderSubscription = null
    this.stompClient = null
  }

  unSubscribeAll = () => {
    if (this.stompClient) {
      ['tokenlonRateSubscription', 'userRateSubscription', 'newOrderSubscription', 'lastOrderSubscription'].forEach(subscribeName => {
        if (this[subscribeName]) {
          this[subscribeName].unsubscribe()
        }
      })
    }
  }

  private wsSubscribeJsonHelper = (subscribeName, path, callback, header?: object) => {
    const cb = (message) => {
      try {
        // first response is None, need to skip
        if (message && message.body && message.body === 'None') return
        const obj = JSON.parse(message.body)
        callback(null, obj)
      } catch (e) {
        console.log('path get message JSON.parse error', e)
        callback(e, null)
      }
    }
    if (this.stompClient) {
      this.unSubscribeAll()
      this._subscribeName = subscribeName
      this._path = path
      this._callback = callback
      this._header = header
      try {
        this[subscribeName] = this.stompClient.subscribe(
          path,
          cb,
          header,
        )
      } catch (e) {
        console.log(`subscrible ${subscribeName} ${path} error`, e)
      }
      return this[subscribeName]
    }
  }

  getSymbol = ({ base, quote }) => {
    return `${base.toUpperCase()}_${quote.toUpperCase()}`
  }

  // /user/order/{symbol}/{side}/{amount}/{userAddr}
  getNewOrder = ({
    base,
    quote,
    side,
    amount,
    currency,
    userAddr,
  }, callback) => {
    const symbol = this.getSymbol({ base, quote })
    const path = `/user/order/${symbol}/${side.toUpperCase()}/${amount}/${userAddr}`
    this.wsSubscribeJsonHelper(
      'newOrderSubscription',
      path,
      callback,
      currency ? { currency } : {},
    )
  }
  getLastOrder = ({
    base,
    quote,
    side,
    amount,
    currency,
    userAddr,
  }, callback) => {
    const symbol = this.getSymbol({ base, quote })
    const path = `/user/lastOrder/${symbol}/${side.toUpperCase()}/${amount}/${userAddr}`
    this.wsSubscribeJsonHelper(
      'lastOrderSubscription',
      path,
      callback,
      currency ? { currency } : {},
    )
  }
}
