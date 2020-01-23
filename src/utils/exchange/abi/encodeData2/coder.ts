/*
 This file is part of web3.js.

 web3.js is free software: you can redistribute it and/or modify
 it under the terms of the GNU Lesser General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 web3.js is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Lesser General Public License for more details.

 You should have received a copy of the GNU Lesser General Public License
 along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * @file index.js
 * @author Marek Kotewicz <marek@parity.io>
 * @author Fabian Vogelsteller <fabian@frozeman.de>
 * @date 2018
 */

import * as _ from 'lodash'
import * as EthersAbiWrapper from 'ethers/utils/abi-coder'
import * as utils from 'web3-utils'

const EthersAbi = EthersAbiWrapper.AbiCoder

const ethersAbiCoder = new EthersAbi(function (type, value) {
  if (type.match(/^u?int/) && !_.isArray(value) && (!_.isObject(value) || value.constructor.name !== 'BN')) {
    return value.toString()
  }
  return value
})

/**
 * ABICoder prototype should be used to encode/decode solidity params of any type
 */
const ABICoder = function () {
}

/**
 * Encodes the function name to its ABI representation, which are the first 4 bytes of the sha3 of the function name including  types.
 *
 * @method encodeFunctionSignature
 * @param {String|Object} functionName
 * @return {String} encoded function name
 */
ABICoder.prototype.encodeFunctionSignature = function (functionName) {
  if (_.isObject(functionName)) {
    functionName = utils._jsonInterfaceMethodToString(functionName)
  }

  return utils.sha3(functionName).slice(0, 10)
}

/**
 * Encodes the function name to its ABI representation, which are the first 4 bytes of the sha3 of the function name including  types.
 *
 * @method encodeEventSignature
 * @param {String|Object} functionName
 * @return {String} encoded function name
 */
ABICoder.prototype.encodeEventSignature = function (functionName) {
  if (_.isObject(functionName)) {
    functionName = utils._jsonInterfaceMethodToString(functionName)
  }

  return utils.sha3(functionName)
}

/**
 * Should be used to encode plain param
 *
 * @method encodeParameter
 * @param {String} type
 * @param {Object} param
 * @return {String} encoded plain param
 */
ABICoder.prototype.encodeParameter = function (type, param) {
  return this.encodeParameters([type], [param])
}

/**
 * Should be used to encode list of params
 *
 * @method encodeParameters
 * @param {Array} types
 * @param {Array} params
 * @return {String} encoded list of params
 */
ABICoder.prototype.encodeParameters = function (types, params) {
  return ethersAbiCoder.encode(this.mapTypes(types), params)
}

/**
 * Map types if simplified format is used
 *
 * @method mapTypes
 * @param {Array} types
 * @return {Array}
 */
ABICoder.prototype.mapTypes = function (types) {
  const self = this
  const mappedTypes = [] as any[]
  types.forEach(function (type) {
    if (self.isSimplifiedStructFormat(type)) {
      const structName = Object.keys(type)[0]
      mappedTypes.push(
        Object.assign(
          self.mapStructNameAndType(structName),
          {
            components: self.mapStructToCoderFormat(type[structName]),
          },
        ),
      )

      return
    }

    mappedTypes.push(type)
  })

  return mappedTypes
}

/**
 * Check if type is simplified struct format
 *
 * @method isSimplifiedStructFormat
 * @param {string | Object} type
 * @returns {boolean}
 */
ABICoder.prototype.isSimplifiedStructFormat = function (type) {
  return typeof type === 'object' && typeof type.components === 'undefined' && typeof type.name === 'undefined'
}

/**
 * Maps the correct tuple type and name when the simplified format in encode/decodeParameter is used
 *
 * @method mapStructNameAndType
 * @param {string} structName
 * @return {{type: string, name: *}}
 */
ABICoder.prototype.mapStructNameAndType = function (structName) {
  let type = 'tuple'

  if (structName.indexOf('[]') > -1) {
    type = 'tuple[]'
    structName = structName.slice(0, -2)
  }

  return { type: type, name: structName }
}

/**
 * Maps the simplified format in to the expected format of the ABICoder
 *
 * @method mapStructToCoderFormat
 * @param {Object} struct
 * @return {Array}
 */
ABICoder.prototype.mapStructToCoderFormat = function (struct) {
  const self = this
  const components = [] as any[]
  Object.keys(struct).forEach(function (key) {
    if (typeof struct[key] === 'object') {
      components.push(
        Object.assign(
          self.mapStructNameAndType(key),
          {
            components: self.mapStructToCoderFormat(struct[key]),
          },
        ),
      )

      return
    }

    components.push({
      name: key,
      type: struct[key],
    })
  })

  return components
}

/**
 * Encodes a function call from its json interface and parameters.
 *
 * @method encodeFunctionCall
 * @param {Array} jsonInterface
 * @param {Array} params
 * @return {String} The encoded ABI for this function call
 */
ABICoder.prototype.encodeFunctionCall = function (jsonInterface, params) {
  return this.encodeFunctionSignature(jsonInterface) + this.encodeParameters(jsonInterface.inputs, params).replace('0x', '')
}

const coder = new ABICoder()

export default coder
