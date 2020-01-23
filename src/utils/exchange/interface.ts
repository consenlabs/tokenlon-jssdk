import { BigNumber } from './0xv2-lib'
import { SignResult } from '../../global'
import { PlaceOrderParams } from '../../request/client/interface'

export interface SignedTakerData {
  executeTxHash: string
  fillData: string
  salt: BigNumber
  signature: string
}

export interface SignFillOrderWithEthParams {
  walletAddress: string
  contractAddress: string
  to: string
  amount: string | number
  data: string
  password: string
  derivedKey?: string
  nonce: string
  gas: string
  gasPrice: string
}

export interface SignFillOrderWithEthResult {
  amount: string | number
  signResult: SignResult,
}

export interface SignHandlerResult extends PlaceOrderParams {
  isMakerEth?: boolean
  signFillOrderWithEthResult?: SignFillOrderWithEthResult
}
