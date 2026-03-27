import { type Address, type PrefixedHexString } from '../types/Aliases'
import { type RelayRequest } from './RelayRequest'

import { encodeAbiParameters, keccak256, toHex, type Hex } from 'viem'

export interface MessageTypeProperty {
  name: string
  type: string
}

export interface MessageTypes {
  EIP712Domain: MessageTypeProperty[]

  [additionalProperties: string]: MessageTypeProperty[]
}

export interface EIP712Domain {
  name?: string
  version?: string
  chainId?: number
  verifyingContract?: string
}

export const EIP712DomainType: MessageTypeProperty[] = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' }
]

export const EIP712DomainTypeWithoutVersion: MessageTypeProperty[] = [
  { name: 'name', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' }
]

const RelayDataType = [
  { name: 'maxFeePerGas', type: 'uint256' },
  { name: 'maxPriorityFeePerGas', type: 'uint256' },
  { name: 'transactionCalldataGasUsed', type: 'uint256' },
  { name: 'relayWorker', type: 'address' },
  { name: 'paymaster', type: 'address' },
  { name: 'forwarder', type: 'address' },
  { name: 'paymasterData', type: 'bytes' },
  { name: 'clientId', type: 'uint256' }
]

const ForwardRequestType = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'gas', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'data', type: 'bytes' },
  { name: 'validUntilTime', type: 'uint256' }
]

const RelayRequestType = [
  ...ForwardRequestType,
  { name: 'relayData', type: 'RelayData' }
]

interface Types extends MessageTypes {
  EIP712Domain: MessageTypeProperty[]
  RelayRequest: MessageTypeProperty[]
  RelayData: MessageTypeProperty[]
}

// use these values in registerDomainSeparator
export const GsnDomainSeparatorType = {
  prefix: 'string name,string version',
  version: '3'
}

export function getDomainSeparator(name: string, verifier: Address, chainId: number): EIP712Domain {
  return {
    name,
    version: GsnDomainSeparatorType.version,
    chainId,
    verifyingContract: verifier
  }
}

const EIP712_DOMAIN_TYPE_HASH = keccak256(
  toHex('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
)

export function getDomainSeparatorHash(name: string, verifier: Address, chainId: number): PrefixedHexString {
  const encodedName = keccak256(toHex(name))
  const domain = getDomainSeparator(name, verifier, chainId)
  const encodedVersion = keccak256(toHex(domain.version!))
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'uint256' },
        { type: 'address' }
      ],
      [
        EIP712_DOMAIN_TYPE_HASH as Hex,
        encodedName as Hex,
        encodedVersion as Hex,
        BigInt(chainId),
        verifier as Hex
      ]
    )
  )
}

export class TypedRequestData {
  readonly types: Types
  readonly domain: EIP712Domain
  readonly primaryType: string
  readonly message: Record<string, unknown>

  constructor(
    name: string,
    chainId: number,
    verifier: Address,
    relayRequest: RelayRequest) {
    this.types = {
      EIP712Domain: EIP712DomainType,
      RelayRequest: RelayRequestType,
      RelayData: RelayDataType
    }
    this.domain = getDomainSeparator(name, verifier, chainId)
    this.primaryType = 'RelayRequest'
    // in the signature, all "request" fields are flattened out at the top structure.
    // other params are inside "relayData" sub-type
    // viem signTypedData requires BigInt for uint256 fields, not strings
    this.message = {
      from: relayRequest.request.from,
      to: relayRequest.request.to,
      value: BigInt(relayRequest.request.value),
      gas: BigInt(relayRequest.request.gas),
      nonce: BigInt(relayRequest.request.nonce),
      data: relayRequest.request.data,
      validUntilTime: BigInt(relayRequest.request.validUntilTime),
      relayData: {
        maxFeePerGas: BigInt(relayRequest.relayData.maxFeePerGas),
        maxPriorityFeePerGas: BigInt(relayRequest.relayData.maxPriorityFeePerGas),
        transactionCalldataGasUsed: BigInt(relayRequest.relayData.transactionCalldataGasUsed),
        relayWorker: relayRequest.relayData.relayWorker,
        paymaster: relayRequest.relayData.paymaster,
        forwarder: relayRequest.relayData.forwarder,
        paymasterData: relayRequest.relayData.paymasterData,
        clientId: BigInt(relayRequest.relayData.clientId)
      }
    }
  }
}

export const GsnRequestType = {
  typeName: 'RelayRequest',
  typeSuffix: 'RelayData relayData)RelayData(uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,uint256 transactionCalldataGasUsed,address relayWorker,address paymaster,address forwarder,bytes paymasterData,uint256 clientId)'
}
