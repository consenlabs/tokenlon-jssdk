export type orderStatus = 'success' | 'pending' | 'faild'

export interface PlaceOrderParams {
  userAddr: string
  order: any
  source: 'jssdk'
  txHash?: string
  rawTx?: string
  nonce?: number
}

export interface ApproveAndSwapParams extends PlaceOrderParams {
  approvalTx: {
    rawTx: string,
    refuel: boolean,
  }
}

export interface PlaceOrderResult {
  success: boolean
}

export interface GetOrdersHistoryParams {
  userAddr: string
  page: number
  perpage: number
}

export interface GetOrderStateResult {
  status: 'unbroadcast' | 'pending' | 'success' | 'failed'
  order: any
}