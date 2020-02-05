import BN from 'bignumber.js'
import * as _ from 'lodash'
import { HEX_OF_BALANCE_OF, HEX_OF_GET_ALLOWANCE } from '../constants'
import { web3RequestWrap } from './web3'
import { JSSDK_ERRORS } from './errors'
import { getCachedTokenList } from './cacheUtils'

BN.config({
  EXPONENTIAL_AT: 1000,
})

export const toBN = (x): BN => {
  if (isNaN(Number(x))) return new BN(0)
  if (x instanceof BN) return x

  if (typeof x === 'string') {
    if (x.indexOf('0x') === 0 || x.indexOf('-0x') === 0) {
      return new BN((x).replace('0x', ''), 16)
    }
  }
  return new BN(x)
}

export const isBigNumber = (v: any) => {
  return v instanceof BN ||
    (v && v.isBigNumber === true) ||
    (v && v._isBigNumber === true) ||
    false
}

export const getTimestamp = () => Math.round(Date.now() / 1000)

export const padLeft = (n: string, width: number, z?: string): string => {
  const nz = z || '0'
  const nn = '' + n
  return nn.length >= width ? nn : new Array(width - nn.length + 1).join(nz) + nn
}

export function isHexPrefixed(str) {
  return str.slice(0, 2) === '0x'
}

export function addHexPrefix(str: string) {
  if (typeof str !== 'string') {
    return str
  }
  return isHexPrefixed(str) ? str : `0x${str}`
}

export function stripHexPrefix(str: string) {
  if (typeof str !== 'string') {
    return str
  }
  return isHexPrefixed(str) ? str.slice(2) : str
}

export function fromDecimalToUnit(balance: string | number | BN, decimal: number): BN {
  return toBN(balance).dividedBy(Math.pow(10, decimal))
}

export function fromUnitToDecimalBN(balance: string | number, decimal: number) {
  const amountBN = toBN(balance || 0)
  const decimalBN = toBN(10).pow(decimal)
  return amountBN.times(decimalBN)
}

export function fromUnitToDecimal(balance: string | number, decimal: number, base: number): string {
  return fromUnitToDecimalBN(balance, decimal).toString(base)
}

export function getTokenBalance(walletAddress: string, contractAddress: string): Promise<string> {
  return web3RequestWrap((web3) => {
    return new Promise((resolve, reject) => {
      const data = `0x${HEX_OF_BALANCE_OF}${padLeft(stripHexPrefix(walletAddress), 64)}`
      const params = { to: contractAddress, data }
      // console.log(`[web3 req] call params: ${JSON.stringify(params)}`)
      const method = web3.eth.call.bind(web3.eth)
      return method(params, (err, value) => {
        if (!err) {
          const balance = value === '0x' ? '0' : toBN(value).toString(10)
          resolve(balance)
        } else {
          console.warn(err)
          reject(err)
        }
      })
    })
  })
}

export interface GetTokenAllowanceParams {
  walletAddress: string,
  contractAddress: string,
  spenderAddress: string,
}

export function getTokenAllowance(params: GetTokenAllowanceParams): Promise<string> {
  return web3RequestWrap((web3) => {
    const { walletAddress, contractAddress, spenderAddress } = params
    return new Promise((resolve, reject) => {
      const data = `0x${HEX_OF_GET_ALLOWANCE}${padLeft(stripHexPrefix(walletAddress), 64)}${padLeft(stripHexPrefix(spenderAddress), 64)}`
      const params = { to: contractAddress, data }
      // console.log(`[web3 req] call params: ${JSON.stringify(params)}`)
      const method = web3.eth.call.bind(web3.eth)
      return method(params, (err, value) => {
        if (!err) {
          const allowance = value === '0x' ? '0' : toBN(value).toString(10)
          resolve(allowance)
        } else {
          console.warn(err)
          reject(err)
        }
      })
    })
  })
}

export function getEtherBalance(walletAddress: string) {
  return web3RequestWrap((web3) => {
    return new Promise((resolve, reject) => {
      web3.eth.getBalance(walletAddress, (err, result) => {
        if (err) return reject(err)
        resolve(toBN(result).toString(10))
      })
    })
  })
}

export function getNonce(address: string): Promise<number> {
  return web3RequestWrap(web3 => {
    return new Promise((resolve, reject) => {
      web3.eth.getTransactionCount(address, (err, nonce) => {
        if (!err) {
          resolve(nonce)
        } else {
          reject(err)
        }
      })
    })
  })
}

export function getGasPrice(): Promise<BN /* bigNumber */> {
  return web3RequestWrap(web3 => {
    return new Promise((resolve, reject) => {
      web3.eth.getGasPrice((err, gasPriceBN) => {
        if (!err) {
          console.log(`[web3 res] getGasPrice to string: ${gasPriceBN.toString(10)}`)
          resolve(gasPriceBN)
        } else {
          reject(err)
        }
      })
    })
  })
}

export function getEstimateGas(tx: { value: string, from: string, to: string, data: string }): Promise<number> {
  return web3RequestWrap(web3 => {
    return new Promise((resolve, reject) => {
      console.log(`[web3 req] estimateGas params: ${JSON.stringify(tx)}`)
      web3.eth.estimateGas(tx, (err, gas) => {
        if (!err) {
          resolve(gas)
        } else {
          reject(err)
        }
      })
    })
  })
}

export function getBlockNumber(): Promise<number> {
  return web3RequestWrap(web3 => {
    return new Promise((resolve, reject) => {
      web3.eth.getBlockNumber((err, blockNumber) => {
        if (!err) {
          resolve(blockNumber)
        } else {
          reject(err)
        }
      })
    })
  })
}

export function sendSignedTransaction(rawTx): Promise<string> {
  return web3RequestWrap(web3 => {
    return new Promise((resolve, reject) => {
      // TODO: maybe there will be an error named 'Failed to check for transaction receipt'
      // https://github.com/ethereum/web3.js/issues/3145
      web3.eth.sendSignedTransaction(rawTx, (err, txHash: string) => {
        if (!err) {
          resolve(txHash)
        } else {
          reject(err)
        }
      })
    })
  })
}

interface Receipt {
  // 32 Bytes - hash of the block where this transaction was in.
  blockHash: string
  // block number where this transaction was in.
  blockNumber: number
  // 32 Bytes - hash of the transaction.
  transactionHash: string
  // integer of the transactions index position in the block.
  transactionIndex: number
  // 20 Bytes - address of the sender.
  from: string
  // 20 Bytes - address of the receiver. null when its a contract creation transaction.
  to: string
  // The total amount of gas used when this transaction was executed in the block.
  cumulativeGasUsed: number
  // The amount of gas used by this specific transaction alone.
  gasUsed: number
  // 20 Bytes - The contract address created, if the transaction was a contract creation, otherwise null.
  contractAddress: string
  // Array of log objects, which this transaction generated.
  logs: Array<object>

  status?: undefined | null | string | 0 | 1
}

// Returns the receipt of a transaction by transaction hash.
// Note That the receipt is not available for pending transactions.
export function getTransactionReceipt(hash: string): Promise<Receipt> {
  return web3RequestWrap(web3 => {
    return new Promise((resolve, reject) => {
      web3.eth.getTransactionReceipt(hash, (err, receipt) => {
        if (!err) {
          resolve(receipt)
        } else {
          reject(err)
        }
      })
    })
  })
}

export const isCompeletedTxAsync = async (hash: string): Promise<boolean> => {
  try {
    const receipt = await getTransactionReceipt(hash)
    return receipt.blockNumber > 0
  } catch (e) {
    return false
  }
}

export function compareAddress(first: string, second: string): boolean {
  if (typeof first !== 'string' || typeof second !== 'string') {
    return false
  }
  return addHexPrefix(first).toUpperCase() === addHexPrefix(second).toUpperCase()
}

export const getTokenBySymbolAsync = async (symbol) => {
  if (!symbol || !_.isString(symbol)) throw JSSDK_ERRORS.PARAMS_ERROR

  const tokenList = await getCachedTokenList()
  const token = tokenList.find(t => t.symbol.toUpperCase() === symbol.toUpperCase())

  if (!token) throw JSSDK_ERRORS.TOKEN_NOT_FOUND

  return token
}