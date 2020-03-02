import * as ethUtil from 'ethereumjs-util'
import * as _ from 'lodash'
import * as Tx from 'ethereumjs-tx'
import { PersonalSignFn, signRawTransactionFn } from '../../global'
import { padLeft } from '../utils'

type ECSignatureBuffer = {
  v: number
  r: Buffer
  s: Buffer;
}

// sig is buffer
const concatSig = (ecSignatureBuffer: ECSignatureBuffer): Buffer => {
  const { v, r, s } = ecSignatureBuffer
  const vSig = ethUtil.bufferToInt(v)
  const rSig = ethUtil.fromSigned(r)
  const sSig = ethUtil.fromSigned(s)
  const rStr = padLeft(ethUtil.toUnsigned(rSig).toString('hex'), 64)
  const sStr = padLeft(ethUtil.toUnsigned(sSig).toString('hex'), 64)
  const vStr = ethUtil.stripHexPrefix(ethUtil.intToHex(vSig))
  return ethUtil.addHexPrefix(rStr.concat(sStr, vStr)).toString('hex')
}

export const genPersonalSign = (privateKey: string): PersonalSignFn => {
  return (msg: string) => {
    const message = ethUtil.toBuffer(msg)
    const msgHash = ethUtil.hashPersonalMessage(message)
    const privateKeyBuffer = new Buffer(privateKey, 'hex')
    const sig = ethUtil.ecsign(msgHash, privateKeyBuffer)
    return ethUtil.bufferToHex(concatSig(sig))
  }
}

export interface SignRawTransactionFnParams {
  to: string
  data: string
  from: string
  nonce: string
  gasLimit: string
  gasPrice: string
  value: string
}

// use ethereumjs-tx and web3.eth.sendSignedTransaction to send transaction by privateKey
// value must be a decimal processed number
export const genSignRawTransaction = (privateKey: string): signRawTransactionFn => {
  return (rawTx: SignRawTransactionFnParams): string => {
    const tx = new (Tx.default ? Tx.default : Tx)(rawTx)
    const privateKeyBuffer = new Buffer(privateKey, 'hex')
    tx.sign(privateKeyBuffer)
    const serializedTx = tx.serialize()
    const sign = serializedTx.toString('hex')
    return sign
  }
}