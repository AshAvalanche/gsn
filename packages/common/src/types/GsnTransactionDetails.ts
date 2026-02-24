import { type Address, type IntString, type PrefixedHexString } from './Aliases'

export interface GsnTransactionDetails {
  // Added by the Web3 call stack:
  readonly from: Address
  readonly data: PrefixedHexString
  readonly to: Address

  readonly value?: IntString
  gas?: PrefixedHexString
  maxFeePerGas: PrefixedHexString
  maxPriorityFeePerGas: PrefixedHexString
  readonly paymasterData?: PrefixedHexString
  readonly clientId?: IntString

  // Optional parameters for RelayProvider only:
  /**
   * Set to 'false' to create a direct transaction
   */
  readonly useGSN?: boolean
}
