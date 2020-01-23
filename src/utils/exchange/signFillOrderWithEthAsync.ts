import * as _ from 'lodash'
import { toBN } from '../utils'
import { encodeData } from './abi/encodeData2'

export const getFillOrderWithETHData = (arg) => {
  return encodeData(
    'tokenlonExchange',
    'fillOrderWithETH',
    arg.map(a => {
      // Warning: 部分非常大的树值经过 bignumber 会被处理成 0
      if (_.isString(a) && a.startsWith('0x')) {
        return a
      }
      return '0x' + toBN(a).toString(16)
    }),
  )
}