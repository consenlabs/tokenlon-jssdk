import * as _ from 'lodash'
import { JSSDK_ERRORS } from '../utils/errors'
import { sha3 } from 'web3-utils'
import { IConfig, SignRawTransactionFnParams, ApproveAndSwapFnParams, ApproveAndSwapFnResult } from '../global'
import { addHexPrefix } from '../utils/utils'

const config = {
  debug: false,
  address: '',
  providerUrl: '',
  async personalSignFn(_msg: string) { return '' },
  async signRawTransactionFn(_params: SignRawTransactionFnParams) { return '' },
  async approveAndSwapFn(_params: ApproveAndSwapFnParams): Promise<ApproveAndSwapFnResult> {
    return {
      approveTx: { sign: '', hash: '' },
      orderTx: { sign: '' },
    }
  },
}

export const setConfig = (params: IConfig): IConfig => {
  if (!_.isObject(params)) throw JSSDK_ERRORS.INVALID_CONFIG_PARAMS
  const { personalSignFn, signRawTransactionFn, approveAndSwapFn } = params
  if (!_.isFunction(personalSignFn) || !_.isFunction(signRawTransactionFn)) throw JSSDK_ERRORS.INVALID_CONFIG_PARAMS

  Object.assign(config, params)

  if (!_.isFunction(approveAndSwapFn)) {
    (config as any).approveAndSwapFn = async (params: ApproveAndSwapFnParams): Promise<ApproveAndSwapFnResult> => {
      const { approveTx, orderTx } = params
      const result = { approveTx: null, orderTx: { sign: '' } } as ApproveAndSwapFnResult

      if (approveTx) {
        const approveTxSign = await signRawTransactionFn(approveTx)
        const approveTxHash = sha3(addHexPrefix(approveTxSign))

        result.approveTx = {
          sign: approveTxSign,
          hash: approveTxHash,
        }
      }

      result.orderTx.sign = await personalSignFn(orderTx.data)
      return result
    }
  }

  return config
}

export const getConfig = (): IConfig => {
  return config
}