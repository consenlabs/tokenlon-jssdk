import { SignHandlerResult } from './interface'
import { placeOrder, approveAndSwap } from '../../request/client'
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

interface ApproveAndSwapAsyncParams extends SignHandlerResult {
  approvalTx: {
    rawTx: string,
    refuel: boolean,
  }
}

export const approveAndSwapAsync = async (params: ApproveAndSwapAsyncParams) => {
  const { isMakerEth, signFillOrderWithEthResult, ...placeParams } = params
  const placeOrderResult = await approveAndSwap({
    ...placeParams,
    source: 'jssdk',
  })
  return placeOrderResult
}
