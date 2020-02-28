import * as _ from 'lodash'
import { JSSDK_ERRORS } from '../utils/errors'
import { IConfig, SignRawTransactionFnParams } from '../global'

const config = {
  debug: false,
  address: '',
  providerUrl: '',
  personalSignFn(_privateKey: string) { return '' },
  signRawTransactionFn(_params: SignRawTransactionFnParams) { return '' },
}

export const setConfig = (params: IConfig): IConfig => {
  if (!_.isObject(params)) throw JSSDK_ERRORS.INVALID_CONFIG_PARAMS
  const { personalSignFn, signRawTransactionFn } = params
  if (!_.isFunction(personalSignFn) || !_.isFunction(signRawTransactionFn)) throw JSSDK_ERRORS.INVALID_CONFIG_PARAMS
  return Object.assign(config, params)
}

export const getConfig = (): IConfig => {
  return config
}