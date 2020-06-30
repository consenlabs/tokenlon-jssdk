import JssdkClient from './index'
import { getTimestamp } from './utils/utils'

const jssdkClient = JssdkClient({
  debug: true,
  address: '',
  personalSignFn: JssdkClient.genPersonalSign(''),
  signRawTransactionFn: JssdkClient.genSignRawTransaction(''),
  providerUrl: 'https://kovan.infura.io/v3/bf419bb938be4ce18c712080e90c2a26',
})

const testRun = async () => {
  const now = getTimestamp()
  const pairs = await jssdkClient.getPairs()
  console.log('pairs', pairs)

  const ticker = await jssdkClient.getTicker({
    pairs: 'ETH_USDT',
    period: '1M',
  })
  console.log('ticker', ticker)

  const tickerHistory = await jssdkClient.getTickerHistory({
    pairs: 'KNC_ETH',
    beginTimestamp: now - 86400 * 30,
    endTimestamp: now,
  })
  console.log('tickerHistory', tickerHistory)

  const tradeCap = await jssdkClient.getTradeCap({
    currency: 'USD',
    period: '24H',
  })
  console.log('tradeCap', tradeCap)

  const tradeCapHistory = await jssdkClient.getTradeCapHistory({
    currency: 'USD',
    beginTimestamp: now - 86400 * 7,
    endTimestamp: now,
  })
  console.log('tradeCapHistory', tradeCapHistory)

  const tokens = await jssdkClient.getTokens()
  console.log('tokens', tokens)

  const orderState = await jssdkClient.getOrderState('0x21755702165de6d55dbab44eeb92d3d4a31a8182ee315c50f86c5db790fdd4fd')
  console.log('orderState', orderState)

  const ordersHistory = await jssdkClient.getOrdersHistory({
    page: 1,
    perpage: 10,
  })
  console.log('ordersHistory', ordersHistory)

  const balance = await jssdkClient.getBalance('ETH')
  console.log('balance', balance)

  const balances = await jssdkClient.getBalances()
  console.log('balances', balances)

  const allowance = await jssdkClient.getAllowance('KNC')
  console.log('allowance', allowance)

  const isAllowanceEnough = await jssdkClient.isAllowanceEnough('KNC')
  console.log('isAllowanceEnough', isAllowanceEnough)

  const allowanceTx = await jssdkClient.setAllowance('KNC', 100)
  console.log('allowanceTx', allowanceTx)

  try {
    const closeAllowanceTx = await jssdkClient.closeAllowance('KNC')
    console.log('closeAllowanceTx', closeAllowanceTx)
  } catch (e) {
    console.log('closeAllowanceTx nonce conflict', e)
  }

  await new Promise(resolve => {
    console.log('wait 30s')
    setTimeout(resolve, 30 * 1000)
  })

  const unlimitedAllowanceTx = await jssdkClient.setUnlimitedAllowance('KNC')
  console.log('unlimitedAllowanceTx', unlimitedAllowanceTx)

  await new Promise(resolve => {
    console.log('wait 30s')
    setTimeout(resolve, 30 * 1000)
  })

  const priceResult = await jssdkClient.getPrice({
    base: 'ETH',
    quote: 'KNC',
    side: 'BUY',
    amount: 0.011,
  })
  console.log('getPrice result', priceResult)

  const quoteResult = await jssdkClient.getQuote({
    base: 'ETH',
    quote: 'KNC',
    side: 'BUY',
    amount: 0.011,
  })

  console.log('getQuote result', quoteResult)
  console.log('getQuote usedTimestamp', getTimestamp() - now, 's')

  const tradeResult = await jssdkClient.trade(quoteResult.quoteId)
  console.log('tradeResult', tradeResult)
}

testRun()