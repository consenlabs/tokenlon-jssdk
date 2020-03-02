import { getConfig } from './index'

export const getExchangeUrl = () => {
  return getConfig().debug === true ? 'https://exchange.dev.tokenlon.im/rpc' : 'https://exchange.tokenlon.im/rpc'
}

export const getWebsocketUrl = () => {
  return getConfig().debug === true ? 'https://publisher.dev.tokenlon.im/rpc' : 'https://publisher.tokenlon.im/rpc'
}

export const getTokenlonMarketUrl = () => {
  return getConfig().debug === true ? 'https://tokenlon-market.dev.tokenlon.im/rpc' : 'https://tokenlon-market.tokenlon.im/rpc'
}

export const getTokenlonCoreMarketUrl = () => {
  return getConfig().debug === true ? 'https://tokenlon-core-market.dev.tokenlon.im/rpc' : 'https://tokenlon-core-market.tokenlon.im/rpc'
}