import { type Address, type IntString, type PrefixedHexString } from '../types/Aliases'

export interface RelayData {
  maxFeePerGas: IntString
  maxPriorityFeePerGas: IntString
  transactionCalldataGasUsed: IntString
  relayWorker: Address
  paymaster: Address
  paymasterData: PrefixedHexString
  clientId: IntString
  forwarder: Address
}
