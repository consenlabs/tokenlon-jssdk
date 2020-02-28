import { jsonrpc } from '../_request'
import {
  PlaceOrderParams,
  PlaceOrderResult,
  GetOrdersHistoryParams,
  GetOrderStateResult,
} from './interface'
import { TokenlonConfig } from '../../global'
import { TokenlonToken } from '../../global'
import { getTimestamp } from '../../utils/utils'
import { getConfig } from '../../config'
import { getExchangeUrl, getWebsocketUrl, getTokenlonMarketUrl } from '../../config/urls'

export const getTradeTokenList = async (): Promise<TokenlonToken[]> => {
  const tokens = await jsonrpc.get(
    getExchangeUrl(),
    {},
    'tokenlon.getTradeTokenList',
    {})

  // 做处理 过滤跨链内容
  return tokens.filter(t => {
    t.opposites = t.opposites.join('_').replace(/(ATOM|EOS)/g, '').split('_').filter((str) => !!str)
    return t.xChainType !== 'EOS' && t.xChainType !== 'COSMOS'
  })
}

const getTokenFromServer = async ({ timestamp, signature }): Promise<string> => {
  return jsonrpc.get(
    getWebsocketUrl(),
    {},
    'auth.getSdkJwtToken',
    {
      timestamp,
      signature,
    },
  )
}

export const getSdkJwtToken = async () => {
  const timestamp = getTimestamp()
  const signature = getConfig().personalSignFn(timestamp.toString())
  return getTokenFromServer({ timestamp, signature })
}

export const getMobileAppConfig = (): Promise<TokenlonConfig> => {
  return jsonrpc.get(getExchangeUrl(), {}, 'tokenlon.getMobileAppConfig', {})
}

export const placeOrder = (params: PlaceOrderParams): Promise<PlaceOrderResult> => {
  return jsonrpc.get(
    getExchangeUrl(),
    {},
    'tokenlon.placeOrder',
    params,
  )
}

export const getOrderState = async (executeTxHash: string): Promise<GetOrderStateResult> => {
  const result = await jsonrpc.get(
    getExchangeUrl(),
    {},
    'tokenlon.getOrderState',
    {
      executeTxHash,
    },
  )

  return result
}

export const getOrdersHistory = async (params: GetOrdersHistoryParams): Promise<any> => {
  const orders = await jsonrpc.get(
    getExchangeUrl(),
    {},
    'tokenlon.getOrdersHistory',
    params,
  )
  return orders
}

export const getMarketPrice = async (symbol) => {
  return jsonrpc.get(
    getTokenlonMarketUrl(),
    {},
    'api.getMarketPrice',
    {
      base: symbol,
      quote: 'USDT',
    },
  )
}