import { fn, TokenlonMakerOrderBNToString } from '../global'
import StompForExchange from './StompForExchange'
import { toBN } from '../utils/utils'
import { getConfig } from '../config'
import { SimpleOrder } from '../utils/trade'
import { JSSDK_ERRORS } from '../utils/errors'

let stompClient = null

export const setStompClient = () => {
  if (!stompClient) {
    stompClient = new StompForExchange()
  }
}

export const setStompConnect = async () => {
  try {
    await stompClient.connectStompAsync()
  } catch (e) {
    throw e
  }
}

export const updateRateAndPriceByStomp = ({
  base,
  quote,
  amount,
  side,
}: SimpleOrder, callback: fn, isLastOrder?: boolean, refuel?: boolean) => {
  if (!stompClient) {
    return
  }

  const currency = 'CNY'
  const userAddr = getConfig().address
  let apiName = ''
  let params = {
    currency,
    side,
    base,
    quote,
    refuel,
  } as any

  if (!amount || !userAddr) {
    apiName = 'getUserRate'
    params = { ...params, amount: 0 }

  } else {
    const processedAmount = amount[amount.toString().length - 1] === '.' ? amount.toString().replace('.', '') : toBN(amount).toString()

    if (!isLastOrder) {
      apiName = 'getNewOrder'
      params = { ...params, amount: processedAmount, userAddr }

    } else {
      apiName = 'getLastOrder'
      params = { ...params, amount: processedAmount, userAddr }
    }
  }

  stompClient[apiName](
    params,
    (err, data) => {
      callback(err, data)
    },
  )
}

export interface StompWsResult {
  exchangeable: boolean
  order?: TokenlonMakerOrderBNToString
  rate?: number
  minAmount?: number
  maxAmount?: number
  message?: string
  reason?: 'NO_DATA' | 'PERMIT_CHECK_FAILED' | 'SLP_FAILED'
}

const getOrderHelperGenerator = (isLastOrder: boolean) => {
  return async ({
    base,
    quote,
    amount,
    side,
  }: SimpleOrder, refuel?: boolean): Promise<StompWsResult> => {
    return new Promise((resolve, reject) => {
      let resolveCalled = false
      let rejectCalled = false

      // 5s 必须返回推出 Promise
      let resolveWrap = (data) => {
        if (!resolveCalled) {
          resolve(data)
          resolveCalled = true
          clearTimeout(timer)
          rejectWrap = (err) => console.log('rejectWrap modified', err)
        } else {
          console.log('resolveCalled', data)
        }
      }
      let rejectWrap = (err) => {
        if (!rejectCalled) {
          reject(err)
          rejectCalled = true
          clearTimeout(timer)
          resolveWrap = (data) => console.log('resolveWrap modified', data)
        } else {
          console.log('rejectCalled', err)
        }
      }

      let timer = setTimeout(() => {
        rejectWrap(new Error(JSSDK_ERRORS.REQUEST_5S_TIMEOUT))
      }, 5000)

      updateRateAndPriceByStomp({
        base,
        quote,
        side,
        amount,
      }, (err, data) => {
        if (err) {
          rejectWrap(err)
        } else {
          resolveWrap(data)
        }
      }, isLastOrder, refuel)
    }) as Promise<StompWsResult>
  }
}

export const getNewOrderAsync = getOrderHelperGenerator(false)
export const getLastOrderAsync = getOrderHelperGenerator(true)

export const disconnectStompClient = () => {
  stompClient && stompClient.disconnectStomp()
  stompClient = null
}

export const unsubscribeStompClientAll = () => {
  stompClient && stompClient.unSubscribeAll()
}
