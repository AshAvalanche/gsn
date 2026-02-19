
import { type Address, type Hex, type Log, type PublicClient } from 'viem'

import { type PingResponse } from '../PingResponse'
import { type RelayRequest } from '../EIP712/RelayRequest'
import { type GsnTransactionDetails } from './GsnTransactionDetails'
import { type RegistrarRelayInfo, type PartialRelayInfo } from './RelayInfo'
import { type Environment } from '../environments/Environments'

export type { Address, Hex, Log, PublicClient }
export type PrefixedHexString = Hex
export type EventName = string
export type IntString = string
export type SemVerString = string

/**
 * For legacy reasons, to filter out the relay this filter has to throw.
 * TODO: make ping filtering sane!
 */
export type PingFilter = (pingResponse: PingResponse, gsnTransactionDetails: GsnTransactionDetails) => void

/**
 * As the "PaymasterData" is included in the user-signed request, it cannot have access to the "relayRequestId" value.
 */
export type PaymasterDataCallback = (relayRequest: RelayRequest) => Promise<Hex>

export type ApprovalDataCallback = (relayRequest: RelayRequest, relayRequestId: Hex) => Promise<Hex>

export type SignTypedDataCallback = (domain: any, types: any, value: any, from: Address) => Promise<Hex>

/**
 * Different L2 rollups and side-chains have different behavior for the calldata gas cost.
 * This means the calldata estimation cannot be hard-coded and new implementations should be easy to add.
 * Note that both Relay Client and Relay Server must come to the same number.
 * Also, this value does include the base transaction cost (2100 on mainnet).
 */
export type CalldataGasEstimation = (calldata: Hex, environment: Environment, calldataEstimationSlackFactor: number, client: PublicClient) => Promise<bigint>

export type RelayFilter = (registrarRelayInfo: RegistrarRelayInfo) => boolean

export type EventData = Log & {
  args?: any
  eventName?: string
}

export function notNull<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined
}

/**
 * This is an intersection of NPM log levels and 'loglevel' library methods.
 */
export type NpmLogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug'

export interface RelaySelectionResult {
  relayInfo: PartialRelayInfo
  maxDeltaPercent: number
  updatedGasFees: EIP1559Fees
}

export interface EIP1559Fees {
  maxFeePerGas: Hex
  maxPriorityFeePerGas: Hex
}

export type ObjectMap<T> = Record<string, T>
