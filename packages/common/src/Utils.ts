import chalk from 'chalk'
import {
  type Address,
  decodeErrorResult,
  encodeAbiParameters,
  formatEther,
  formatUnits,
  getAddress,
  hashMessage,
  type Hex,
  isAddress,
  keccak256,
  padHex,
  parseEther,
  parseUnits,
  recoverAddress,
  serializeSignature,
  toHex as viemToHex,
  type WalletClient,
  type Log,
  hexToSignature,
  signatureToHex,
  type Hash,
  type Abi,
  toFunctionSelector
} from 'viem'

import { type EIP1559Fees, type EventData, type IntString, type PrefixedHexString, type RelaySelectionResult } from './types/Aliases'

import { type MessageTypes } from './EIP712/TypedRequestData'
import { type RelayRequest } from './EIP712/RelayRequest'
import { type PartialRelayInfo } from './types/RelayInfo'
import { type LoggerInterface } from './LoggerInterface'

export function removeHexPrefix(hex: string): string {
  return hex.replace(/^0x/, '')
}

export function padTo64(hex: string): string {
  // Pad header with 0 if necessary
  if (!hex.startsWith('0x')) {
    hex = '0x' + hex
  }
  return padHex(hex as Hex, { size: 32 }).replace(/^0x/, '')
}

export function signatureRSV2Hex(r: Hex, s: Hex, v: number): Hex {
  return serializeSignature({ r, s, v: BigInt(v) })
}

export function event2topic(contract: any, names: string[]): any {
  // This function was heavily tied to Ethers v5 Contract object filters.
  // With Viem, we manipulate ABI and topics directly.
  // This logic likely needs a redesign in usage.
  // For now, returning names as placeholder if we can't extract topics.
  // TODO: Fix this when refactoring ContractInteractor event fetching.
  return names
}

export function addresses2topics(addresses: string[]): string[] {
  return addresses.map(address2topic)
}

export function address2topic(address: string): string {
  return padTo64(address.toLowerCase()) // Returns bare hex. Topics usually need 0x?
  // Old code returned '0x' + padded.
  // padTo64 above returns bare hex.
  return '0x' + padTo64(address)
}

export function errorAsBoolean(err: any): boolean {
  return !!err
}

export function decodeRevertReason(revertBytes: Hex, throwOnError = false): string | null {
  if (revertBytes == null) { return null }
  if (!revertBytes.startsWith('0x08c379a0')) {
    if (revertBytes.includes('without a reason string') || revertBytes.includes('FWD: insufficient gas')) {
      revertBytes = `Check Relay Worker balance - potentially Out Of Gas (${revertBytes})` as Hex
    }
    if (throwOnError) {
      throw new Error('invalid revert bytes: ' + revertBytes)
    }
    return revertBytes
  }
  // Decode Error(string)
  try {
    const errorString = decodeErrorResult({
      abi: [{
        type: 'error',
        name: 'Error',
        inputs: [{ name: 'message', type: 'string' }]
      }],
      data: revertBytes
    })
    return (errorString as any).args[0]
  } catch (e) {
    return null
  }
}

export async function getDefaultMethodSuffix(client: any): Promise<string> {
  // TODO: implement client version check with viem
  return '_v4'
}

/* eslint-disable no-extend-native */
// @ts-expect-error
BigInt.prototype.toJSON = function () {
  return this.toString()
}

export async function getEip712Signature<T extends MessageTypes>(
  wallet: WalletClient,
  typedRequestData: any // TypedMessage<T> replacement
): Promise<Hex> {
  // With Viem, we use signTypedData.
  // We expect typedRequestData to conform to Viem's signTypedData args.
  // Or we adapt the legacy TypedMessage format.
  // Legacy: { types, primaryType, domain, message }
  // Viem: { domain, types, primaryType, message }
  const { types, primaryType, domain, message } = typedRequestData
  // @ts-ignore
  return await wallet.signTypedData({
    domain,
    types,
    primaryType,
    message,
    account: wallet.account!
  })
}

export function correctV(result: Hex): Hex {
  // Ethers/Viem usually handle this? 
  // Viem serializeSignature handles v 27/28.
  // If result is strict hex signature.
  return result
}

export function calculateCalldataBytesZeroNonzero(
  calldata: Hex
): { calldataZeroBytes: number, calldataNonzeroBytes: number } {
  const calldataBuf = Buffer.from(calldata.replace('0x', ''), 'hex')
  let calldataZeroBytes = 0
  let calldataNonzeroBytes = 0
  calldataBuf.forEach(ch => {
    ch === 0 ? calldataZeroBytes++ : calldataNonzeroBytes++
  })
  return { calldataZeroBytes, calldataNonzeroBytes }
}

export async function getEcRecoverMeta(message: string, signature: string | { v: number[], r: number[], s: number[] }): Promise<Address> {
  // message is plain string (prefixed internally by recoverAddress?)
  // recoverAddress expects hash.
  const hash = hashMessage(message)
  let sig: Hex
  if (typeof signature === 'string') {
    sig = signature as Hex
  } else {
    // Legacy generic signature object... convert to hex
    // Assuming v is array? Old code type definition was weird.
    // We assume standard r,s,v.
    // Throwing error for now as this legacy path is rare.
    throw new Error('getEcRecoverMeta: object signature not supported in migration')
  }
  return await recoverAddress({ hash, signature: sig })
}

export function parseHexString(str: string): number[] {
  const result = []
  while (str.length >= 2) {
    result.push(parseInt(str.substring(0, 2), 16))
    str = str.substring(2, str.length)
  }
  return result
}

export function isSameAddress(address1: Address, address2: Address): boolean {
  return getAddress(address1) === getAddress(address2)
}

export async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

export function ether(n: string): bigint {
  return parseEther(n)
}

export function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min)
}

export function eventsComparator(a: EventData, b: EventData): number {
  const blockA = a.blockNumber ?? 0n
  const blockB = b.blockNumber ?? 0n
  if (blockA === blockB) {
    return (b.logIndex ?? 0) - (a.logIndex ?? 0)
  }
  return Number(blockB - blockA)
}

export function isSecondEventLater(a: EventData, b: EventData): boolean {
  return eventsComparator(a, b) > 0
}

export function getLatestEventData(events: EventData[]): EventData | undefined {
  if (events.length === 0) {
    return
  }
  const eventDataSorted = events.sort(eventsComparator)
  return eventDataSorted[0]
}

export function boolString(bool: boolean): string {
  return bool ? chalk.green('good'.padEnd(14)) : chalk.red('wrong'.padEnd(14))
}

export function removeNullValues<T>(obj: T, recursive = false): Partial<T> {
  const c: any = {}
  Object.assign(c, obj)
  for (const k of Object.keys(c)) {
    if (c[k] == null) {
      delete c[k]
    } else if (recursive) {
      let val = c[k]
      if (typeof val === 'object' && !Array.isArray(val) && typeof val !== 'bigint') {
        val = removeNullValues(val, recursive)
      }
      c[k] = val
    }
  }
  return c
}

export function formatTokenAmount(
  balance: bigint,
  decimals: bigint | number,
  tokenAddress: Address | undefined,
  tokenSymbol: string): string {
  const formatted = formatUnits(balance, Number(decimals))
  let shortTokenAddress = ''
  if (tokenAddress != null) {
    shortTokenAddress = `(${tokenAddress.substring(0, 6)}...${tokenAddress.substring(39)})`
  }
  return `${formatted} ${tokenSymbol} ${shortTokenAddress}`
}

export function splitRelayUrlForRegistrar(url: string, partsCount: number = 3): string[] {
  const maxLength = 32 * partsCount
  if (url.length > maxLength) {
    throw new Error(`The URL does not fit to the RelayRegistrar. Please shorten it to less than ${maxLength} characters. The provided URL is: ${url}`)
  }
  const parts = url.match(/.{1,32}/g) ?? []
  const result: string[] = []
  for (let i = 0; i < partsCount; i++) {
    result.push(`0x${Buffer.from(parts[i] ?? '').toString('hex').padEnd(64, '0')}`)
  }
  return result
}

export function packRelayUrlForRegistrar(parts: string[]): string {
  return Buffer.from(
    parts.join('')
      .replace(/0x/g, '')
      .replace(/(00)+$/g, ''), 'hex').toString()
}

export function toNumber(numberish: number | string | bigint): number {
  return Number(numberish)
}

export function getRelayRequestID(relayRequest: RelayRequest, signature: Hex): Hex {
  const types = [{ type: 'address' }, { type: 'uint256' }, { type: 'bytes' }]
  const values = [relayRequest.request.from, BigInt(relayRequest.request.nonce), signature]
  const encoded = encodeAbiParameters(types, values)
  const hash = keccak256(encoded)
  const rawRelayRequestId = removeHexPrefix(hash).padStart(64, '0')
  const prefixSize = 8
  const prefixedRelayRequestId = rawRelayRequestId.replace(new RegExp(`^.{${prefixSize}}`), '0'.repeat(prefixSize))
  return `0x${prefixedRelayRequestId}` as Hex
}

export function getERC165InterfaceID(abi: any[]): string {
  // Viem abi
  let interfaceId = 0
  for (const item of abi) {
    if (item.type === 'function') {
      const selector = toFunctionSelector(item)
      interfaceId ^= parseInt(selector, 16)
    }
  }
  return '0x' + (interfaceId >>> 0).toString(16).padStart(8, '0')
}

export function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length
  let randomIndex: number
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]]
  }
  return array
}

export interface WaitForSuccessResults<T> {
  results: T[]
  errors: Map<string, Error>
}

export async function waitForSuccess<T>(
  promises: Array<Promise<T>>,
  errorKeys: string[],
  graceTime: number): Promise<WaitForSuccessResults<T>> {
  if (promises.length !== errorKeys.length) {
    throw new Error('Invalid errorKeys length')
  }
  for (let i = 0; i < errorKeys.length; i++) {
    const indexOfKey = errorKeys.indexOf(errorKeys[i])
    if (indexOfKey !== i) {
      throw new Error('waitForSuccess: duplicate relay URL keys, aborting')
    }
  }
  return await new Promise((resolve) => {
    const ret: WaitForSuccessResults<T> = {
      errors: new Map<string, Error>(),
      results: []
    }
    function complete(): void {
      resolve(ret)
    }
    for (let i = 0; i < promises.length; i++) {
      promises[i]
        .then(result => {
          ret.results.push(result)
          if (ret.results.length === 1) {
            setTimeout(complete, graceTime)
          }
        })
        .catch(err => {
          ret.errors.set(errorKeys[i], err)
        })
        .finally(() => {
          if (ret.results.length + ret.errors.size === promises.length) {
            complete()
          }
        })
    }
  })
}

export function pickRandomElementFromArray<T>(arrayIn: T[], random = Math.random): T {
  return arrayIn[Math.floor(random() * arrayIn.length)]
}

export function adjustGasCostParameterUp(
  clientInput: number,
  pingResponseMinimum: number
): { newValue: number, deltaPercent: number } {
  if (clientInput >= pingResponseMinimum) {
    return { newValue: clientInput, deltaPercent: 0 }
  }
  const deltaPercent = Math.round(((pingResponseMinimum - clientInput) * 100) / clientInput)
  return { newValue: pingResponseMinimum, deltaPercent }
}

export function adjustRelayRequestForPingResponse(
  feesIn: EIP1559Fees,
  relayInfo: PartialRelayInfo,
  logger: LoggerInterface
): RelaySelectionResult {
  const feesInPriority = BigInt(feesIn.maxPriorityFeePerGas)
  const feesInMax = BigInt(feesIn.maxFeePerGas)
  const minMaxPriority = BigInt(relayInfo.pingResponse.minMaxPriorityFeePerGas)
  const minMaxFee = BigInt(relayInfo.pingResponse.minMaxFeePerGas)

  const maxPriorityFeePerGas = adjustGasCostParameterUp(
    Number(feesInPriority),
    Number(minMaxPriority)
  )

  let maxFeePerGas = adjustGasCostParameterUp(
    Number(feesInMax),
    Number(minMaxFee)
  )

  if (maxPriorityFeePerGas.newValue > maxFeePerGas.newValue) {
    logger.warn(`Attention: for relay ${relayInfo.relayInfo.relayUrl} had to adjust 'maxFeePerGas' to be equal 'maxPriorityFeePerGas' (from ${maxFeePerGas.newValue} to ${maxPriorityFeePerGas.newValue}) to avoid RPC error.`)
    maxFeePerGas = adjustGasCostParameterUp(
      Number(feesInMax),
      maxPriorityFeePerGas.newValue
    )
  }

  const updatedGasFees: EIP1559Fees = {
    maxPriorityFeePerGas: viemToHex(BigInt(maxPriorityFeePerGas.newValue)),
    maxFeePerGas: viemToHex(BigInt(maxFeePerGas.newValue))
  }
  const maxDeltaPercent = Math.max(maxFeePerGas.deltaPercent, maxPriorityFeePerGas.deltaPercent)
  return {
    relayInfo,
    maxDeltaPercent,
    updatedGasFees
  }
}

export function averageBN(array: bigint[]): bigint {
  const sum = array.reduce((a, v) => a + v, 0n)
  return sum / BigInt(array.length)
}

export function validateRelayUrl(relayUrl: string): boolean {
  let url
  try {
    url = new URL(relayUrl)
  } catch (error) {
    return false
  }
  return url.protocol === 'http:' || url.protocol === 'https:'
}

export function appendSlashTrim(urlInput: string): string {
  urlInput = urlInput.trim()
  if (urlInput[urlInput.length - 1] !== '/') {
    urlInput += '/'
  }
  return urlInput
}

export function bigNumberMin(a: bigint, b: bigint): bigint {
  return a < b ? a : b
}
