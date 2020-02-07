import { getCachedTokenList } from './cacheUtils'
import { JSSDK_ERRORS } from './errors'
import { setStompClient, setStompConnect, unsubscribeStompClientAll, disconnectStompClient, getNewOrderAsync, getLastOrderAsync, StompWsResult } from '../stomp/stompClient'
import { toBN, getTimestamp, fromDecimalToUnit } from './utils'
import { signHandlerAsync } from './exchange/signHandlerAsync'
import { placeOrderAsync } from './exchange/placeOrderAsync'
import { cacheUsedNonce } from './nonce'
// import { getBalanceAsync } from './balance'
// import { getAllowanceAsync } from './allowance'
import { TokenlonMakerOrderBNToString } from '../global'

export interface SimpleOrder {
  base: string
  quote: string
  side: 'BUY' | 'SELL'
  amount: number
}

/**
 * @note  初步判断该 币对 是否支持，数量是否满足 imToken 系统默认最大最小代币交易配置
 */
const checkTradeSupported = async ({ base, quote, amount }) => {
  const tokenList = await getCachedTokenList()
  const baseToken = tokenList.find(t => t.symbol && base && t.symbol.toUpperCase() === base.toUpperCase())
  if (!baseToken) throw JSSDK_ERRORS.UNSUPPORTED_TRADE_PAIR

  const quoteTokenExist = baseToken.opposites && baseToken.opposites.some(s => s && s.toUpperCase() === quote.toUpperCase())
  if (!quoteTokenExist) {
    throw JSSDK_ERRORS.UNSUPPORTED_TRADE_PAIR
  }

  if (baseToken.minTradeAmount && +amount < baseToken.minTradeAmount) {
    throw JSSDK_ERRORS.LESS_THAN_SYSTEM_MIN_TRADE_AMOUNT
  }

  if (baseToken.maxTradeAmount && +amount > baseToken.maxTradeAmount) {
    throw JSSDK_ERRORS.GREATER_THAN_SYSTEM_MAX_TRADE_AMOUNT
  }
}

const checkStompWsResult = (amount, result: StompWsResult) => {
  const { exchangeable, order, minAmount, maxAmount, reason } = result
  if (reason) {
    throw reason
  }

  // 做市商的 message 比较随意，不放出来了
  // if (message) {
  //   throw message
  // }

  if (minAmount && +amount < minAmount) {
    throw JSSDK_ERRORS.LESS_THAN_MM_MIN_TRADE_AMOUNT
  }

  if (maxAmount && +amount > maxAmount) {
    throw JSSDK_ERRORS.GREATER_THAN_MM_MAX_TRADE_AMOUNT
  }

  if (!exchangeable) {
    throw JSSDK_ERRORS.CAN_NOT_RESOLVE_EXCHANGE
  }

  if (!order) {
    throw JSSDK_ERRORS.NO_DATA_RESPONSED
  }
}

export interface QuoteResult {
  quoteId: string
  base: string
  quote: string
  side: 'BUY' | 'SELL'
  amount: number
  quoteAmount: number
  price: number
  timestamp: number
  minAmount?: number
  maxAmount?: number
}

const transformStompResultToQuoteResult = async (simpleOrder: SimpleOrder, orderData: StompWsResult): Promise<QuoteResult>  => {
  const { amount, base, quote, side } = simpleOrder
  const { order, minAmount, maxAmount } = orderData
  const tokenList = await getCachedTokenList()
  const quoteToken = tokenList.find(t => t.symbol && quote && t.symbol.toUpperCase() === quote.toUpperCase())
  let quoteAssetAmount = null

  // 对于用户是买；做市商是卖，所以订单的 makerToken 就是 baseToken
  if (side === 'BUY') {
    quoteAssetAmount = order.takerAssetAmount
  } else {
    quoteAssetAmount = order.makerAssetAmount
  }

  const quoteAssetAmountUnit = fromDecimalToUnit(quoteAssetAmount, quoteToken.decimal).toNumber()

  return {
    base,
    quote,
    side,
    amount,
    quoteAmount: quoteAssetAmountUnit,
    quoteId: order.quoteId,
    price: toBN(quoteAssetAmountUnit).dividedBy(amount).toNumber(),
    timestamp: getTimestamp(),
    minAmount,
    maxAmount,
  }
}

export interface CachedQuoteData {
  simpleOrder: SimpleOrder
  order: TokenlonMakerOrderBNToString
  timestamp: number
}

// 缓存 order
let cachedQuoteDatas = [] as CachedQuoteData[]

const handleCachedQuoteDatas = (simpleOrder?: SimpleOrder, order?: TokenlonMakerOrderBNToString): CachedQuoteData[] => {
  const now = getTimestamp()
  // 订单在 10s 内，保留；超过 10s，移除
  cachedQuoteDatas = cachedQuoteDatas.filter(o => {
    return o.timestamp > now - 10
  })

  if (order) {
    cachedQuoteDatas.push({
      simpleOrder,
      order,
      timestamp: now,
    })
  }

  return cachedQuoteDatas
}

/**
 * @note 不返回 order，返回一个新的数据结构，方便用户使用
 */
export const getQuote = async (params: SimpleOrder): Promise<QuoteResult> => {
  const { base, quote, amount } = params
  await checkTradeSupported({ base, quote, amount })

  setStompClient()
  await setStompConnect()

  try {
    // only to fix lastOrder front steps
    const newOrderData = await getNewOrderAsync(params)
    checkStompWsResult(amount, newOrderData)

    const lastOrderData = await getLastOrderAsync(params)
    checkStompWsResult(amount, lastOrderData)

    unsubscribeStompClientAll()
    disconnectStompClient()

    const quoteResult = await transformStompResultToQuoteResult(params, lastOrderData)
    handleCachedQuoteDatas(params, lastOrderData.order)
    return quoteResult

  } catch (e) {
    // 断开连接
    unsubscribeStompClientAll()
    disconnectStompClient()

    throw e
  }
}

export interface TradeResult {
  success: boolean
  executeTxHash: string
  txHash?: string
}

/**
 * @note 通过 quoteId 找到本地缓存的订单，签名、上链（ETH）、挂单
 */
export const trade = async (quoteId: string): Promise<TradeResult> => {
  const cachedQuoteData = cachedQuoteDatas.find(item => item.order && item.order.quoteId.toUpperCase() === quoteId.toUpperCase())

  if (!cachedQuoteData || !cachedQuoteData.order) {
    throw JSSDK_ERRORS.INVALID_QUOTE_ID_PARAM
  }
  if (cachedQuoteData.timestamp < getTimestamp() - 10) {
    throw JSSDK_ERRORS.QUOTE_DATA_10S_EXPIRED
  }

  const { base, quote, side } = cachedQuoteData.simpleOrder
  const upperCasedSide = side.toUpperCase()

  const userOutTokenSymbol = upperCasedSide === 'SELL' ? base : quote
  const isMakerEth = userOutTokenSymbol === 'ETH'
  // const userOutToken = await getTokenBySymbolAsync(userOutTokenSymbol)
  // const userOutTokenAmount = upperCasedSide === 'SELL' ? amount :
  //   fromDecimalToUnit(cachedQuoteData.order.takerAssetAmount, userOutToken.decimal).toNumber()
  // const balance = await getBalanceAsync(userOutTokenSymbol)

  // balance check
  // if (userOutTokenAmount > balance || (isMakerEth && userOutTokenAmount >= balance)) {
  //   throw JSSDK_ERRORS.BALANCE_NOT_ENOUGH
  // }

  // if (!isMakerEth) {
  //   const allowance = await getAllowanceAsync(userOutTokenSymbol)
  //   if (userOutTokenAmount > allowance) {
  //     throw JSSDK_ERRORS.ALLOWANCE_NOT_ENOUGH
  //   }
  // }

  const signedResult = await signHandlerAsync({
    simpleOrder: cachedQuoteData.simpleOrder,
    makerOrder: cachedQuoteData.order,
    isMakerEth,
  })

  const placeOrderResult = await placeOrderAsync({
    ...signedResult,
    isMakerEth,
  })

  // 交易发送成功后，缓存 nonce
  cacheUsedNonce(signedResult.nonce)

  return {
    ...placeOrderResult,
    executeTxHash: signedResult.order.executeTxHash,
  }
}