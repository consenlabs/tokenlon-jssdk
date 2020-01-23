import { BigNumber } from '@0x/utils/lib/src/configured_bignumber'
import { eip712Utils } from './eip712_utils'
import { signTypedDataUtils } from './sign_typed_data_utils'

export const getTransactionHex = (exchangeAddress, data: string, salt: BigNumber, signerAddress: string): string => {
  const executeTransactionData = {
    salt,
    signerAddress,
    data,
  }
  const typedData = eip712Utils.createZeroExTransactionTypedData(executeTransactionData, exchangeAddress)
  const eip712MessageBuffer = signTypedDataUtils.generateTypedDataHash(typedData)
  const messageHex = `0x${eip712MessageBuffer.toString('hex')}`
  return messageHex
}
