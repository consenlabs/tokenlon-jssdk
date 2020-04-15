export type fn = (...args: any[]) => any

export type PersonalSignFn = (msg: string) => Promise<string>

export interface SignRawTransactionFnParams {
  to: string
  data: string
  from: string
  nonce: string
  gasLimit: string
  gasPrice: string
  value: string
}

export type signRawTransactionFn = (rawTxData: SignRawTransactionFnParams) => Promise<string>

export interface ApproveAndSwapFnParams {
  from: string
  approveTokenSymbol: string
  inputTokenSymbol: string
  inputTokenAmount: string
  outputTokenAmount: string
  outputTokenSymbol: string
  approveTx: SignRawTransactionFnParams
  orderTx: {
    data: string, // the msg used to through personalSign fn
  }
}

export interface ApproveAndSwapFnResult {
  approveTx: { sign: string, hash: string } | null,
  orderTx: { sign: string }
}

export type approveAndSwapFn = (params: ApproveAndSwapFnParams) => Promise<ApproveAndSwapFnResult>

export interface IConfig {
  debug?: boolean
  address: string
  providerUrl: string
  personalSignFn: PersonalSignFn
  signRawTransactionFn: signRawTransactionFn
  approveAndSwapFn?: approveAndSwapFn
}

export interface TokenlonConfig {
  networkId: number,
  erc20ProxyContractAddress: string
  exchangeContractAddress: string
  forwarderContractAddress: string
  zrxContractAddress: string
  tokenlonExchangeContractAddress: string
  wethContractAddress: string
  userProxyContractAddress: string
}

export interface TokenlonToken {
  symbol: string
  logo: string
  contractAddress: string
  decimal: number
  maxTradeAmount?: number
  minTradeAmount?: number
  precision?: number
  opposites?: string[]
}

export interface TokenlonMakerOrderBNToString {
  makerAddress: string
  makerAssetAmount: string
  makerAssetData: string
  makerFee: string
  takerAddress: string
  takerAssetAmount: string
  takerAssetData: string
  takerFee: string
  senderAddress: string
  feeRecipientAddress: string
  expirationTimeSeconds: string
  exchangeAddress: string
  salt: string
  makerWalletSignature: string
  quoteId: string
  feeFactor: number
}

export interface TokenlonOrderBNToString extends TokenlonMakerOrderBNToString {
  signedTxSalt: string
  executeTxHash: string
  signedTxData: string
  takerWalletSignature: string
}

export type SignTransactionResult = {
  sign: string
  hash: string,
}