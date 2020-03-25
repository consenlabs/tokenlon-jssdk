import * as ethUtil from 'ethereumjs-util'
import * as _ from 'lodash'
import { toHex, sha3 } from 'web3-utils'
import { SignTransactionResult, SignRawTransactionFnParams } from '../../global'
import { fromUnitToDecimal, addHexPrefix } from '../utils'
import { getConfig } from '../../config'

interface ECSignature {
  v: number
  r: string
  s: string
}

// cp from https://github.com/0xProject/0x.js/blob/4d61d56639ad70b13245ca25047c6f299e746393/packages/0x.js/src/utils/signature_utils.ts
export const parseSignatureHexAsVRS = (signatureHex: string): ECSignature => {
  const signatureBuffer = ethUtil.toBuffer(signatureHex)
  let v = signatureBuffer[0]
  if (v < 27) {
    v += 27
  }
  const r = signatureBuffer.slice(1, 33)
  const s = signatureBuffer.slice(33, 65)
  const ecSignature: ECSignature = {
    v,
    r: ethUtil.bufferToHex(r),
    s: ethUtil.bufferToHex(s),
  }
  return ecSignature
}

// cp from https://github.com/0xProject/0x.js/blob/4d61d56639ad70b13245ca25047c6f299e746393/packages/0x.js/src/utils/signature_utils.ts
export const parseSignatureHexAsRSV = (signatureHex: string): ECSignature => {
  const { v, r, s } = ethUtil.fromRpcSig(signatureHex)
  const ecSignature: ECSignature = {
    v,
    r: ethUtil.bufferToHex(r),
    s: ethUtil.bufferToHex(s),
  }
  return ecSignature
}

export interface SignTransactionParams {
  gas: number
  gasPrice: number
  to: string
  data: string
  nonce: number
  amount: number | string
}

export const formatSignTransactionData = (params: SignTransactionParams): SignRawTransactionFnParams => {
  const { gasPrice, to, amount, gas, data, nonce } = params
  const address = getConfig().address
  const rawTx: SignRawTransactionFnParams = {
    to,
    data: data || '',
    from: address,
    nonce: toHex(nonce),
    gasLimit: toHex(gas),
    gasPrice: toHex(gasPrice),
    value: toHex(fromUnitToDecimal(amount, 18, 10)),
  }
  return rawTx
}

// use ethereumjs-tx and web3.eth.sendSignedTransaction to send transaction by privateKey
// value must be a decimal processed number
export const signTransactionAsync = async (params: SignTransactionParams): Promise<SignTransactionResult> => {
  const rawTx = formatSignTransactionData(params)
  const signRawTransactionFn = getConfig().signRawTransactionFn
  const sign = await signRawTransactionFn(rawTx)
  const hash = sha3(addHexPrefix(sign))

  return { hash, sign }
}