import { getTimestamp } from './utils'
import { TokenlonToken, TokenlonConfig } from '../global'
import { CACHE_DATA_SECONDS } from '../constants'
import { getTradeTokenList, getMobileAppConfig, getSdkJwtToken } from '../request/client'
import { getConfig } from '../config'

const isExpired = (timestamp) => {
  return timestamp < getTimestamp() - CACHE_DATA_SECONDS
}

let cachedTokenList = null as TokenlonToken[]
let cacheTokenListTimestamp = 0

export const getCachedTokenList = async () => {
  if (isExpired(cacheTokenListTimestamp) || !cachedTokenList) {
    cachedTokenList = await getTradeTokenList()
    cacheTokenListTimestamp = getTimestamp()
  }

  return cachedTokenList
}

let cachedAppConfig = null as TokenlonConfig
let cacheAppConfigTimestamp = 0

export const getCachedAppConfig = async () => {
  if (isExpired(cacheAppConfigTimestamp) || !cachedAppConfig) {
    cachedAppConfig = await getMobileAppConfig()
    cacheAppConfigTimestamp = getTimestamp()
  }

  return cachedAppConfig
}

let cachedSdkJwtToken = null as string
let cacheSdkJwtTokenTimestamp = 0

export const getCachedSdkJwtToken = async () => {
  if (isExpired(cacheSdkJwtTokenTimestamp) || !cachedSdkJwtToken) {
    cachedSdkJwtToken = await getSdkJwtToken(getConfig().privateKey)
    cacheSdkJwtTokenTimestamp = getTimestamp()
  }

  return cachedSdkJwtToken
}