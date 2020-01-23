import { jsonrpc } from '../_request'
import { TOKENLON_CORE_MARKET_URL } from '../../constants'
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

export const getPairs = async (): Promise<string[]> => {
  return jsonrpc.get(
    TOKENLON_CORE_MARKET_URL,
    {},
    'market.getPairs',
    {},
  )
}

export const getTicker = async (params: GetTickerParams): Promise<Ticker[]> => {
  return jsonrpc.get(
    TOKENLON_CORE_MARKET_URL,
    {},
    'market.getTicker',
    params,
  )
}

export const getTickerHistory = async (params: GetTickerHistoryParams): Promise<TickerHistoryItem[]> => {
  return jsonrpc.get(
    TOKENLON_CORE_MARKET_URL,
    {},
    'market.getTickerHistory',
    params,
  )
}

export const getTradeCap = async (params: GetTradeCapParams): Promise<GetTradeCapResult> => {
  return jsonrpc.get(
    TOKENLON_CORE_MARKET_URL,
    {},
    'market.getTradeCap',
    params,
  )
}

export const getTradeCapHistory = async (params: GetTradeCapHistoryParams): Promise<TradeCapHistoryItem[]> => {
  return jsonrpc.get(
    TOKENLON_CORE_MARKET_URL,
    {},
    'market.getTradeCapHistory',
    params,
  )
}