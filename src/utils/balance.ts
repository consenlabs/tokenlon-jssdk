import * as _ from 'lodash'
import { TokenlonToken } from '../global'
import { fromDecimalToUnit, getTokenBalance, getEtherBalance, getTokenBySymbolAsync } from './utils'
import { getConfig } from '../config'
import { ETH_ADDRESS } from '../constants'
import { getCachedTokenList } from './cacheUtils'

const getTokenBalanceAsync = async (token: TokenlonToken) => {
  const address = getConfig().address
  let balanceBN = null
  if (token.contractAddress === ETH_ADDRESS) {
    balanceBN = await getEtherBalance(address)
  } else {
    balanceBN = await getTokenBalance(address, token.contractAddress)
  }
  return balanceBN ? fromDecimalToUnit(balanceBN, token.decimal).toNumber() : 0
}

export const getBalancesAsync = async () => {
  const tokenList = await getCachedTokenList()
  const balances = await Promise.all(tokenList.map(async (token) => {
    const balance = await getTokenBalanceAsync(token)
    return {
      symbol: token.symbol,
      balance,
    }
  }))
  return balances
}

export const getBalanceAsync = async (symbol: string) => {
  const token = await getTokenBySymbolAsync(symbol)
  return getTokenBalanceAsync(token)
}