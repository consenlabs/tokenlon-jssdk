import * as _ from 'lodash'
import { getConfig } from '../config'
import { getNonce } from './utils'
import { JSSDK_ERRORS } from './errors'

let preNonceUsed = null

export const getNonceWrap = async (): Promise<number> => {
  const address = getConfig().address
  const nonce = await getNonce(address)

  if (_.isNumber(preNonceUsed)) {
    if (nonce > preNonceUsed) {
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
}