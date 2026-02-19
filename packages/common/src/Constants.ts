import { parseEther, type Address } from 'viem'
import {
  iForwarderAbi,
  iPaymasterAbi,
  iPenalizerAbi,
  iRelayHubAbi,
  iRelayRegistrarAbi,
  iStakeManagerAbi
} from '@opengsn/contracts'

import { getERC165InterfaceID } from './Utils'

const dayInSec = 24 * 60 * 60
const weekInSec = dayInSec * 7
const yearInSec = dayInSec * 365
const oneEther = parseEther('1')

export const constants = {
  dayInSec,
  weekInSec,
  yearInSec,
  oneEther,
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000' as Address,
  // OpenZeppelin's ERC-20 implementation bans transfer to zero address
  BURN_ADDRESS: '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF' as Address,
  // in order to avoid error on insufficient balance for gas, send dry-run call from zero address
  DRY_RUN_ADDRESS: '0x0000000000000000000000000000000000000000' as Address,
  DRY_RUN_KEY: 'DRY-RUN',
  ZERO_BYTES32: '0x0000000000000000000000000000000000000000000000000000000000000000',
  MAX_UINT256: 2n ** 256n - 1n,
  MAX_UINT96: 2n ** 96n - 1n,
  MAX_INT256: 2n ** 255n - 1n,
  MIN_INT256: (2n ** 255n) * -1n,

  ARBITRUM_ARBSYS: '0x0000000000000000000000000000000000000064' as Address
}

export const erc165Interfaces = {
  forwarder: getERC165InterfaceID(iForwarderAbi as any),
  paymaster: getERC165InterfaceID(iPaymasterAbi as any),
  penalizer: getERC165InterfaceID(iPenalizerAbi as any),
  relayRegistrar: getERC165InterfaceID(iRelayRegistrarAbi as any),
  relayHub: getERC165InterfaceID(iRelayHubAbi as any),
  stakeManager: getERC165InterfaceID(iStakeManagerAbi as any)
}

export const RelayCallStatusCodes = {
  OK: 0n,
  RelayedCallFailed: 1n,
  RejectedByPreRelayed: 2n,
  RejectedByForwarder: 3n,
  RejectedByRecipientRevert: 4n,
  PostRelayedFailed: 5n,
  PaymasterBalanceChanged: 6n
}
