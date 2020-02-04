import axios from 'axios'
import { ETH_GAS_STATION_URL } from '../constants'
import { getSimpleOrderWorthLevel, OrderWorthLevel } from './worth'
import { getGasPrice, toBN } from './utils'

export type GasPriceAdaptor = 'safeLow' | 'average' | 'fast'

export const getGasPriceByAdaptor = async (adaptor: GasPriceAdaptor): Promise<string> => {
  return axios(ETH_GAS_STATION_URL).then(res => {
    return toBN(Math.round(res.data[adaptor] * 0.1 * Math.pow(10, 9))).toString()
  }).catch(e => {
    throw `${ETH_GAS_STATION_URL} server error ${e && e.message}`
  })
}

export const getGasPriceAsync = async (simpleOrder) => {
  // must be undefined
  let gasPrice = undefined

  // orderWorthLevel: low —— gasstation [updated: use fast]
  // orderWorthLevel: middle —— gasstation fast
  // orderWorthLevel: high —— gasstation fast * 1.2
  const orderWorthLevel = await getSimpleOrderWorthLevel(simpleOrder)

  try {
    // use fast
    const gasPriceAdaptorType = 'fast'
    gasPrice = await getGasPriceByAdaptor(gasPriceAdaptorType)
  } catch (e) {}

  if (!gasPrice) {
    try {
      gasPrice = await getGasPrice()
    } catch (e) {}
  }

  if (gasPrice && orderWorthLevel === OrderWorthLevel.high) {
    gasPrice = toBN(Math.round(+gasPrice * 1.2)).toString()
  }

  return gasPrice
}