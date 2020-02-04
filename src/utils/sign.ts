import * as ethUtil from 'ethereumjs-util'
import * as _ from 'lodash'
import * as Tx from 'ethereumjs-tx'
import { toHex, sha3 } from 'web3-utils'
import { SignResult } from '../global'
import { fromUnitToDecimal, addHexPrefix, padLeft } from './utils'
import { getConfig } from '../config'

export interface ECSignature {
  v: number
  r: string
  s: string
}

type ECSignatureBuffer = {
  v: number
  r: Buffer
  s: Buffer;
}

// sig is buffer
export const concatSig = (ecSignatureBuffer: ECSignatureBuffer): Buffer => {
  const { v, r, s } = ecSignatureBuffer
  const vSig = ethUtil.bufferToInt(v)
  const rSig = ethUtil.fromSigned(r)
  const sSig = ethUtil.fromSigned(s)
  const rStr = padLeft(ethUtil.toUnsigned(rSig).toString('hex'), 64)
  const sStr = padLeft(ethUtil.toUnsigned(sSig).toString('hex'), 64)
  const vStr = ethUtil.stripHexPrefix(ethUtil.intToHex(vSig))
  return ethUtil.addHexPrefix(rStr.concat(sStr, vStr)).toString('hex')
}
export const personalECSign = (privateKey: string, msg: string): ECSignatureBuffer => {
  const message = ethUtil.toBuffer(msg)
  const msgHash = ethUtil.hashPersonalMessage(message)
  return ethUtil.ecsign(msgHash, new Buffer(privateKey, 'hex'))
}

export const personalSign = (privateKey: string, msg: string): string => {
  const sig = personalECSign(privateKey, msg)
  return ethUtil.bufferToHex(concatSig(sig))
}

export const personalECSignHex = (privateKey: string, msg: string): ECSignature => {
  const { r, s, v } = personalECSign(privateKey, msg)
  const ecSignature = {
    v,
    r: ethUtil.bufferToHex(r),
    s: ethUtil.bufferToHex(s),
  }
  return ecSignature
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

export interface SendTransactionParams {
  gas: number
  gasPrice: number
  to: string
  data: string
  nonce: number
  amount: number | string
}

// use ethereumjs-tx and web3.eth.sendSignedTransaction to send transaction by privateKey
// value must be a decimal processed number
export const signTransaction = (params: SendTransactionParams): SignResult => {
  const { gasPrice, to, amount, gas, data, nonce } = params
  const address = getConfig().address
  const rawTx = {
    to,
    data: data || '',
    from: address,
    nonce: toHex(nonce),
    gasLimit: toHex(gas),
    gasPrice: toHex(gasPrice),
    value: toHex(fromUnitToDecimal(amount, 18, 10)),
  }

  const tx = new (Tx.default ? Tx.default : Tx)(rawTx)
  const privateKeyBuffer = new Buffer(getConfig().privateKey, 'hex')
  tx.sign(privateKeyBuffer)
  const serializedTx = tx.serialize()
  const sign = serializedTx.toString('hex')
  const hash = sha3(addHexPrefix(sign))

  return { hash, sign }
}