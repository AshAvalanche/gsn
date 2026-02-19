import { type Address, type EventName, type IntString } from './Aliases'
import { type Hex } from 'viem'

// Empty interface used on purpose to mark various Event Infos in collections, used in StatisticsManager.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GNSContractsEvent { }

/** IPenalizer.sol */
export const CommitAdded: EventName = 'CommitAdded'

/** IRelayHub.sol */

export const RelayServerRegistered: EventName = 'RelayServerRegistered'
export const RelayWorkersAdded: EventName = 'RelayWorkersAdded'
export const TransactionRejectedByPaymaster: EventName = 'TransactionRejectedByPaymaster'
export const TransactionRelayed: EventName = 'TransactionRelayed'
export const Deposited: EventName = 'Deposited'

/**
 * Emitting any of these events is handled by GSN clients as a sign of activity by a RelayServer.
 */
export const ActiveManagerEvents = [RelayWorkersAdded, TransactionRelayed, TransactionRejectedByPaymaster]

export interface RelayInfoUrl {
  relayUrl: string
}

export interface RelayRegisteredEventInfo extends RelayInfoUrl, GNSContractsEvent {
  relayHub: Address
  relayManager: Address
}

export interface TransactionRelayedEventInfo extends GNSContractsEvent {
  relayManager: Address
  relayWorker: Address
  from: Address
  to: Address
  paymaster: Address
  selector: Hex
  status: bigint // RelayCallStatus
  charge: bigint
}

export interface TransactionRejectedByPaymasterEventInfo extends GNSContractsEvent {
  relayManager: Address
  paymaster: Address
  from: Address
  to: Address
  relayWorker: Address
  selector: Hex
  innerGasUsed: bigint
  reason: Hex // decoded in other places if needed
}

export interface DepositedEventInfo extends GNSContractsEvent {
  paymaster: Address
  from: Address
  amount: bigint
}

export function isInfoFromEvent(info: RelayInfoUrl): boolean {
  return 'relayManager' in info
}

/** IStakeManager.sol */

export const HubAuthorized: EventName = 'HubAuthorized'
export const HubUnauthorized: EventName = 'HubUnauthorized'
export const StakeAdded: EventName = 'StakeAdded'
export const StakePenalized: EventName = 'StakePenalized'
export const StakeUnlocked: EventName = 'StakeUnlocked'
export const StakeWithdrawn: EventName = 'StakeWithdrawn'
export const OwnerSet: EventName = 'OwnerSet'

export const allStakeManagerEvents = [StakeAdded, HubAuthorized, HubUnauthorized, StakeUnlocked, StakeWithdrawn, StakePenalized]

export interface StakeAddedEventInfo extends GNSContractsEvent {
  relayManager: Address
  owner: Address
  stake: bigint
  unstakeDelay: bigint
}

export interface StakeUnlockedEventInfo extends GNSContractsEvent {
  relayManager: Address
  owner: Address
  withdrawBlock: bigint
}

export interface StakeWithdrawnEventInfo extends GNSContractsEvent {
  relayManager: Address
  owner: Address
  amount: bigint
}

export interface StakePenalizedEventInfo extends GNSContractsEvent {
  relayManager: Address
  beneficiary: Address
  reward: bigint
}

export interface HubAuthorizedEventInfo extends GNSContractsEvent {
  relayManager: Address
  relayHub: Address
}

export interface HubUnauthorizedEventInfo extends GNSContractsEvent {
  relayManager: Address
  relayHub: Address
  removalTime: bigint
}

export interface StakeInfo {
  stake: bigint
  unstakeDelay: bigint
  withdrawTime: bigint
  owner: Address
  token: Address
}
