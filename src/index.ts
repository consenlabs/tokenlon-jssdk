import 'babel-polyfill'
import { IConfig, setConfig } from './config'
import { getPairs, getTicker, getTickerHistory, getTradeCap, getTradeCapHistory } from './request/market'
import { getOrderState, getOrdersHistory } from './request/client'
import { getCachedTokenList } from './utils/cacheUtils'
import { getQuote, trade } from './utils/trade'
import { getBalanceAsync, getBalancesAsync } from './utils/balance'
import { getAllowanceAsync, isAllowanceEnoughAsync, setAllowanceAsync, setUnlimitedAllowanceAsync, closeAllowanceAsync } from './utils/allowance'

const JssdkClient = (config: IConfig) => {
  setConfig(config)

  return {
    // 基础 market API
    getPairs, getTicker, getTickerHistory, getTradeCap, getTradeCapHistory,

    // 使用缓存数据
    getTokens: getCachedTokenList,
    getOrderState,
    getOrdersHistory(data) {
      return getOrdersHistory({ ...data, userAddr: config.address })
    },

    // trade API
    getQuote,
    trade,

    // balance API
    getBalance: getBalanceAsync,
    getBalances: getBalancesAsync,

    // allowance API
    getAllowance: getAllowanceAsync,
    isAllowanceEnough: isAllowanceEnoughAsync,
    setAllowance: setAllowanceAsync,
    setUnlimitedAllowance: setUnlimitedAllowanceAsync,
    closeAllowance: closeAllowanceAsync,
  }
}

export default JssdkClient