import * as Web3Export from 'web3'
import * as _ from 'lodash'
import { getConfig } from '../config'

const Web3 = Web3Export.default ? Web3Export.default : Web3Export as any

let web3 = null

type Handler = (web3: any) => Promise<any>

export const web3RequestWrap = async (handler: Handler) => {
  const config = getConfig()
  const urls = _.isArray() ? config.providerUrl : [config.providerUrl]
  let error = null

  for (let url of urls) {
    try {
      if (!web3 || error) {
        web3 = new Web3(new Web3.providers.HttpProvider(url))
      }
      return await handler(web3) as any
    } catch (e) {
      error = e
    }
  }

  throw error ? error : new Error('unknown web3 error')
}