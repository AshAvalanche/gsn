/* eslint-disable no-void */
// @ts-ignore

import { type Abi, decodeEventLog, type Log } from 'viem'

import {
  type Address,
  type Hex,
  type EventData,
  type GSNConfig,
  gsnRuntimeVersion,
  type GsnTransactionDetails, isSameAddress, type PrefixedHexString,
  type JsonRpcPayload,
  type JsonRpcResponse,
  type LoggerInterface,
  type SignTypedDataCallback,
  TransactionRejectedByPaymaster,
  TransactionRelayed
} from '@opengsn/common'

import relayHubAbi from '@opengsn/common/dist/interfaces/IRelayHub.json'

import { type AccountKeypair } from './AccountManager'
import { type GsnEvent } from './GsnEvents'
import { _dumpRelayingResult, type GSNUnresolvedConstructorInput, RelayClient, type RelayingResult } from './RelayClient'
import { type WrappedProvider, type WrappedSigner } from './WrappedProviderTypes'

export type JsonRpcCallback = (error: Error | null, result?: JsonRpcResponse) => void

export interface GsnReceiptLog {
  address: string
  topics: string[]
  data: string
  blockNumber: number
  transactionHash: string
  transactionIndex: number
  blockHash: string
  logIndex?: number
  removed?: boolean
}

export interface GsnTransactionReceipt {
  type?: number
  to: string
  from: string
  contractAddress: string
  logsBloom: string
  blockHash: string
  transactionHash: string
  transactionIndex: number
  gasUsed: bigint | number
  logs: GsnReceiptLog[]
  blockNumber: number
  cumulativeGasUsed: bigint | number
  effectiveGasPrice: bigint | number
  status: string | number
  // GSN-specific extra fields
  actualTransactionHash?: string
  hash?: string
}

export interface GsnTransactionConfig {
  from?: string
  to?: string
  data?: string
  value?: string
  gas?: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  nonce?: number
  chainId?: number
  type?: number
  gasLimit?: bigint | number
}

/**
 * This data can later be used to optimize creation of Transaction Receipts
 */
interface SubmittedRelayRequestInfo {
  possibleTransactionHash?: string
  submissionBlock: number
  validUntilTime: string
}

const TX_FUTURE = 'tx-future'
const TX_NOTFOUND = 'tx-notfound'

const BLOCKS_FOR_LOOKUP = 5000

export class RelayProvider {
  protected origProvider!: WrappedProvider
  protected origSigner!: WrappedSigner
  private _origProviderSend!: (method: string, params: unknown[]) => Promise<unknown>
  private asyncSignTypedData?: SignTypedDataCallback
  protected readonly submittedRelayRequests = new Map<string, SubmittedRelayRequestInfo>()
  protected config!: GSNConfig

  readonly relayClient: RelayClient
  logger!: LoggerInterface

  host!: string
  connected!: boolean

  /**
   * Create a GSN RelayProvider
   */
  static async newWeb3Provider(input: GSNUnresolvedConstructorInput): Promise<RelayProvider> {
    return await new RelayProvider(new RelayClient(input)).init()
  }

  constructor(
    relayClient: RelayClient
  ) {
    if ((relayClient as unknown as Record<string, unknown>).send != null) {
      throw new Error('Using new RelayProvider() constructor directly is deprecated.\nPlease create provider using RelayProvider.newWeb3Provider({})')
    }
    this.relayClient = relayClient
    this.logger = this.relayClient.logger
  }

  origProviderSend(payload: JsonRpcPayload, callback: JsonRpcCallback): void {
    this._origProviderSend(payload.method, payload.params ?? []).then((it: any) => {
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: payload.id ?? 0,
        result: it
      }
      callback(null, response)
    }).catch((err: any) => {
      callback(err)
    })
  }

  protected async init(): Promise<this> {
    await this.relayClient.init()
    this.origProvider = this.relayClient.wrappedUnderlyingProvider
    this.origSigner = this.relayClient.wrappedUnderlyingSigner
    this._origProviderSend = this.origProvider.send.bind(this.origProvider)
    this.config = this.relayClient.config
    this.asyncSignTypedData = this.relayClient.dependencies.asyncSignTypedData
    this._delegateEventsApi()
    this.logger.info(`Created new RelayProvider ver.${gsnRuntimeVersion}`)
    return this
  }

  registerEventListener(handler: (event: GsnEvent) => void): void {
    this.relayClient.registerEventListener(handler)
  }

  unregisterEventListener(handler: (event: GsnEvent) => void): void {
    this.relayClient.unregisterEventListener(handler)
  }

  _delegateEventsApi(): void {
    // If the subprovider is a ws or ipc provider, then register all its methods on this provider
    // and delegate calls to the subprovider. This allows subscriptions to work.
    ['on', 'removeListener', 'removeAllListeners', 'reset', 'disconnect', 'addDefaultEvents', 'once', 'reconnect'].forEach(func => {
      // @ts-ignore
      if (this.origProvider[func] !== undefined) {
        // @ts-ignore
        this[func] = this.origProvider[func].bind(this.origProvider)
      }
    })
  }

  /**
   * Wrapping legacy 'send()' function with EIP-1193 'request()' function
   * @param method
   * @param params
   */
  async request({ method, params }: { method: string, params?: any[] }): Promise<any> {
    const paramBlock = {
      method,
      params,
      jsonrpc: '2.0',
      id: Date.now()
    }
    return await new Promise<any>((resolve, reject) => {
      this.send(paramBlock, (error?: Error | null, result?: JsonRpcResponse): void => {
        if (error != null) {
          reject(error)
        } else {
          resolve(result?.result)
        }
      })
    })
  }

  send(payload: JsonRpcPayload | any, callback: JsonRpcCallback): void {
    if (this._useGSN(payload)) {
      if (payload.method === 'eth_sendTransaction') {
        // @ts-ignore
        if (payload.params[0].to === undefined) {
          callback(new Error('GSN cannot relay contract deployment transactions. Add {from: accountWithEther, useGSN: false}.'))
          return
        }
        void this._ethSendTransaction(payload, callback)
        return
      }
      if (payload.method === 'eth_getTransactionReceipt') {
        void this._ethGetTransactionReceipt(payload, callback)
        return
      }
      if (payload.method === 'eth_getTransactionByHash') {
        void this._ethGetTransactionByHash(payload, callback)
        return
      }
      if (payload.method === 'eth_accounts') {
        this._getAccounts(payload, callback)
        return
      }
      if (payload.method === 'eth_sign') {
        this._sign(payload, callback)
        return
      }
      if (payload.method === 'eth_signTransaction') {
        void this._signTransaction(payload, callback)
        return
      }
      if (payload.method.includes('eth_signTypedData') === true) {
        this._signTypedData(payload, callback)
        return
      }
    }

    this.origProviderSend(payload, callback)
  }

  _ethGetTransactionReceiptWithTransactionHash(payload: JsonRpcPayload, callback: JsonRpcCallback): void {
    this.logger.info('calling sendAsync' + JSON.stringify(payload))
    this.origProviderSend(payload, (error: Error | null, rpcResponse?: JsonRpcResponse): void => {
      // Sometimes, ganache seems to return 'false' for 'no error' (breaking TypeScript declarations)
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (error) {
        callback(error, rpcResponse)
        return
      }
      if (rpcResponse?.result == null) {
        callback(error, rpcResponse)
        return
      }
      rpcResponse.result = this._getTranslatedGsnResponseResult(rpcResponse.result)
      callback(error, rpcResponse)
    })
  }

  /**
   * pack promise call as a jsonrpc callback
   * @param promise the promise request. return value is "result" for the callback
   * @param payload original payload. used to copy rpc param (jsonrpc, id)
   * @param callback callback to call result or error (for exception)
   */
  asCallback(promise: Promise<any>, payload: JsonRpcPayload, callback: JsonRpcCallback): void {
    promise
      .then(result => {
        callback(null, {
          result,
          // @ts-ignore
          id: payload.id,
          jsonrpc: payload.jsonrpc
        })
      })
      .catch(error => {
        const err: any = {
          error,
          // @ts-ignore
          id: payload.id,
          jsonrpc: payload.jsonrpc
        }
        callback(err)
      })
  }

  async _getSubmissionDetailsForRelayRequestId(relayRequestID: PrefixedHexString): Promise<SubmittedRelayRequestInfo> {
    const submissionDetails = this.submittedRelayRequests.get(relayRequestID)
    if (submissionDetails != null) {
      return submissionDetails
    }
    const blockNumber = await this.origProvider.getBlockNumber()
    const manyBlocksAgo = Math.max(1, blockNumber - BLOCKS_FOR_LOOKUP)
    this.logger.warn(`Looking up relayed transaction by its RelayRequestID(${relayRequestID}) from block ${manyBlocksAgo}`)
    return {
      submissionBlock: manyBlocksAgo,
      validUntilTime: Number.MAX_SAFE_INTEGER.toString()
    }
  }

  async _ethGetTransactionByHash(payload: JsonRpcPayload, callback: JsonRpcCallback): Promise<void> {
    // @ts-ignore
    const relayRequestID = payload.params[0]
    let txHash = await this.getTransactionHashFromRequestId(relayRequestID)
    if (!txHash.startsWith('0x')) {
      txHash = relayRequestID
    }
    const tx = await this._origProviderSend('eth_getTransactionByHash', [txHash]) as Record<string, unknown> | null
    if (tx != null) {
      // must return exactly what was requested...
      tx.hash = relayRequestID
      tx.actualTransactionHash = txHash
    }
    this.asCallback(Promise.resolve(tx), payload, callback)
  }

  /**
   * The ID can be either a RelayRequestID which requires event-based lookup or Transaction Hash that goes through
   * @param payload
   * @param callback
   */
  async _ethGetTransactionReceipt(payload: JsonRpcPayload, callback: JsonRpcCallback): Promise<void> {
    const id = (typeof payload.id === 'string' ? parseInt(payload.id) : payload.id) ?? -1
    const relayRequestID = payload.params?.[0] as string
    const hasPrefix = relayRequestID.includes('0x00000000')
    if (!hasPrefix) {
      this._ethGetTransactionReceiptWithTransactionHash(payload, callback)
      return
    }
    try {
      const result = await this._createTransactionReceiptForRelayRequestID(relayRequestID)
      const rpcResponse = {
        id,
        result,
        jsonrpc: '2.0'
      }
      callback(null, rpcResponse)
    } catch (error: any) {
      callback(error, undefined)
    }
  }

  async _ethSendTransaction(payload: JsonRpcPayload, callback: JsonRpcCallback): Promise<void> {
    this.logger.info('calling sendAsync' + JSON.stringify(payload))
    let gsnTransactionDetails: GsnTransactionDetails
    try {
      gsnTransactionDetails = await this._fixGasFees(payload.params?.[0])
    } catch (e: any) {
      this.logger.error(e)
      callback(e)
      return
    }
    try {
      const r = await this.relayClient.relayTransaction(gsnTransactionDetails)
      // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      void this._onRelayTransactionFulfilled(r, payload, callback)
    } catch (reason) {
      // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      void this._onRelayTransactionRejected(reason, callback)
    }
  }

  _onRelayTransactionFulfilled(relayingResult: RelayingResult, payload: JsonRpcPayload, callback: JsonRpcCallback): void {
    if (relayingResult.relayRequestID != null) {
      const jsonRpcSendResult = this._convertRelayRequestIdToRpcSendResponse(relayingResult.relayRequestID as Hex, payload)
      this.cacheSubmittedTransactionDetails(relayingResult)
      callback(null, jsonRpcSendResult)
    } else {
      const message = `Failed to relay call. Results:\n${_dumpRelayingResult(relayingResult)}`
      this.logger.error(message)
      callback(new Error(message))
    }
  }

  _onRelayTransactionRejected(reason: any, callback: JsonRpcCallback): void {
    const reasonStr = reason instanceof Error ? reason.message : JSON.stringify(reason)
    const msg = `Rejected relayTransaction call with reason: ${reasonStr}`
    this.logger.info(msg)
    callback(new Error(msg))
  }

  _convertRelayRequestIdToRpcSendResponse(relayRequestID: PrefixedHexString, request: JsonRpcPayload): JsonRpcResponse {
    const id = (typeof request.id === 'string' ? parseInt(request.id) : request.id) ?? -1
    return {
      jsonrpc: '2.0',
      id,
      result: relayRequestID
    }
  }

  /**
   * @experimental
   * May be used in case the {@link getTransactionHashFromRequestId} is unable to locate the actual transaction hash.
   * Returns the hash of the **original** `'relayCall()'` transaction returned by the Relay Server.
   *
   * Actual transaction hash may be different as Relay Servers are allowed to increase transaction gas fees.
   *
   * But usually they don't do that, and {@link getTransactionHashFromRequestId} relies only on 'eth_getLogs'.
   * @param relayRequestID
   * @return transactionHash or undefined
   */
  getPossibleTransactionHashFromRequestId(
    relayRequestID: string
  ): string | undefined {
    return this.submittedRelayRequests.get(relayRequestID)?.possibleTransactionHash
  }

  /**
   * Convert relayRequestId (which is a "synthetic" transaction ID) into the actual transaction Id.
   * This is done by parsing RelayHub event, and can only be done after mining.
   * @param relayRequestID
   * @return transactionHash or constant marker:
   *
   *  * If the transaction is already mined, return a real transactionHash
   *  * If the transaction is no longer valid, return TX_NOTFOUND
   *  * If the transaction can still be mined, returns TX_FUTURE
   */
  async getTransactionHashFromRequestId(
    relayRequestID: string
  ): Promise<string> {
    const submissionDetails = await this._getSubmissionDetailsForRelayRequestId(relayRequestID as Hex)
    const extraTopics = [null, null, [relayRequestID as Hex]]
    const relayHubAddress = this.relayClient.dependencies.contractInteractor.getDeployment().relayHubAddress as Address
    const events = await this.relayClient.dependencies.contractInteractor.getPastEventsForHub(
      extraTopics,
      { fromBlock: BigInt(submissionDetails.submissionBlock) },
      [TransactionRelayed, TransactionRejectedByPaymaster])
    if (events.length === 0) {
      if (parseInt(submissionDetails.validUntilTime) > Date.now()) {
        return TX_FUTURE
      }
      return TX_NOTFOUND
    }
    return this._pickSingleEvent(events, relayRequestID).transactionHash!
  }

  /**
   * If the transaction is already mined, return a simulated successful transaction receipt
   * If the transaction is no longer valid, return a simulated reverted transaction receipt
   * If the transaction can still be mined, returns "null" like a regular RPC call would do
   */
  async _createTransactionReceiptForRelayRequestID(
    relayRequestID: string): Promise<GsnTransactionReceipt | null> {
    const transactionHash = await this.getTransactionHashFromRequestId(relayRequestID)
    if (transactionHash === TX_FUTURE) {
      return null
    }
    if (transactionHash === TX_NOTFOUND) {
      return this._createTransactionRevertedReceipt()
    }
    const originalTransactionReceipt = await this.origProvider.send('eth_getTransactionReceipt', [transactionHash]) as GsnTransactionReceipt | null
    if (originalTransactionReceipt == null) {
      return null
    }
    return this._getTranslatedGsnResponseResult(originalTransactionReceipt, relayRequestID)
  }

  _getTranslatedGsnResponseResult(respResult: GsnTransactionReceipt, relayRequestID?: string): GsnTransactionReceipt {
    const fixedTransactionReceipt: GsnTransactionReceipt = { ...respResult }
    fixedTransactionReceipt.actualTransactionHash = fixedTransactionReceipt.transactionHash
    fixedTransactionReceipt.transactionIndex = respResult.transactionIndex ?? 7777
    fixedTransactionReceipt.logs = respResult.logs ?? []
    fixedTransactionReceipt.logs.forEach((it) => {
      if (it.logIndex == null) {
        it.logIndex = (it as unknown as { index?: number }).index ?? 0
      }
    })
    fixedTransactionReceipt.transactionHash = relayRequestID ?? fixedTransactionReceipt.transactionHash
    fixedTransactionReceipt.hash = fixedTransactionReceipt.actualTransactionHash

    fixedTransactionReceipt.status = '1'
    if (respResult.logs.length === 0) {
      return fixedTransactionReceipt
    }
    const abi = relayHubAbi as Abi
    const decodedLogs = respResult.logs.map(log => {
      try {
        return decodeEventLog({
          abi,
          data: log.data as Hex,
          topics: log.topics as [Hex, ...Hex[]]
        })
      } catch (_e) {
        return undefined
      }
    })
    const paymasterRejectedEvent = decodedLogs.find(e => e != null && e.eventName === 'TransactionRejectedByPaymaster')

    if (paymasterRejectedEvent != null) {
      const args = paymasterRejectedEvent.args as unknown as Record<string, unknown>
      const paymasterRejectionReason = args.reason as string | undefined
      if (paymasterRejectionReason !== undefined) {
        this.logger.info(`Paymaster rejected on-chain: ${paymasterRejectionReason}. changing status to zero`)
        fixedTransactionReceipt.status = '0'
      }
      return fixedTransactionReceipt
    }

    const transactionRelayedEvent = decodedLogs.find(e => e != null && e.eventName === 'TransactionRelayed')
    if (transactionRelayedEvent != null) {
      const args = transactionRelayedEvent.args as unknown as Record<string, unknown>
      const transactionRelayedStatus = args.status as number | undefined
      if (transactionRelayedStatus !== undefined) {
        const status = transactionRelayedStatus.toString()
        // 0 signifies success
        if (status !== '0') {
          this.logger.info(`reverted relayed transaction, status code ${status}. changing status to zero`)
          fixedTransactionReceipt.status = '0'
        }
      }
    }
    return fixedTransactionReceipt
  }

  _useGSN(payload: JsonRpcPayload): boolean {
    if (payload.method === 'eth_accounts') {
      return true
    }
    if (payload.params?.[0] === undefined) {
      return false
    }
    const gsnTransactionDetails: GsnTransactionDetails = payload.params[0]
    return gsnTransactionDetails?.useGSN ?? true
  }

  async _fixGasFees(_txDetails: any): Promise<GsnTransactionDetails> {
    const txDetails = { ..._txDetails }
    if (txDetails.maxFeePerGas != null && txDetails.maxPriorityFeePerGas != null) {
      delete txDetails.gasPrice
      return txDetails
    }
    if (txDetails.gasPrice != null && txDetails.maxFeePerGas == null && txDetails.maxPriorityFeePerGas == null) {
      txDetails.maxFeePerGas = txDetails.gasPrice
      txDetails.maxPriorityFeePerGas = txDetails.gasPrice
      delete txDetails.gasPrice
      return txDetails
    }
    if (txDetails.gasPrice == null && txDetails.maxFeePerGas == null && txDetails.maxPriorityFeePerGas == null) {
      const gasFees = await this.calculateGasFees()
      txDetails.maxPriorityFeePerGas = gasFees.maxPriorityFeePerGas
      txDetails.maxFeePerGas = gasFees.maxFeePerGas
      return txDetails
    }
    throw new Error('Relay Provider: cannot provide only one of maxFeePerGas and maxPriorityFeePerGas')
  }

  /* wrapping HttpProvider interface */

  // host: string
  // connected: boolean

  supportsSubscriptions(): boolean {
    return false
  }

  disconnect(): boolean {
    return false
  }

  newAccount(): AccountKeypair {
    return this.relayClient.newAccount()
  }

  async calculateGasFees(): Promise<{ maxFeePerGas: PrefixedHexString, maxPriorityFeePerGas: PrefixedHexString }> {
    return await this.relayClient.calculateGasFees()
  }

  addAccount(privateKey: PrefixedHexString): AccountKeypair {
    return this.relayClient.addAccount(privateKey)
  }

  isEphemeralAccount(account: Address): boolean {
    const ephemeralAccounts = this.relayClient.dependencies.accountManager.getAccounts()
    return ephemeralAccounts.find(it => isSameAddress(account, it as Address)) != null
  }

  _sign(payload: JsonRpcPayload, callback: JsonRpcCallback): void {
    const id = (typeof payload.id === 'string' ? parseInt(payload.id) : payload.id) ?? -1
    const from = payload.params?.[0]
    if (from != null && this.isEphemeralAccount(from)) {
      const result = this.relayClient.dependencies.accountManager.signMessage(payload.params?.[1], from)
      const rpcResponse = {
        id,
        result,
        jsonrpc: '2.0'
      }
      callback(null, rpcResponse)
      return
    }
    this.origProviderSend(payload, callback)
  }

  async _signTransaction(payload: JsonRpcPayload, callback: JsonRpcCallback): Promise<void> {
    const id = (typeof payload.id === 'string' ? parseInt(payload.id) : payload.id) ?? -1
    const transactionConfig = payload.params?.[0] as GsnTransactionConfig | undefined
    if (transactionConfig == null) {
      this.origProviderSend(payload, callback)
      return
    }
    const from = transactionConfig.from as string
    if (from != null && this.isEphemeralAccount(from as unknown as Address)) {
      const result = await this.relayClient.dependencies.accountManager.signTransaction(transactionConfig, from as unknown as Address)
      const rpcResponse = {
        id,
        result,
        jsonrpc: '2.0'
      }
      callback(null, rpcResponse)
      return
    }
    this.origProviderSend(payload, callback)
  }

  async _signTypedData(payload: JsonRpcPayload, callback: JsonRpcCallback): Promise<void> {
    const id = (typeof payload.id === 'string' ? parseInt(payload.id) : payload.id) ?? -1
    const from = payload.params?.[0] as string
    const typedData = payload.params?.[1] as Record<string, unknown>
    if (from != null && this.isEphemeralAccount(from as unknown as Address)) {
      this.logger.debug(`Using ephemeral key for address ${from} to sign a Relay Request or a Typed Message`)
      const result = await this.relayClient.dependencies.accountManager.signTypedData(typedData, from as unknown as Address)
      const rpcResponse = {
        id,
        result,
        jsonrpc: '2.0'
      }
      callback(null, rpcResponse)
      return
    }
    if (this.asyncSignTypedData != null) {
      this.logger.debug('Using override for asyncSignTypedData to sign a Relay Request or a Typed Message')
      // @ts-ignore
      void this.asyncSignTypedData(typedData.domain, typedData.types, typedData.message, from)
        .then(function (result) {
          const rpcResponse = {
            id,
            result,
            jsonrpc: '2.0'
          }
          callback(null, rpcResponse)
        })
        .catch(function (error) {
          callback(error)
        })
      return
    }
    this.logger.debug('Using an RPC call to sign a Relay Request or a Typed Message')
    this.origProviderSend(payload, callback)
  }

  _getAccounts(payload: JsonRpcPayload, callback: JsonRpcCallback): void {
    const isConnectedWithSigner = this.relayClient.isConnectedWithSigner()
    if (isConnectedWithSigner) {
      // if we are connected with a signer that has an address, we only return this address
      void this.origSigner.getAddress()
        .then((it) => {
          const rpcResponse: JsonRpcResponse = {
            id: payload.id ?? Date.now(),
            jsonrpc: payload.jsonrpc,
            result: [it]
          }
          callback(null, rpcResponse)
        })
        .catch((error) => {
          callback(error)
        })
      return
    }
    this.origProviderSend(payload, (error: Error | null, rpcResponse?: JsonRpcResponse): void => {
      if (rpcResponse != null && Array.isArray(rpcResponse.result)) {
        const ephemeralAccounts = this.relayClient.dependencies.accountManager.getAccounts()
        rpcResponse.result = rpcResponse.result.concat(ephemeralAccounts)
      }
      callback(error, rpcResponse)
    })
  }

  /**
   * In an edge case many events with the same ID may be mined.
   * If there is a successful {@link TransactionRelayed} event, it will be returned.
   * If all events are {@link TransactionRejectedByPaymaster}, return the last one.
   * If there is more than one successful {@link TransactionRelayed} throws as this is impossible for current Forwarder
   */
  _pickSingleEvent(events: EventData[], relayRequestID: string): EventData {
    const successes = events.filter(it => it.eventName === TransactionRelayed)
    if (successes.length === 0) {
      const sorted = events.sort((a: EventData, b: EventData) => Number(BigInt(a.blockNumber!) - BigInt(b.blockNumber!)))
      return sorted[0]
    } else if (successes.length === 1) {
      return successes[0]
    } else {
      throw new Error(`Multiple TransactionRelayed events with the same ${relayRequestID} found!`)
    }
  }

  cacheSubmittedTransactionDetails(
    relayingResult: RelayingResult
    // relayRequestID: string,
    // submissionBlock: number,
    // validUntil: string
  ): void {
    if (relayingResult.relayRequestID == null ||
      relayingResult.submissionBlock == null ||
      relayingResult.validUntilTime == null) {
      throw new Error('Missing info in RelayingResult - internal GSN error, should not happen')
    }
    this.submittedRelayRequests.set(relayingResult.relayRequestID, {
      possibleTransactionHash: relayingResult.transaction?.hash,
      validUntilTime: relayingResult.validUntilTime,
      submissionBlock: relayingResult.submissionBlock
    })
  }

  _createTransactionRevertedReceipt(): GsnTransactionReceipt {
    return {
      type: 0,
      to: '',
      from: '',
      contractAddress: '',
      logsBloom: '',
      blockHash: '',
      transactionHash: '',
      transactionIndex: 0,
      gasUsed: 0n,
      logs: [],
      blockNumber: 0,
      cumulativeGasUsed: 0n,
      effectiveGasPrice: 0n,
      status: '0'
    }
  }
}
