import contractStack from '../artifacts/contractStack'
import coder from './coder'

export const getAbiMethod = (contractName: string, method: string) => {
  const ct = contractStack[contractName]
  if (!ct) throw new Error('Not supported contract')
  const abiMethod = ct.abi.find(abi => abi.name === method)
  if (!abiMethod) throw new Error('InvalidContractMethod')
  return abiMethod
}

export const encodeData = (contractName: string, method: string, args: any[]): string => {
  const abiMethod = getAbiMethod(contractName, method)
  const data = coder.encodeFunctionCall(abiMethod, args)
  return data
}
