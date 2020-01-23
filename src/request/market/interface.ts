export interface GetTickerParams {
  pairs: string
  period: '24H' | '7D' | '1M'
}

export interface Ticker {
  timestamp: number
  period: '24H' | '7D' | '1M'
  pairs: string
  lastTimestamp: number
  last: number
  high: number
  low: number
  ask: number
  mid: number
  bid: number
  vol: number
  txs: number
  wallet: number
  change: number
}

export interface GetTickerHistoryParams {
  pairs: string
  beginTimestamp: number
  endTimestamp: number
}

export interface TickerHistoryItem {
  date: string
  period: '24H'
  pairs: string
  last: number
  high: number
  low: number
  vol: number
  txs: number
  wallet: number
}

export interface GetTradeCapParams {
  currency: 'ETH' | 'USD' | 'CNY' | 'DAI'
  period: '24H' | '7D' | '1M'
}

export interface TradeCapBase {
  period: '24H' | '7D' | '1M'
  vol: number
  txs: number
  wallet: number
  currency: 'ETH' | 'USD' | 'CNY' | 'DAI'
}

export interface GetTradeCapResult extends TradeCapBase {
  timestamp: number
}

export interface GetTradeCapHistoryParams {
  currency: 'ETH' | 'USD' | 'CNY' | 'DAI'
  beginTimestamp: number
  endTimestamp: number
}

export interface TradeCapHistoryItem extends TradeCapBase {
  period: '24H'
  date: string
}