import { getMarketPrice } from '../request/client'
import { SimpleOrder } from './trade'

// 未获取到数据 / 返回 worth 0
const getSimpleOrderUSDTWorth = async (simpleOrder: SimpleOrder) => {
  const { base, amount } = simpleOrder
  if (base === 'USDT') {
    return amount
  }
  try {
    const { price } = await getMarketPrice(base.toUpperCase())
    return price * amount
  } catch (e) {
    return 0
  }
}

export enum OrderWorthLevel {
  low = 'low',
  middle = 'middle',
  high = 'high',
}

// 根据 订单价值 返回三个等级
export const getSimpleOrderWorthLevel = async (simpleOrder: SimpleOrder) => {
  const worth = await getSimpleOrderUSDTWorth(simpleOrder)

  // 1000 美金以上 或者 价值为 0（说明获取过程中有点问题） 当作最高价值返回
  if (!worth || worth >= 1000) return OrderWorthLevel.high
  if (worth >= 500) return OrderWorthLevel.middle
  return OrderWorthLevel.low
}