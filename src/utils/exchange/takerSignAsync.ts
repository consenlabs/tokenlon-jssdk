import { BigNumber, signatureUtils, generatePseudoRandomSalt, SignatureType, getTransactionHex } from './0xv2-lib'
import * as ethUtil from 'ethereumjs-util'
import * as _ from 'lodash'
import { encodeData } from './abi/encodeData2'
import { orderStringToBN, orderBNToString } from './helper'
import { getConfig } from '../../config'
import { getCachedAppConfig } from '../cacheUtils'
import { parseSignatureHexAsRSV, parseSignatureHexAsVRS } from '../sign'
import { TokenlonMakerOrderBNToString } from '../../global'

interface SignedTakerData {
  executeTxHash: string
  fillData: string
  salt: BigNumber
  signature: string
}

const fillOrKillOrderTx = (signedMakerOrder) => {
  const o = orderBNToString(signedMakerOrder) as any
  return encodeData('exchangeV2', 'fillOrKillOrder', [o, o.takerAssetAmount.toString(), o.signature])
}

const translateMakerOrder = (makerOrder) => {
  const { makerAddress, makerAssetAmount, makerAssetData, makerFee,
    takerAddress, takerAssetAmount, takerAssetData, takerFee,
    senderAddress, feeRecipientAddress, expirationTimeSeconds,
    exchangeAddress, salt, makerWalletSignature } = makerOrder
  return orderStringToBN({
    makerAddress, makerAssetAmount, makerAssetData, makerFee,
    takerAddress, takerAssetAmount, takerAssetData, takerFee,
    senderAddress, feeRecipientAddress, expirationTimeSeconds,
    exchangeAddress, salt, signature: makerWalletSignature,
  } as any)
}

export const convertSignature = ({ normalizedSignerAddress, prefixedMsgHashHex, signature }) => {
  // HACK: There is no consensus on whether the signatureHex string should be formatted as
  // v + r + s OR r + s + v, and different clients (even different versions of the same client)
  // return the signature params in different orders. In order to support all client implementations,
  // we parse the signature in both ways, and evaluate if either one is a valid signature.
  // r + s + v is the most prevalent format from eth_sign, so we attempt this first.
  // tslint:disable-next-line:custom-no-magic-numbers
  const validVParamValues = [27, 28]
  const ecSignatureRSV = parseSignatureHexAsRSV(signature)
  if (_.includes(validVParamValues, ecSignatureRSV.v)) {
    const isValidRSVSignature = signatureUtils.isValidECSignature(
      prefixedMsgHashHex,
      ecSignatureRSV,
      normalizedSignerAddress,
    )
    if (isValidRSVSignature) {
      const convertedSignatureHex = signatureUtils.convertECSignatureToSignatureHex(
        ecSignatureRSV,
      )
      return convertedSignatureHex
    }
  }
  const ecSignatureVRS = parseSignatureHexAsVRS(signature)
  if (_.includes(validVParamValues, ecSignatureVRS.v)) {
    const isValidVRSSignature = signatureUtils.isValidECSignature(
      prefixedMsgHashHex,
      ecSignatureVRS,
      normalizedSignerAddress,
    )
    if (isValidVRSSignature) {
      const convertedSignatureHex = signatureUtils.convertECSignatureToSignatureHex(
        ecSignatureVRS,
      )
      return convertedSignatureHex
    }
  }
}

/**
 * @author Xaber
 * @param orderHash
 * @param signerAddress
 */
export const ecSignOrderHashAsync = async (
  signerAddress: string,
  orderHash: string,
) => {
  const msgHashHex = orderHash
  const normalizedSignerAddress = signerAddress.toLowerCase()
  const prefixedMsgHashHex = signatureUtils.addSignedMessagePrefix(orderHash)
  const signature = await getConfig().personalSignFn(msgHashHex)
  const resultSignature = convertSignature({ normalizedSignerAddress, prefixedMsgHashHex, signature })

  if (resultSignature) {
    return resultSignature
  }

  throw new Error('InvalidSignature')
}

interface OrderData {
  hash: string
  fillData: string
  executeTxHash: string
  takerTransactionSalt: BigNumber
}

export const getOrderData = async (userAddr: string, makerOrder: TokenlonMakerOrderBNToString): Promise<OrderData> => {
  const appConfig = await getCachedAppConfig()
  // use current wallet address as receiverAddr
  const receiverAddr = userAddr
  const signedMakerOrder = translateMakerOrder(makerOrder) as any
  const fillData = fillOrKillOrderTx(signedMakerOrder)
  const takerTransactionSalt = generatePseudoRandomSalt()
  const executeTxHash = getTransactionHex(appConfig.exchangeContractAddress, fillData, takerTransactionSalt, signedMakerOrder.takerAddress)
  const hash = ethUtil.bufferToHex(
    Buffer.concat([
      ethUtil.toBuffer(executeTxHash),
      ethUtil.toBuffer(receiverAddr),
    ]))
  return {
    hash,
    fillData,
    executeTxHash,
    takerTransactionSalt,
  }
}

export const getFormatedSignedTakerData = (userAddr: string, orderData: OrderData, takerSignatureHex: string): SignedTakerData => {
  const receiverAddr = userAddr
  const walletSign = ethUtil.bufferToHex(
    Buffer.concat([
      ethUtil.toBuffer(takerSignatureHex).slice(0, 65),
      ethUtil.toBuffer(receiverAddr),
    ]))
  const takerWalletSignatureHex = signatureUtils.convertToSignatureWithType(walletSign, SignatureType.Wallet)

  return {
    executeTxHash: orderData.executeTxHash,
    fillData: orderData.fillData,
    salt: orderData.takerTransactionSalt,
    signature: takerWalletSignatureHex,
  }
}

export const takerSignAsync = async (userAddr: string, makerOrder: TokenlonMakerOrderBNToString): Promise<SignedTakerData> => {
  const orderData = await getOrderData(userAddr, makerOrder)
  const takerSignatureHex = await ecSignOrderHashAsync(userAddr, orderData.hash)
  return getFormatedSignedTakerData(userAddr, orderData, takerSignatureHex)
}
