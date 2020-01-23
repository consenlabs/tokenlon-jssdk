export interface IConfig {
  address: string
  privateKey: string
  providerUrl: string
}

const config = {
  address: '',
  privateKey: '',
  providerUrl: '',
}

export const setConfig = (params: IConfig) => {
  return Object.assign(config, params)
}

export const getConfig = () => {
  return config
}