import * as _ from 'lodash'
import { getConfig } from '../config'
import { getNonce, getTimestamp } from './utils'
import { JSSDK_ERRORS } from './errors'

let preNonceUsed = null
let preNonceUsedTimestamp = 0

export const getNonceWrap = async (): Promise<number> => {
  const address = getConfig().address
  const nonce = await getNonce(address)

  if (_.isNumber(preNonceUsed)) {
    // 超过 20 分钟，过往用的 nonce 还在 pending 的先忽略
    if (nonce > preNonceUsed || getTimestamp() - preNonceUsedTimestamp > 20 * 60) {
      preNonceUsed = null
      return nonce
    } else {
      throw JSSDK_ERRORS.NONCE_CONFLICT
    }
  } else {
    return nonce
  }
}

export const cacheUsedNonce = (nonce) => {
  preNonceUsed = nonce
  preNonceUsedTimestamp = getTimestamp()
}