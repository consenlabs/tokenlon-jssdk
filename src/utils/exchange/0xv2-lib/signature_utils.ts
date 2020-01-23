
import { ECSignature, SignatureType } from '@0x/types'
import * as ethUtil from 'ethereumjs-util'
import * as _ from 'lodash'
// import { schemas } from '@0x/json-schemas'
// import { assert } from './assert'

export const signatureUtils = {
  /**
   * Checks if the supplied elliptic curve signature corresponds to signing `data` with
   * the private key corresponding to `signerAddress`
   * @param   data          The hex encoded data signed by the supplied signature.
   * @param   signature     An object containing the elliptic curve signature parameters.
   * @param   signerAddress The hex encoded address that signed the data, producing the supplied signature.
   * @return Whether the ECSignature is valid.
   */
  isValidECSignature(data: string, signature: ECSignature, signerAddress: string): boolean {
    // assert.isHexString('data', data)
    // assert.doesConformToSchema('signature', signature, schemas.ecSignatureSchema)
    // assert.isETHAddressHex('signerAddress', signerAddress)
    const normalizedSignerAddress = signerAddress.toLowerCase()

    const msgHashBuff = ethUtil.toBuffer(data)
    try {
      const pubKey = ethUtil.ecrecover(
        msgHashBuff,
        signature.v,
        ethUtil.toBuffer(signature.r),
        ethUtil.toBuffer(signature.s),
      )
      const retrievedAddress = ethUtil.bufferToHex(ethUtil.pubToAddress(pubKey))
      const normalizedRetrievedAddress = retrievedAddress.toLowerCase()
      return normalizedRetrievedAddress === normalizedSignerAddress
    } catch (err) {
      return false
    }
  },
  /**
   * Combines ECSignature with V,R,S and the EthSign signature type for use in 0x protocol
   * @param ecSignature The ECSignature of the signed data
   * @return Hex encoded string of signature (v,r,s) with Signature Type
   */
  convertECSignatureToSignatureHex(ecSignature: ECSignature): string {
    const signatureBuffer = Buffer.concat([
      ethUtil.toBuffer(ecSignature.v),
      ethUtil.toBuffer(ecSignature.r),
      ethUtil.toBuffer(ecSignature.s),
    ])
    const signatureHex = `0x${signatureBuffer.toString('hex')}`
    const signatureWithType = signatureUtils.convertToSignatureWithType(signatureHex, SignatureType.EthSign)
    return signatureWithType
  },
  /**
   * Combines the signature proof and the Signature Type.
   * @param signature The hex encoded signature proof
   * @param signatureType The signature type, i.e EthSign, Wallet etc.
   * @return Hex encoded string of signature proof with Signature Type
   */
  convertToSignatureWithType(signature: string, signatureType: SignatureType): string {
    const signatureBuffer = Buffer.concat([ethUtil.toBuffer(signature), ethUtil.toBuffer(signatureType)])
    const signatureHex = `0x${signatureBuffer.toString('hex')}`
    return signatureHex
  },
  /**
   * Adds the relevant prefix to the message being signed.
   * @param message Message to sign
   * @return Prefixed message
   */
  addSignedMessagePrefix(message: string): string {
    // assert.isString('message', message)
    const msgBuff = ethUtil.toBuffer(message)
    const prefixedMsgBuff = ethUtil.hashPersonalMessage(msgBuff)
    const prefixedMsgHex = ethUtil.bufferToHex(prefixedMsgBuff)
    return prefixedMsgHex
  },
}
