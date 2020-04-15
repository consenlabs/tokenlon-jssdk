import * as abi from 'ethereumjs-abi'
import { TokenlonToken } from '../global'
import { getTokenAllowance, fromDecimalToUnit, getTokenBySymbolAsync, addHexPrefix, sendSignedTransaction, fromUnitToDecimalBN, toBN, getEstimateGas } from './utils'
import { getCachedAppConfig } from './cacheUtils'
import * as _ from 'lodash'
import { APPROVE_METHOD, APPROVE_GAS } from '../constants'
import { getConfig } from '../config'
import { getBalanceAsync } from './balance'
import BigNumber from 'bignumber.js'
import { signTransactionAsync } from './sign'
import { getGasPriceAsync } from './gasPrice'
import { cacheUsedNonce, getNonceWrap } from './nonce'

export const getAllowanceAsync = async (symbol): Promise<number> => {
  const [token, appConfig] = await Promise.all([getTokenBySymbolAsync(symbol), getCachedAppConfig()])
  const walletAddress = getConfig().address

  const allow = await getTokenAllowance({
    walletAddress,
    contractAddress: token.contractAddress,
    spenderAddress: appConfig.userProxyContractAddress,
  })

  return fromDecimalToUnit(allow, token.decimal).toNumber()
}

export const isAllowanceEnoughAsync = async (symbol) => {
  const balance = await getBalanceAsync(symbol)
  if (!balance) return false

  const allow = await getAllowanceAsync(symbol)
  return allow >= balance
}

interface SetTokenAllowanceAsyncParams {
  token: TokenlonToken
  amountInBaseUnits: BigNumber
  ownerAddress: string
  spenderAddress: string
}

const getAllowanceGasLimitAsync = ({ from, to, data }) => {
  let gas = APPROVE_GAS
  try {
    gas = await getEstimateGas({
      value: '0x0',
      from,
      to,
      data,
    })
  } catch (e) {
    console.log(e)
  }
  return gas
}

const getAllowanceSignParamsAsync = async (params: SetTokenAllowanceAsyncParams) => {
  const { token, amountInBaseUnits, ownerAddress, spenderAddress } = params
  const contractAddress = token.contractAddress
  const value = amountInBaseUnits.toString()
  const encoded = abi.simpleEncode(APPROVE_METHOD, spenderAddress, value)
  const data = addHexPrefix(encoded.toString('hex'))
  const [gasPrice, nonce, gas] = await Promise.all([
    // 模拟 中等程度交易
    getGasPriceAsync({ base: 'USDT', amount: 100 }),
    getNonceWrap(),
    getAllowanceGasLimitAsync({ from: ownerAddress, to: contractAddress, data }),
  ])

  const signParams = {
    gas,
    gasPrice,
    from: ownerAddress,
    to: contractAddress,
    contractAddress,
    amount: 0,
    decimal: 18,
    nonce,
    data,
  }

  return signParams
}

const setTokenAllowanceAsync = async (params: SetTokenAllowanceAsyncParams) => {
  const signParams = await getAllowanceSignParamsAsync(params)
  const signResult = await signTransactionAsync(signParams)
  const txHash = await sendSignedTransaction(addHexPrefix(signResult.sign))

  // 交易发送成功后，缓存 nonce
  cacheUsedNonce(signParams.nonce)
  return txHash
}

export const setAllowanceAsync = async (symbol, amount) => {
  const address = getConfig().address
  const [token, appConfig] = await Promise.all([getTokenBySymbolAsync(symbol), getCachedAppConfig()])
  return setTokenAllowanceAsync({
    token,
    amountInBaseUnits: fromUnitToDecimalBN(amount, token.decimal),
    ownerAddress: address,
    spenderAddress: appConfig.userProxyContractAddress,
  })
}

export const setUnlimitedAllowanceAsync = async (symbol) => {
  const address = getConfig().address
  const [token, appConfig] = await Promise.all([getTokenBySymbolAsync(symbol), getCachedAppConfig()])
  return setTokenAllowanceAsync({
    token,
    amountInBaseUnits: toBN(2).pow(256).minus(1),
    ownerAddress: address,
    spenderAddress: appConfig.userProxyContractAddress,
  })
}

// 交给 服务端去广播
export const getUnlimitedAllowanceSignParamsAsync = async (symbol) => {
  const address = getConfig().address
  const [token, appConfig] = await Promise.all([getTokenBySymbolAsync(symbol), getCachedAppConfig()])
  const signParams = await getAllowanceSignParamsAsync({
    token,
    amountInBaseUnits: toBN(2).pow(256).minus(1),
    ownerAddress: address,
    spenderAddress: appConfig.userProxyContractAddress,
  })
  return signParams
}

export const closeAllowanceAsync = async (symbol) => {
  return setAllowanceAsync(symbol, 0)
}