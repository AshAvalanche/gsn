// @ts-ignore
import abiDecoder from 'abi-decoder'
import crypto from 'crypto'
import { parseTransaction, recoverTransactionAddress, keccak256, type Hex, type TransactionSerializable, serializeTransaction, TransactionSerializedLegacy } from 'viem'
import { type Address, isAddressEqual } from 'viem'


import PayMasterABI from '@opengsn/common/dist/interfaces/IPaymaster.json'
import RelayHubABI from '@opengsn/common/dist/interfaces/IRelayHub.json'
import StakeManagerABI from '@opengsn/common/dist/interfaces/IStakeManager.json'

import {
  type AuditRequest,
  type AuditResponse,
  CommitAdded,
  type ContractInteractor,
  type LoggerInterface,
  VersionsManager,
  address2topic,
  constants,
  gsnRequiredVersion,
  gsnRuntimeVersion,
  removeHexPrefix,
  toHex,
  toNumber,
  type PrefixedHexString
} from '@opengsn/common'

import { replaceErrors } from '@opengsn/common/dist/ErrorReplacerJSON'
import { type BlockExplorerInterface } from './BlockExplorerInterface'
import { getDataAndSignature } from './PenalizerUtils'

import { ServerAction } from '../StoredTransaction'
import { type TransactionManager } from '../TransactionManager'

import { type ServerConfigParams } from '../ServerConfigParams'
import { type Web3MethodsBuilder } from '../Web3MethodsBuilder'

import Timeout = NodeJS.Timeout

abiDecoder.addABI(RelayHubABI)
abiDecoder.addABI(PayMasterABI)
abiDecoder.addABI(StakeManagerABI)

const INVALID_SIGNATURE = 'Transaction does not have a valid signature'
const UNKNOWN_WORKER = 'Transaction is sent by an unknown worker'
const UNSTAKED_RELAY = 'Transaction is sent by an unstaked relay'
const MINED_TRANSACTION = 'Transaction is the one mined on the current chain and no conflicting transaction is known to this server'
const NONCE_FORWARD = 'Transaction nonce is higher then current account nonce and no conflicting transaction is known to this server'

export interface PenalizerDependencies {
  transactionManager: TransactionManager
  contractInteractor: ContractInteractor
  web3MethodsBuilder: Web3MethodsBuilder
  txByNonceService: BlockExplorerInterface
}

type RecoverableTransaction = `0x02${string}` | `0x01${string}` | `0x03${string}` | `0x04${string}` | TransactionSerializedLegacy

/**
 * types of penalization supported by a penalizer
 * string values are for logging purposes only
 */
enum PenalizationTypes {
  ILLEGAL_TRANSACTION = 'penalizeIllegalTransaction',
  REPEATED_NONCE = 'penalizeRepeatedNonce'
}

interface DelayedPenalization {
  readyBlockNumber?: number
  type: PenalizationTypes
  commitHash: PrefixedHexString
  methodArgs: PrefixedHexString[]
}

export class PenalizerService {
  private workerTask?: Timeout

  // TODO: TransactionManager is not integrated with Penalizer Service, so there is a duplication here
  /** Maps block where commitment becomes valid to penalization details */
  scheduledPenalizations: DelayedPenalization[] = []
  transactionManager: TransactionManager
  contractInteractor: ContractInteractor
  web3MethodsBuilder: Web3MethodsBuilder
  txByNonceService: BlockExplorerInterface
  versionManager: VersionsManager
  logger: LoggerInterface
  config: ServerConfigParams
  initialized: boolean = false

  managerAddress: string

  constructor(params: PenalizerDependencies, logger: LoggerInterface, config: ServerConfigParams) {
    this.transactionManager = params.transactionManager
    this.contractInteractor = params.contractInteractor
    this.web3MethodsBuilder = params.web3MethodsBuilder
    this.versionManager = new VersionsManager(gsnRuntimeVersion, config.requiredVersionRange ?? gsnRequiredVersion)
    this.config = config
    this.txByNonceService = params.txByNonceService

    this.managerAddress = this.transactionManager.managerKeyManager.getAddress(0)
    this.logger = logger
  }



  async init(startWorker: boolean = true): Promise<void> {
    if (this.initialized) {
      return
    }

    this.logger.info('Penalizer service initialized')
    if (startWorker) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.workerTask = setInterval(this.intervalHandler.bind(this), this.config.checkInterval)
      this.logger.debug(`Started checking for ready penalization commitments every ${this.config.checkInterval}ms`)
    }
    this.initialized = true
  }

  stop(): void {
    if (this.workerTask != null) {
      clearInterval(this.workerTask)
    }
  }

  async penalizeRepeatedNonce(req: AuditRequest): Promise<AuditResponse> {
    if (!this.initialized) {
      throw new Error('PenalizerService is not initialized')
    }
    if (this.config.etherscanApiUrl.length === 0) {
      return {
        message: 'Etherscan API URL is not set on this server!'
      }
    }
    this.logger.info(`Validating tx ${req.signedTx}`)

    const requestTx = parseTransaction(req.signedTx as Hex)
    const validationResult = await this.validateTransaction(req.signedTx as Hex, requestTx)
    if (!validationResult.valid) {
      return {
        message: validationResult.error
      }
    }

    const isMinedTx = await this.isTransactionMined(req.signedTx as Hex)
    if (isMinedTx) {
      return {
        message: MINED_TRANSACTION
      }
    }

    const relayWorker = await recoverTransactionAddress({ serializedTransaction: req.signedTx as RecoverableTransaction })
    // read the relay worker's nonce from blockchain
    const currentNonce = await this.contractInteractor.getTransactionCount(relayWorker, 'pending')

    // if tx nonce > current nonce, publish tx and await
    // otherwise, get mined tx with same nonce. if equals (up to different gasPrice) to received tx, return.
    // Otherwise, penalize.
    const transactionNonce = Number(requestTx.nonce)
    if (transactionNonce > currentNonce) {
      // TODO: store it, and see how sender behaves later...
      return {
        message: NONCE_FORWARD
      }
    }

    // run penalize in view mode to see if penalizable
    const minedTransactionData = await this.txByNonceService.getTransactionByNonce(relayWorker, transactionNonce)
    if (minedTransactionData == null) {
      throw Error(`TxByNonce service failed to fetch tx with nonce ${transactionNonce} of relayer ${relayWorker}`)
    }
    const minedTx = await this.contractInteractor.getTransaction(minedTransactionData.hash as Address)
    if (minedTx == null) {
      throw Error(`Failed to get transaction ${minedTransactionData.hash} from node`)
    }

    const randomValue = crypto.randomBytes(32).toString('hex')
    const penalizationArguments = this.getPenalizeRepeatedNonceArguments(minedTx as any, requestTx, `0x${randomValue}`)
    const method = this.getMethod(PenalizationTypes.REPEATED_NONCE, penalizationArguments)
    const isValidPenalization = await this.validatePenalization(method)
    if (!isValidPenalization.valid) {
      return {
        message: isValidPenalization.error
      }
    }
    const commitHash = this.calculateCommitHash(method)
    const delayedPenalization: DelayedPenalization = {
      commitHash,
      type: PenalizationTypes.REPEATED_NONCE,
      methodArgs: penalizationArguments
    }
    const commitTxHash = await this.commitAndScheduleReveal(delayedPenalization)
    return { commitTxHash }
  }

  calculateCommitHash(method: any): PrefixedHexString {
    const msgData: string = method.encodeABI()
    const msgDataHash = keccak256(msgData as Hex)
    return keccak256((msgDataHash + this.managerAddress.slice(2).toLowerCase()) as Hex)
  }

  async intervalHandler(): Promise<PrefixedHexString[]> {
    if (this.scheduledPenalizations.length === 0) {
      return []
    }
    console.log('interval handler called')
    // step 1. see if sent some commitments and these are now mined
    await this.queryReadyBlocksForMinedCommitments()
    // step 2. now all commitments have a due date, let's see if any are up for penalization
    return await this.executeReadyPenalizations()
  }

  async executeReadyPenalizations(): Promise<PrefixedHexString[]> {
    const currentBlockNumber = await this.contractInteractor.getBlockNumber()
    const readyPenalizations = this.scheduledPenalizations.filter(it => {
      return it.readyBlockNumber != null && it.readyBlockNumber <= currentBlockNumber
    })
    const executedPenalizations: PrefixedHexString[] = []

    for (const penalization of readyPenalizations) {
      // Remove ready penalizations from memory
      const index = this.scheduledPenalizations.indexOf(penalization)
      this.scheduledPenalizations.splice(index, 1)

      // now broadcast the penalization transaction
      const penalizationTxHash = await this.executeDelayedPenalization(penalization)
      executedPenalizations.push(penalizationTxHash)
    }
    return executedPenalizations
  }

  /**
   * Note: this method modifies elements of {@link scheduledPenalizations} in-place
   */
  async queryReadyBlocksForMinedCommitments(): Promise<void> {
    const unconfirmedPenalizations = this.scheduledPenalizations.filter(it => it.readyBlockNumber === undefined)
    const nonMinedCommitHashes = unconfirmedPenalizations.map(up => up.commitHash)
    if (unconfirmedPenalizations.length > 0) {
      // TODO: sanitize functional stuff
      const topics = [address2topic(this.managerAddress) as Address]
      const commitments = await this.contractInteractor.getPastEventsForPenalizer([CommitAdded], topics, { fromBlock: 1n })
      const newlyMinedCommitments = commitments
        .filter(it => {
          return nonMinedCommitHashes.includes(it.args.commitHash)
        })
      unconfirmedPenalizations.forEach(it => {
        const commitment = newlyMinedCommitments.find(nmc => nmc.args.commitHash === it.commitHash)
        if (commitment != null) {
          it.readyBlockNumber = commitment.args.readyBlockNumber
        }
      })
    }
  }

  async penalizeIllegalTransaction(req: AuditRequest): Promise<AuditResponse> {
    const requestTx = parseTransaction(req.signedTx as Hex)
    const validationResult = await this.validateTransaction(req.signedTx as Hex, requestTx)
    if (!validationResult.valid) {
      return {
        message: validationResult.error
      }
    }

    // TODO: remove duplication
    const randomValue = crypto.randomBytes(32).toString('hex')
    const penalizationArguments = this.getPenalizeIllegalTransactionArguments(requestTx, `0x${randomValue}`)
    const method = this.getMethod(PenalizationTypes.ILLEGAL_TRANSACTION, penalizationArguments)
    const isValidPenalization = await this.validatePenalization(method)
    if (!isValidPenalization.valid) {
      return {
        message: isValidPenalization.error
      }
    }

    const commitHash = this.calculateCommitHash(method)
    const delayedPenalization: DelayedPenalization = {
      commitHash,
      type: PenalizationTypes.ILLEGAL_TRANSACTION,
      methodArgs: penalizationArguments
    }
    const commitTxHash = await this.commitAndScheduleReveal(delayedPenalization)
    return { commitTxHash }
  }

  async commitAndScheduleReveal(delayedPenalization: DelayedPenalization): Promise<any> {
    this.scheduledPenalizations.push(delayedPenalization)
    const method = this.web3MethodsBuilder.getPenalizerCommitMethod(delayedPenalization.commitHash)
    return await this.broadcastTransaction('commit', method)
  }

  async executeDelayedPenalization(delayedPenalization: DelayedPenalization): Promise<PrefixedHexString> {
    const method = this.getMethod(delayedPenalization.type, delayedPenalization.methodArgs)
    return await this.broadcastTransaction(delayedPenalization.type.valueOf(), method)
  }

  async broadcastTransaction(methodName: string, method: any): Promise<PrefixedHexString> {
    const creationBlockNumber = await this.contractInteractor.getBlockNumber()
    const block = await this.contractInteractor.getBlock(creationBlockNumber)
    const creationBlockTimestamp = toNumber(block.timestamp)
    const serverAction = ServerAction.PENALIZATION
    const { signedTx, transactionHash } = await this.transactionManager.sendTransaction(
      {
        signer: this.managerAddress as Address,
        method,
        destination: this.contractInteractor.penalizerInstance.address,
        creationBlockNumber: Number(creationBlockNumber),
        creationBlockHash: block.hash,
        creationBlockTimestamp,
        serverAction
      })
    this.logger.debug(`penalization raw tx: ${signedTx} txHash: ${transactionHash}`)
    return transactionHash
  }

  getPenalizeIllegalTransactionArguments(requestTx: TransactionSerializable, randomValue: Hex): PrefixedHexString[] {
    const chainId = this.contractInteractor.chainId
    const { data, signature } = getDataAndSignature(requestTx, chainId)
    return [
      data, signature, this.contractInteractor.relayHubInstance.address as Address,
      randomValue
    ]
  }

  getPenalizeRepeatedNonceArguments(minedTx: TransactionSerializable, requestTx: TransactionSerializable, randomValue: Hex): PrefixedHexString[] {
    const chainId = this.contractInteractor.chainId
    const { data: unsignedMinedTx, signature: minedTxSig } = getDataAndSignature(minedTx, chainId)
    const { data: unsignedRequestTx, signature: requestTxSig } = getDataAndSignature(requestTx, chainId)
    return [
      unsignedRequestTx, requestTxSig, unsignedMinedTx,
      minedTxSig, this.contractInteractor.relayHubInstance.address as Address,
      randomValue
    ]
  }

  async validateTransaction(signedTx: Hex, requestTx: TransactionSerializable): Promise<{ valid: boolean, error?: string }> {
    const txHash = keccak256(signedTx)
    if (requestTx.r == null || requestTx.s == null || (requestTx.v == null && requestTx.yParity == null)) {
      return {
        valid: false,
        error: INVALID_SIGNATURE
      }
    }
    const relayWorker = await recoverTransactionAddress({ serializedTransaction: signedTx as RecoverableTransaction })
    const relayManager = await this.contractInteractor.relayHubInstance.read.getWorkerManager([relayWorker])
    // @ts-ignore
    if (isAddressEqual(relayManager, '0x0000000000000000000000000000000000000000')) {
      return {
        valid: false,
        error: UNKNOWN_WORKER
      }
    }
    try {
      await this.contractInteractor.relayHubInstance.read.verifyRelayManagerStaked([relayManager])
    } catch (e: any) {
      this.logger.info(e.message)
      return {
        valid: false,
        error: UNSTAKED_RELAY
      }
    }
    this.logger.info(`Transaction ${txHash} is valid`)
    return { valid: true }
  }

  async isTransactionMined(signedTx: Hex): Promise<boolean> {
    const txFromNode = await this.contractInteractor.getTransaction(keccak256(signedTx))
    return txFromNode != null
  }

  async validatePenalization(method: any): Promise<{ valid: boolean, error?: string }> {
    try {
      const res = await method.call!({
        from: constants.BURN_ADDRESS
      }, 'pending', this.contractInteractor.client, this.contractInteractor.penalizerInstance.address)
      this.logger.debug(`res is ${JSON.stringify(res)}`)
      return {
        valid: true
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : JSON.stringify(e, replaceErrors)
      this.logger.debug(`view call to penalizeRepeatedNonce reverted with error message ${error}.\nTx not penalizable.`)
      return {
        valid: false,
        error
      }
    }
  }

  getMethod(penalizationTypes: PenalizationTypes, methodArgs: PrefixedHexString[]): any {
    switch (penalizationTypes) {
      case PenalizationTypes.REPEATED_NONCE:
        return this.web3MethodsBuilder.getPenalizeRepeatedNonceMethod(...methodArgs)
      case PenalizationTypes.ILLEGAL_TRANSACTION:
        return this.web3MethodsBuilder.getPenalizeIllegalTransactionMethod(...methodArgs)
    }
  }
}
