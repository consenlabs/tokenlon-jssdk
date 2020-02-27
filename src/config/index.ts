import { IConfig, SignRawTransactionFnParams } from '../global'

const config = {
  address: '',
  providerUrl: '',
  personalSignFn(_privateKey: string) { return '' },
  signRawTransactionFn(_params: SignRawTransactionFnParams) { return '' },
}

export const setConfig = (params: IConfig): IConfig => {
  return Object.assign(config, params)
}

export const getConfig = (): IConfig => {
  return config
}