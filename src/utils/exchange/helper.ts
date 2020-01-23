import * as _ from 'lodash'
import { isBigNumber, toBN } from '../utils'

const translateValueHelper = (obj: object, check: (v) => boolean, operate: (v) => any): any => {
  let result = {}
  _.keys(obj).forEach((key) => {
    const v = obj[key]
    result[key] = check(v) ? operate(v) : v
  })
  return result
}

// translate a dex order with bigNumber to string
export const orderBNToString = (order: any): any => {
  let result = {}
  result = translateValueHelper(order, isBigNumber, (v) => v.toString())
  return result
}

export const orderStringToBN = (order: any): any => {
  let result = {}
  const check = (v) => _.isString(v) && !v.startsWith('0x')
  result = translateValueHelper(order, check, toBN)
  return result
}