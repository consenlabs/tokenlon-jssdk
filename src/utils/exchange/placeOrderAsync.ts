import { SignHandlerResult } from './interface'
import { placeOrder } from '../../request/client'
import { sendSignedTransaction, addHexPrefix } from '../utils'

export const placeOrderAsync = async (params: SignHandlerResult) => {
  const { isMakerEth, signFillOrderWithEthResult, ...placeParams } = params
  const placeOrderResult = await placeOrder({
    ...placeParams,
    source: 'jssdk',
  })
  if (isMakerEth) {
    // placeOrder 中服务器会广播；此处内部做服务器广播的保护机制
    const txHash = await sendSignedTransaction(addHexPrefix(signFillOrderWithEthResult.signResult.sign))
    return {
      ...placeOrderResult,
      txHash,
    }
  }
  return placeOrderResult
}
