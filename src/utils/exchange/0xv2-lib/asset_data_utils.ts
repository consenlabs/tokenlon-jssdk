import { AssetProxyId, ERC20AssetData } from '@0x/types'
import * as ethAbi from 'ethereumjs-abi'
import * as ethUtil from 'ethereumjs-util'

const ERC20_ASSET_DATA_BYTE_LENGTH = 36
const SELECTOR_LENGTH = 4

export const assetDataUtils = {
  /**
   * Encodes an ERC20 token address into a hex encoded assetData string, usable in the makerAssetData or
   * takerAssetData fields in a 0x order.
   * @param tokenAddress  The ERC20 token address to encode
   * @return The hex encoded assetData string
   */
  encodeERC20AssetData(tokenAddress: string): string {
    return ethUtil.bufferToHex(ethAbi.simpleEncode('ERC20Token(address)', tokenAddress))
  },
  /**
   * Decodes an ERC20 assetData hex string into it's corresponding ERC20 tokenAddress & assetProxyId
   * @param assetData Hex encoded assetData string to decode
   * @return An object containing the decoded tokenAddress & assetProxyId
   */
  decodeERC20AssetData(assetData: string): ERC20AssetData {
    const data = ethUtil.toBuffer(assetData)
    if (data.byteLength < ERC20_ASSET_DATA_BYTE_LENGTH) {
      throw new Error(
        `Could not decode ERC20 Proxy Data. Expected length of encoded data to be at least ${
        ERC20_ASSET_DATA_BYTE_LENGTH
        }. Got ${data.byteLength}`,
      )
    }
    const assetProxyId = ethUtil.bufferToHex(data.slice(0, SELECTOR_LENGTH))
    if (assetProxyId !== AssetProxyId.ERC20) {
      throw new Error(
        `Could not decode ERC20 Proxy Data. Expected Asset Proxy Id to be ERC20 (${
        AssetProxyId.ERC20
        }), but got ${assetProxyId}`,
      )
    }
    const [tokenAddress] = ethAbi.rawDecode(['address'], data.slice(SELECTOR_LENGTH))
    return {
      assetProxyId,
      tokenAddress: ethUtil.addHexPrefix(tokenAddress),
    }
  },
}
