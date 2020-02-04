import { jsonrpc } from '../_request'
import { EXCHANGE_URL, TOKENLON_MARKET_URL } from '../../constants'
import {
  PlaceOrderParams,
  PlaceOrderResult,
  GetOrdersHistoryParams,
  GetOrderStateResult,
} from './interface'
import { TokenlonConfig } from '../../global'
import { TokenlonToken } from '../../global'
import { WEBSOCKET_URL } from '../../constants'
import { getTimestamp } from '../../utils/utils'
import { personalSign } from '../../utils/sign'

export const getTradeTokenList = async (): Promise<TokenlonToken[]> => {
  const tokens = await jsonrpc.get(
    EXCHANGE_URL,
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
    WEBSOCKET_URL,
    {},
    'auth.getSdkJwtToken',
    {
      timestamp,
      signature,
    },
  )
}

export const getSdkJwtToken = async (privateKey: string) => {
  const timestamp = getTimestamp()
  const signature = personalSign(privateKey, timestamp.toString())
  return getTokenFromServer({ timestamp, signature })
}

export const getMobileAppConfig = (): Promise<TokenlonConfig> => {
  return jsonrpc.get(EXCHANGE_URL, {}, 'tokenlon.getMobileAppConfig', {})
}

export const placeOrder = (params: PlaceOrderParams): Promise<PlaceOrderResult> => {
  return jsonrpc.get(
    EXCHANGE_URL,
    {},
    'tokenlon.placeOrder',
    params,
  )
}

export const getOrderState = async (executeTxHash: string): Promise<GetOrderStateResult> => {
  const result = await jsonrpc.get(
    EXCHANGE_URL,
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
    EXCHANGE_URL,
    {},
    'tokenlon.getOrdersHistory',
    params,
  )
  return orders
}

export const getMarketPrice = async (symbol) => {
  return jsonrpc.get(
    TOKENLON_MARKET_URL,
    {},
    'api.getMarketPrice',
    {
      base: symbol,
      quote: 'USDT',
    },
  )
}