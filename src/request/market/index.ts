import { jsonrpc } from '../_request'
import {
  GetTickerParams,
  Ticker,
  GetTickerHistoryParams,
  TickerHistoryItem,
  GetTradeCapParams,
  GetTradeCapResult,
  GetTradeCapHistoryParams,
  TradeCapHistoryItem,
} from './interface'
import { getTokenlonCoreMarketUrl } from '../../config/urls'

export const getPairs = async (): Promise<string[]> => {
  return jsonrpc.get(
    getTokenlonCoreMarketUrl(),
    {},
    'market.getPairs',
    {},
  )
}

export const getTicker = async (params: GetTickerParams): Promise<Ticker[]> => {
  return jsonrpc.get(
    getTokenlonCoreMarketUrl(),
    {},
    'market.getTicker',
    params,
  )
}

export const getTickerHistory = async (params: GetTickerHistoryParams): Promise<TickerHistoryItem[]> => {
  return jsonrpc.get(
    getTokenlonCoreMarketUrl(),
    {},
    'market.getTickerHistory',
    params,
  )
}

export const getTradeCap = async (params: GetTradeCapParams): Promise<GetTradeCapResult> => {
  return jsonrpc.get(
    getTokenlonCoreMarketUrl(),
    {},
    'market.getTradeCap',
    params,
  )
}

export const getTradeCapHistory = async (params: GetTradeCapHistoryParams): Promise<TradeCapHistoryItem[]> => {
  return jsonrpc.get(
    getTokenlonCoreMarketUrl(),
    {},
    'market.getTradeCapHistory',
    params,
  )
}