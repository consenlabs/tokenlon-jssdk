import { takerSignAsync } from './takerSignAsync'
import { orderBNToString } from './helper'
import { getFillOrderWithETHData } from './signFillOrderWithEthAsync'
import { fromDecimalToUnit, addHexPrefix } from '../utils'
import { getConfig } from '../../config'
import { getCachedAppConfig } from '../cacheUtils'
import { getGasPriceAsync } from '../gasPrice'
import { SimpleOrder } from '../trade'
import { signTransactionAsync } from '../sign'
import { TOKENLON_FILLORDER_GAS } from '../../constants'
import { SignHandlerResult } from './interface'
import { TokenlonMakerOrderBNToString } from '../../global'
import { getNonceWrap } from '../nonce'

export interface SignHandlerParams {
  isMakerEth?: boolean
  simpleOrder: SimpleOrder
  makerOrder: TokenlonMakerOrderBNToString
}

export const signHandlerAsync = async (params: SignHandlerParams): Promise<SignHandlerResult> => {
  const { isMakerEth, makerOrder, simpleOrder } = params
  const appConfig = await getCachedAppConfig()
  const userAddr = getConfig().address
  const signedTakerData = await takerSignAsync(userAddr, makerOrder)
  const resultOrder = orderBNToString({
    ...makerOrder,
    signedTxSalt: signedTakerData.salt,
    // 用于链上匹配交易
    executeTxHash: signedTakerData.executeTxHash,
    signedTxData: signedTakerData.fillData,
    // taker 签名（交易签名）
    takerWalletSignature: signedTakerData.signature,
  } as any)

  let result = null

  if (isMakerEth) {
    const gasPrice = await getGasPriceAsync(simpleOrder)
    const nonce = await getNonceWrap()
    const data = getFillOrderWithETHData([signedTakerData.salt, signedTakerData.fillData, signedTakerData.signature])
    const amount = fromDecimalToUnit(makerOrder.takerAssetAmount, 18).toString()
    const signResult = await signTransactionAsync({
      to: appConfig.tokenlonExchangeContractAddress,
      amount,
      nonce,
      data,
      gas: TOKENLON_FILLORDER_GAS,
      gasPrice,
    })

    const txHash = signResult.hash
    const rawTx = addHexPrefix(signResult.sign as string)
    result = {
      userAddr: getConfig().address,
      order: resultOrder as any,
      txHash,
      rawTx,
      nonce: Number(nonce),
      isMakerEth,
      signFillOrderWithEthResult: {
        amount,
        signResult,
      },
    }
  } else {
    result = {
      userAddr: userAddr,
      order: resultOrder as any,
    }
  }

  return result
}