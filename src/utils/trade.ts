import { getCachedTokenList } from './cacheUtils'
import { JSSDK_ERRORS } from './errors'
import { setStompClient, setStompConnect, unsubscribeStompClientAll, disconnectStompClient, getNewOrderAsync, getLastOrderAsync, StompWsResult } from '../stomp/stompClient'
import { toBN, getTimestamp, fromDecimalToUnit, getTokenBySymbolAsync, addHexPrefix } from './utils'
import { signHandlerAsync } from './exchange/signHandlerAsync'
import { placeOrderAsync, approveAndSwapAsync } from './exchange/placeOrderAsync'
import { cacheUsedNonce } from './nonce'
import { TokenlonMakerOrderBNToString } from '../global'
import { getUnlimitedAllowanceSignParamsAsync } from './allowance'
import { getOrderData, getFormatedSignedTakerData } from './exchange/takerSignAsync'
import { getConfig } from '../config'
import { formatSignTransactionData } from './sign'
import { orderBNToString } from './exchange/helper'

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
  feeSymbol: string
  feeAmount: number
  transferTokenSymbol: string
  transferTokenAmount: number
  receiveTokenSymbol: string
  receiveTokenAmount: number
  priceExcludeFee: number
  minAmount?: number
  maxAmount?: number
}

const transformStompResultToQuoteResult = async (simpleOrder: SimpleOrder, orderData: StompWsResult): Promise<QuoteResult> => {
  const { amount, base, quote, side } = simpleOrder
  const { order, minAmount, maxAmount } = orderData
  const tokenList = await getCachedTokenList()

  const baseToken = tokenList.find(t => t.symbol && base && t.symbol.toUpperCase() === base.toUpperCase())
  const quoteToken = tokenList.find(t => t.symbol && quote && t.symbol.toUpperCase() === quote.toUpperCase())

  // 对于用户是买；做市商是卖出，所以订单的 makerToken 就是 baseToken
  const makerToken = side === 'BUY' ? baseToken : quoteToken
  const takerToken = side === 'BUY' ? quoteToken : baseToken

  const makerTokenAmountUnit = fromDecimalToUnit(order.makerAssetAmount, makerToken.decimal).toNumber()
  const takerTokenAmountUnit = fromDecimalToUnit(order.takerAssetAmount, takerToken.decimal).toNumber()

  // 手续费收取的是订单的 makerToken
  const feeToken = makerToken
  // makerToken * feeFactor / 10000 即手续费
  const feeAmount = toBN(makerTokenAmountUnit).times(order.feeFactor).dividedBy(10000).toNumber()

  // 用户转出，就是做市商转入 takerToken
  const transferToken = takerToken
  const receiveToken = makerToken

  let quoteAssetAmountUnit = null
  let receiveTokenAmountUnit = null
  let transferTokenAmountUnit = null
  let priceExcludeFee = null

  // 用户买
  // base => order makerToken => user receiveToken => feeToken
  // quote => order takerToken => user transferToken
  if (side === 'BUY') {
    quoteAssetAmountUnit = takerTokenAmountUnit
    transferTokenAmountUnit = takerTokenAmountUnit
    receiveTokenAmountUnit = toBN(makerTokenAmountUnit).minus(feeAmount).toNumber()
    priceExcludeFee = toBN(transferTokenAmountUnit).dividedBy(receiveTokenAmountUnit).toNumber()

    // 用户卖
    // base => order takerToken => user transferToken
    // quote => order makerToken => user receiveToken => feeToken
  } else {
    quoteAssetAmountUnit = makerTokenAmountUnit
    transferTokenAmountUnit = takerTokenAmountUnit
    receiveTokenAmountUnit = toBN(makerTokenAmountUnit).minus(feeAmount).toNumber()
    priceExcludeFee = toBN(receiveTokenAmountUnit).dividedBy(transferTokenAmountUnit).toNumber()
  }

  const price = toBN(quoteAssetAmountUnit).dividedBy(amount).toNumber()

  return {
    base,
    quote,
    side,
    amount,
    quoteAmount: quoteAssetAmountUnit,
    quoteId: order.quoteId,
    price,
    feeSymbol: feeToken.symbol,
    feeAmount,
    transferTokenSymbol: transferToken.symbol,
    transferTokenAmount: transferTokenAmountUnit,
    receiveTokenSymbol: receiveToken.symbol,
    receiveTokenAmount: receiveTokenAmountUnit,
    priceExcludeFee,
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

  // 交易发送成功后，缓存 ETH-Token 的 tokenlon 交易 nonce
  if (isMakerEth) {
    cacheUsedNonce(signedResult.nonce)
  }

  return {
    ...placeOrderResult,
    executeTxHash: signedResult.order.executeTxHash,
  }
}

export const approveAndSwap = async (quoteId: string, needApprove?: boolean, refuel?: boolean): Promise<TradeResult> => {
  const userAddr = getConfig().address
  const approveAndSwapFn = getConfig().approveAndSwapFn
  const cachedQuoteData = cachedQuoteDatas.find(item => item.order && item.order.quoteId.toUpperCase() === quoteId.toUpperCase())

  if (!cachedQuoteData || !cachedQuoteData.order) {
    throw JSSDK_ERRORS.INVALID_QUOTE_ID_PARAM
  }
  if (cachedQuoteData.timestamp < getTimestamp() - 10) {
    throw JSSDK_ERRORS.QUOTE_DATA_10S_EXPIRED
  }

  const { base, quote, side, amount } = cachedQuoteData.simpleOrder
  const upperCasedSide = side.toUpperCase()
  const userOutTokenSymbol = upperCasedSide === 'SELL' ? base : quote
  const userInTokenSymbol = upperCasedSide === 'SELL' ? quote : base
  const isMakerEth = userOutTokenSymbol === 'ETH'

  if (isMakerEth) {
    throw JSSDK_ERRORS.CAN_NOT_USE_APPROVE_AND_SWAP_IF_OUT_TOKEN_IS_ETH
  }

  const userOutToken = await getTokenBySymbolAsync(userOutTokenSymbol)
  const userInToken = await getTokenBySymbolAsync(userInTokenSymbol)
  const userOutTokenAmount = upperCasedSide === 'SELL' ? amount : fromDecimalToUnit(cachedQuoteData.order.takerAssetAmount, userOutToken.decimal).toNumber()
  const userInTokenAmount = upperCasedSide === 'SELL' ? fromDecimalToUnit(cachedQuoteData.order.makerAssetAmount, userInToken.decimal).toNumber() : amount
  let approveSignParams = null
  let placeOrderResult = null
  const approvalTx = {
    rawTx: null,
    refuel,
  }

  // balance check
  // if (userOutTokenAmount > balance || (isMakerEth && userOutTokenAmount >= balance)) {
  //   throw JSSDK_ERRORS.BALANCE_NOT_ENOUGH
  // }

  if (!isMakerEth) {
    if (needApprove) {
      approveSignParams = await getUnlimitedAllowanceSignParamsAsync(userOutTokenSymbol)
    }

    const orderData = await getOrderData(userAddr, cachedQuoteData.order)
    const orderTx = {
      data: orderData.hash,
    }

    const approveAndSwapResult = await approveAndSwapFn({
      from: userAddr,
      approveTokenSymbol: userOutTokenSymbol,
      inputTokenSymbol: userInTokenSymbol,
      inputTokenAmount: '' + userInTokenAmount,
      outputTokenAmount: '' + userOutTokenAmount,
      outputTokenSymbol: userOutTokenSymbol,
      approveTx: approveSignParams ? formatSignTransactionData(approveSignParams) : null,
      orderTx,
    })

    console.log('approveAndSwapResult', approveAndSwapResult)

    if (approveAndSwapResult.approveTx) {
      approvalTx.rawTx = addHexPrefix(approveAndSwapResult.approveTx.sign)
    }

    const takerSignatureHex = approveAndSwapResult.orderTx.sign
    const signedTakerData = getFormatedSignedTakerData(userAddr, orderData, takerSignatureHex)

    const resultOrder = orderBNToString({
      ...cachedQuoteData.order,
      signedTxSalt: signedTakerData.salt,
      // 用于链上匹配交易
      executeTxHash: signedTakerData.executeTxHash,
      signedTxData: signedTakerData.fillData,
      // taker 签名（交易签名）
      takerWalletSignature: signedTakerData.signature,
    } as any)

    console.log('resultOrder', resultOrder)

    placeOrderResult = await approveAndSwapAsync({
      userAddr: userAddr,
      order: resultOrder,
      source: 'jssdk',
      approvalTx,
      isMakerEth,
    })

    if (approvalTx.rawTx) {
      // 发送成功后，缓存 授权的交易 nonce
      cacheUsedNonce(approveSignParams.nonce)
    }

    return {
      ...placeOrderResult,
      executeTxHash: orderData.executeTxHash,
    }
  }
}
