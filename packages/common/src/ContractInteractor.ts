
import {
  type Address,
  type GetContractReturnType,
  type Hex,
  type Log,
  type PublicClient,
  type WalletClient,
  type Transport,
  type Chain,
  type Account,
  type Abi,
  createPublicClient,
  http,
  defineChain,
  parseAbiItem,
  encodeFunctionData,
  decodeErrorResult,
  getContract,
  isAddress,
  zeroAddress,
  toHex,
  concat,
  keccak256,
  encodeAbiParameters,
  decodeAbiParameters,
  parseEventLogs,
  numberToHex,
  type Client,
  type PublicActions,
  type WalletActions
} from 'viem'

import { type RelayRequest } from './EIP712/RelayRequest'

import { VersionsManager } from './VersionsManager'
import { replaceErrors } from './ErrorReplacerJSON'
import { type LoggerInterface } from './LoggerInterface'
import {
  address2topic,
  averageBN,
  decodeRevertReason,
  errorAsBoolean,
  event2topic,
  formatTokenAmount,
  isSameAddress,
  packRelayUrlForRegistrar,
  toNumber,
  sleep
} from './Utils'
import {
  iForwarderAbi,
  ierc20TokenAbi,
  ierc2771RecipientAbi,
  iPaymasterAbi,
  iPenalizerAbi,
  iRelayHubAbi,
  iRelayRegistrarAbi,
  iStakeManagerAbi
} from '@opengsn/contracts'

import {
  type CalldataGasEstimation,
  type EventData,
  type EventName,
  type IntString,
  type ObjectMap,
  type SemVerString
} from './types/Aliases'
import { type GsnTransactionDetails } from './types/GsnTransactionDetails'

import { gsnRequiredVersion, gsnRuntimeVersion } from './Version'
import { type GSNContractsDeployment } from './GSNContractsDeployment'
import { ActiveManagerEvents, RelayServerRegistered, RelayWorkersAdded, type StakeInfo } from './types/GSNContractsDataTypes'
import { type Environment } from './environments/Environments'
import { type RelayTransactionRequest } from './types/RelayTransactionRequest'
import { TransactionType } from './types/TransactionType'
import { type RegistrarRelayInfo } from './types/RelayInfo'
import { constants, erc165Interfaces, RelayCallStatusCodes } from './Constants'
import { RelayCallGasLimitCalculationHelper } from './RelayCallGasLimitCalculationHelper'
import { MainnetCalldataGasEstimation } from './environments/MainnetCalldataGasEstimation'
import { AsyncZeroAddressCalldataGasEstimation } from './environments/AsyncZeroAddressCalldataGasEstimation'
import { type FeeHistoryResult } from './web3js/FeeHistoryResult'

// Generic contract type helper - Using interaction to avoid strict Type issues with Viem's inferred types during migration
export type GsnContract<QT extends Abi | readonly unknown[]> = GetContractReturnType<QT, PublicClient, Address> & {
  write: any
  read: any
  estimateGas: any
  address: Address
}

export interface FilterBlocks {
  fromBlock?: bigint | 'latest' | 'earliest' | 'pending'
  toBlock?: bigint | 'latest' | 'earliest' | 'pending'
}

export interface ConstructorParams {
  client: Client & PublicActions & WalletActions
  logger: LoggerInterface
  versionManager?: VersionsManager
  deployment?: GSNContractsDeployment
  calldataEstimationSlackFactor?: number
  maxPageSize: number
  maxPageCount?: number
  environment: Environment
  domainSeparatorName?: string
}

export interface RelayCallABI {
  domainSeparatorName: string
  signature: Hex
  relayRequest: RelayRequest
  approvalData: Hex
  maxAcceptanceBudget: Hex
}

export function asRelayCallAbi(r: RelayTransactionRequest): RelayCallABI {
  return {
    domainSeparatorName: r.metadata.domainSeparatorName,
    relayRequest: r.relayRequest,
    signature: r.metadata.signature as Hex,
    approvalData: r.metadata.approvalData as Hex,
    maxAcceptanceBudget: r.metadata.maxAcceptanceBudget as Hex
  }
}

interface ManagerStakeStatus {
  isStaked: boolean
  errorMessage: string | null
}

export interface ERC20TokenMetadata {
  tokenAddress: Address
  tokenName: string
  tokenSymbol: string
  tokenDecimals: number
}

export interface ViewCallVerificationResult {
  paymasterAccepted: boolean
  recipientReverted: boolean
  returnValue: string
  relayHubReverted: boolean
}

export class ContractInteractor {
  private paymasterInstance!: GsnContract<typeof iPaymasterAbi>
  relayHubInstance!: GsnContract<typeof iRelayHubAbi>
  relayHubConfiguration!: any // struct output type
  private forwarderInstance!: GsnContract<typeof iForwarderAbi>
  private stakeManagerInstance!: GsnContract<typeof iStakeManagerAbi>
  penalizerInstance!: GsnContract<typeof iPenalizerAbi>
  private erc2771RecipientInstance?: GsnContract<typeof ierc2771RecipientAbi>
  relayRegistrar!: GsnContract<typeof iRelayRegistrarAbi>
  erc20Token!: GsnContract<typeof ierc20TokenAbi>

  readonly calculateCalldataGasUsed: CalldataGasEstimation
  readonly client: Client & PublicActions & WalletActions

  private deployment: GSNContractsDeployment
  private readonly versionManager: VersionsManager
  readonly logger: LoggerInterface
  private readonly calldataEstimationSlackFactor: number
  private readonly maxPageSize: number
  private readonly maxPageCount: number
  private lastBlockNumber: bigint = 0n

  chainId!: number
  private paymasterVersion?: SemVerString
  readonly environment: Environment
  transactionType: TransactionType = TransactionType.LEGACY
  readonly domainSeparatorName: string
  readonly gasLimitCalculator: RelayCallGasLimitCalculationHelper

  constructor(
    {
      maxPageSize,
      maxPageCount,
      client,
      versionManager,
      logger,
      environment,
      calldataEstimationSlackFactor,
      domainSeparatorName,
      deployment = {}
    }: ConstructorParams) {
    this.maxPageSize = maxPageSize
    this.maxPageCount = maxPageCount ?? Number.MAX_SAFE_INTEGER
    this.logger = logger
    this.versionManager = versionManager ?? new VersionsManager(gsnRuntimeVersion, gsnRequiredVersion)
    this.deployment = deployment
    this.client = client
    this.calldataEstimationSlackFactor = calldataEstimationSlackFactor ?? 1
    this.environment = environment
    this.gasLimitCalculator = new RelayCallGasLimitCalculationHelper(this, environment, logger)
    this.calculateCalldataGasUsed =
      this.environment.useEstimateGasForCalldataCost
        ? AsyncZeroAddressCalldataGasEstimation
        : MainnetCalldataGasEstimation
    this.domainSeparatorName = domainSeparatorName ?? ''
    this.gasLimitCalculator = new RelayCallGasLimitCalculationHelper(this, environment, logger)
  }

  async init(): Promise<ContractInteractor> {
    const initStartTimestamp = Date.now()
    this.logger.debug('interactor init start')

    try {
      await this.client.getFeeHistory({ blockCount: 1, rewardPercentiles: [50] })
      this.transactionType = TransactionType.TYPE_TWO
      this.logger.debug('RPC node supports \'eth_feeHistory\'. Initializing to Type 2 Transactions.')
    } catch (e: any) {
      this.logger.warn('Call to \'eth_feeHistory\' failed. Falling back to Legacy Transaction Type.')
      this.transactionType = TransactionType.LEGACY
    }

    if (this.client?.account) {
      this.logger.info(`Initializing for address ${this.client.account.address}`)
    }

    await this._resolveDeployment()
    await this._initializeContracts()
    await this._validateCompatibility()
    await this._initializeNetworkParams()
    if (this.relayHubInstance != null) {
      this.relayHubConfiguration = await this.relayHubInstance.read.getConfiguration()
    }
    this.logger.debug(`client init finished in ${Date.now() - initStartTimestamp} ms`)
    return this
  }

  async _initializeNetworkParams(): Promise<void> {
    this.chainId = await this.client.getChainId()
  }

  async _resolveDeployment(): Promise<void> {
    if (this.deployment.paymasterAddress != null && this.deployment.relayHubAddress != null) {
      this.logger.warn('Already resolved!')
      return
    }

    if (this.deployment.paymasterAddress != null && (this.deployment.paymasterAddress as string) !== '') {
      await this._resolveDeploymentFromPaymaster(this.deployment.paymasterAddress)
    } else if (this.deployment.relayHubAddress != null) {
      if (!await this.isContractDeployed(this.deployment.relayHubAddress)) {
        throw new Error(`RelayHub: no contract at address ${this.deployment.relayHubAddress}`)
      }
      await this._resolveDeploymentFromRelayHub(this.deployment.relayHubAddress)
    } else {
      this.logger.info(`Contract interactor cannot resolve a full deployment from the following input: ${JSON.stringify(this.deployment)}`)
    }
  }

  async _resolveDeploymentFromPaymaster(paymasterAddress: Address): Promise<void> {
    this.paymasterInstance = this._createPaymaster(paymasterAddress)
    const [
      relayHubAddress, forwarderAddress, paymasterVersion
    ] = await Promise.all([
      this.paymasterInstance.read.getRelayHub().catch((e: Error) => { throw new Error(`Not a paymaster contract: ${e.message}`) }),
      this.paymasterInstance.read.getTrustedForwarder().catch(
        (e: Error) => { throw new Error(`paymaster has no trustedForwarder(): ${e.message}`) }),
      this.paymasterInstance.read.versionPaymaster().catch((e: Error) => { throw new Error(`Not a paymaster contract: ${e.message}`) }).then(
        (version: string) => {
          this._validateVersion(version, 'Paymaster')
          return version
        })
    ])

    if (
      isSameAddress(relayHubAddress, constants.ZERO_ADDRESS) ||
      isSameAddress(forwarderAddress, constants.ZERO_ADDRESS)
    ) {
      throw new Error(
        `RelayHub or Forwarder addresses on the provided Paymaster (${paymasterAddress}) are not set. Please set them (for BasePaymaster subclasses use 'setRelayHub' and 'setTrustedForwarder' methods) first and try again.`)
    }

    this.deployment.relayHubAddress = relayHubAddress
    this.deployment.forwarderAddress = forwarderAddress
    this.paymasterVersion = paymasterVersion
    await this._resolveDeploymentFromRelayHub(relayHubAddress)
  }

  async _resolveDeploymentFromRelayHub(relayHubAddress: Address): Promise<void> {
    this.relayHubInstance = this._createRelayHub(relayHubAddress)
    const [stakeManagerAddress, penalizerAddress, relayRegistrarAddress] = await Promise.all([
      this._hubStakeManagerAddress(),
      this._hubPenalizerAddress(),
      this._hubRelayRegistrarAddress()
    ])
    this.deployment.relayHubAddress = relayHubAddress
    this.deployment.stakeManagerAddress = stakeManagerAddress
    this.deployment.penalizerAddress = penalizerAddress
    this.deployment.relayRegistrarAddress = relayRegistrarAddress
  }

  async _validateCompatibility(): Promise<void> {
    if (this.deployment == null || this.relayHubInstance == null) {
      return
    }
    const hub = this.relayHubInstance
    const version = await hub.read.versionHub()
    this._validateVersion(version, 'RelayHub')
  }

  _validateVersion(version: string, contractName: string): void {
    const versionSatisfied = this.versionManager.isRequiredVersionSatisfied(version)
    if (!versionSatisfied) {
      throw new Error(
        `Provided ${contractName} version(${version}) does not satisfy the requirement(${this.versionManager.requiredVersionRange})`)
    }
  }

  async _validateERC165InterfacesRelay(): Promise<void> {
    this.logger.debug(`ERC-165 interface IDs: ${JSON.stringify(erc165Interfaces)}`)
    const pnPromise = this._trySupportsInterface('Penalizer', this.penalizerInstance, erc165Interfaces.penalizer as Hex)
    const rrPromise = this._trySupportsInterface('RelayRegistrar', this.relayRegistrar, erc165Interfaces.relayRegistrar as Hex)
    const rhPromise = this._trySupportsInterface('RelayHub', this.relayHubInstance, erc165Interfaces.relayHub as Hex)
    const smPromise = this._trySupportsInterface('StakeManager', this.stakeManagerInstance, erc165Interfaces.stakeManager as Hex)
    const [pn, rr, rh, sm] = await Promise.all([pnPromise, rrPromise, rhPromise, smPromise])
    const all = pn && rr && rh && sm
    if (!all) {
      throw new Error(`ERC-165 interface check failed. PN: ${pn} RR: ${rr} RH: ${rh} SM: ${sm}`)
    }
  }

  async _validateERC165InterfacesClient(allowNoPaymaster: boolean = false): Promise<void> {
    this.logger.debug(`ERC-165 interface IDs: ${JSON.stringify(erc165Interfaces)}`)
    const fwPromise = this._trySupportsInterface('Forwarder', this.forwarderInstance, erc165Interfaces.forwarder as Hex)
    let pmPromise: Promise<boolean>
    if (allowNoPaymaster && isSameAddress(this.paymasterInstance.address, constants.ZERO_ADDRESS)) {
      this.logger.debug('skipping ERC-165 check for paymaster: address is not set')
      pmPromise = Promise.resolve(true)
    } else {
      pmPromise = this._trySupportsInterface('Paymaster', this.paymasterInstance, erc165Interfaces.paymaster as Hex)
    }
    const [fw, pm] = await Promise.all([fwPromise, pmPromise])
    const all = fw && pm
    if (!all) {
      throw new Error(`ERC-165 interface check failed. FW: ${fw} PM: ${pm}`)
    }
  }

  // Generic supportsInterface check
  private async _trySupportsInterface(
    contractName: string,
    contractInstance: any,
    interfaceId: Hex): Promise<boolean> {
    if (contractInstance == null) {
      throw new Error(`ERC-165 interface check failed. ${contractName} instance is not initialized`)
    }
    try {
      return await contractInstance.read.supportsInterface([interfaceId])
    } catch (e: any) {
      const isContractDeployed = await this.isContractDeployed(contractInstance.address)
      throw new Error(`Failed call to ${contractName} supportsInterface at address: ${contractInstance.address} (isContractDeployed: ${isContractDeployed}) with error: ${e.message as string}`)
    }
  }

  async _initializeContracts(): Promise<void> {
    if (this.relayHubInstance == null && this.deployment.relayHubAddress != null) {
      this.relayHubInstance = this._createRelayHub(this.deployment.relayHubAddress)
    }
    if (this.relayRegistrar == null && this.deployment.relayRegistrarAddress != null) {
      this.relayRegistrar = this._createRelayRegistrar(this.deployment.relayRegistrarAddress)
    }
    if (this.paymasterInstance == null && this.deployment.paymasterAddress != null && (this.deployment.paymasterAddress as string) !== '') {
      this.paymasterInstance = this._createPaymaster(this.deployment.paymasterAddress)
    }
    if (this.deployment.forwarderAddress != null) {
      this.forwarderInstance = this._createForwarder(this.deployment.forwarderAddress)
    }
    if (this.deployment.stakeManagerAddress != null) {
      this.stakeManagerInstance = this._createStakeManager(this.deployment.stakeManagerAddress)
    }
    if (this.deployment.penalizerAddress != null) {
      this.penalizerInstance = this._createPenalizer(this.deployment.penalizerAddress)
    }
    if (this.deployment.managerStakeTokenAddress != null) {
      this.erc20Token = this._createERC20(this.deployment.managerStakeTokenAddress)
    }
  }

  _createRecipient(address: Address): GsnContract<typeof ierc2771RecipientAbi> {
    return getContract({ address, abi: ierc2771RecipientAbi, client: this.client }) as any
  }

  _createPaymaster(address: Address): GsnContract<typeof iPaymasterAbi> {
    return getContract({ address, abi: iPaymasterAbi, client: this.client }) as any
  }

  _createRelayHub(address: Address): GsnContract<typeof iRelayHubAbi> {
    return getContract({ address, abi: iRelayHubAbi, client: this.client }) as any
  }

  _createForwarder(address: Address): GsnContract<typeof iForwarderAbi> {
    return getContract({ address, abi: iForwarderAbi, client: this.client }) as any

  }

  _createStakeManager(address: Address): GsnContract<typeof iStakeManagerAbi> {
    return getContract({ address, abi: iStakeManagerAbi, client: this.client }) as any
  }

  _createPenalizer(address: Address): GsnContract<typeof iPenalizerAbi> {
    return getContract({ address, abi: iPenalizerAbi, client: this.client }) as any
  }

  _createRelayRegistrar(address: Address): GsnContract<typeof iRelayRegistrarAbi> {
    return getContract({ address, abi: iRelayRegistrarAbi, client: this.client }) as any
  }

  _createERC20(address: Address): GsnContract<typeof ierc20TokenAbi> {
    return getContract({ address, abi: ierc20TokenAbi, client: this.client }) as any
  }

  _createContract(address: Address, abi: Abi): GsnContract<Abi> {
    return getContract({ address, abi, client: this.client }) as any
  }

  async getTokenBalanceFormatted(address: Address): Promise<string> {
    const balance = await this.erc20Token.read.balanceOf([address])
    return await this.formatTokenAmount(balance)
  }

  async formatTokenAmount(balance: bigint): Promise<string> {
    const { tokenSymbol, tokenDecimals, tokenAddress } = await this.getErc20TokenMetadata()
    return formatTokenAmount(balance, tokenDecimals, tokenAddress, tokenSymbol)
  }

  async getErc20TokenMetadata(): Promise<ERC20TokenMetadata> {
    let tokenName: string
    try {
      tokenName = await this.erc20Token.read.name()
    } catch (_) {
      tokenName = `ERC-20 token ${this.erc20Token.address}`
    }
    let tokenSymbol: string
    try {
      tokenSymbol = await this.erc20Token.read.symbol()
    } catch (_) {
      tokenSymbol = `ERC-20 token ${this.erc20Token.address}`
    }
    let tokenDecimals: number
    try {
      tokenDecimals = await this.erc20Token.read.decimals()
    } catch (_) {
      tokenDecimals = 0
    }
    const tokenAddress = this.erc20Token.address
    return { tokenName, tokenSymbol, tokenAddress, tokenDecimals }
  }

  async isTrustedForwarder(recipientAddress: Address, forwarder: Address): Promise<boolean> {
    const recipient = this._createRecipient(recipientAddress)
    return await recipient.read.isTrustedForwarder([forwarder])
  }

  async getSenderNonce(sender: Address, forwarderAddress: Address): Promise<IntString> {
    const forwarder = this._createForwarder(forwarderAddress)
    const nonce = await forwarder.read.getNonce([sender])
    return nonce.toString()
  }

  async getBlockGasLimit(): Promise<number> {
    const latestBlock = await this.client.getBlock({ blockTag: 'latest' })
    if (latestBlock == null) {
      throw new Error('Failed to query "getBlock", crashing.')
    }
    return Number(latestBlock.gasLimit)
  }

  _fixGasFees(relayRequest: RelayRequest): {
    gasPrice?: Hex
    maxFeePerGas?: Hex
    maxPriorityFeePerGas?: Hex
  } {
    if (this.transactionType === TransactionType.LEGACY) {
      return { gasPrice: relayRequest.relayData.maxFeePerGas as Hex }
    } else {
      return {
        maxFeePerGas: relayRequest.relayData.maxFeePerGas as Hex,
        maxPriorityFeePerGas: relayRequest.relayData.maxPriorityFeePerGas as Hex
      }
    }
  }

  async validateRelayCall(
    relayCallABIData: RelayCallABI,
    viewCallGasLimit: bigint | number,
    isDryRun: boolean): Promise<ViewCallVerificationResult> {
    if (viewCallGasLimit == null || relayCallABIData.relayRequest.relayData.maxFeePerGas == null || relayCallABIData.relayRequest.relayData.maxPriorityFeePerGas == null) {
      throw new Error('validateRelayCall: invalid input')
    }
    const relayHub = this.relayHubInstance
    const from = isDryRun ? constants.DRY_RUN_ADDRESS : relayCallABIData.relayRequest.relayData.relayWorker
    try {
      const encodedRelayCall = this.encodeABI(relayCallABIData)

      const gasFees = this._fixGasFees(relayCallABIData.relayRequest)

      // We perform a low-level call to simulate the user transaction or view call
      // Viem CallParameters might expect gasPrice only for legacy, or max... for EIP-1559.
      // We pass object spread to satisfy types or cast as any.
      const callArgs: any = {
        account: from,
        to: relayHub.address,
        data: encodedRelayCall,
        gas: BigInt(viewCallGasLimit),
        ...gasFees,
        blockTag: 'latest'
      }

      const result = await this.client.call(callArgs)

      // The call succeeded (didn't revert itself), but we need to check the return values
      // decode: success (bool), ret (bytes)
      const decodedValues = decodeAbiParameters(
        [
          { name: 'paymasterAccepted', type: 'bool' },
          { name: 'charge', type: 'uint256' },
          { name: 'status', type: 'uint256' },
          { name: 'returnValue', type: 'bytes' }
        ],
        result.data as Hex
      )

      const paymasterAccepted = decodedValues[0] as boolean
      const relayCallStatus = Number(decodedValues[2])
      let returnValue = decodedValues[3] as Hex

      const recipientReverted = relayCallStatus === 1 // RelayedCallFailed

      // If returnValue is error, decode it
      if (!paymasterAccepted || recipientReverted) {
        returnValue = this._decodeRevertFromResponse({}, { result: returnValue }) as Hex ?? returnValue
      }

      return {
        returnValue,
        paymasterAccepted,
        recipientReverted,
        relayHubReverted: false
      }
    } catch (e: any) {
      const message = e.message
      return {
        paymasterAccepted: false,
        recipientReverted: false,
        relayHubReverted: true,
        returnValue: `view call to 'relayCall' reverted in client: ${message}`
      }
    }
  }

  _decodeRevertFromResponse(err?: { message?: string, data?: any, error?: any } | undefined, res?: {
    error?: any
    result?: string
  } | undefined): string | null {
    // Porting legacy logic, primarily relying on error string matching or data decoding
    const errorData = err?.data ?? res?.error?.data ?? res?.result
    if (errorData && errorData !== '0x') {
      return decodeRevertReason(errorData as Hex)
    }
    return err?.message ?? null
  }

  encodeABI(
    _: RelayCallABI
  ): Hex {
    return encodeFunctionData({
      abi: iRelayHubAbi,
      functionName: 'relayCall',
      args: [
        _.domainSeparatorName,
        BigInt(_.maxAcceptanceBudget),
        _.relayRequest as any, // struct alignment?
        _.signature,
        _.approvalData
      ]
    })
  }

  async getPastEventsForHub(extraTopics: Array<Hex | Hex[] | null>, options: FilterBlocks, names: EventName[] = ActiveManagerEvents): Promise<EventData[]> {
    return await this._getPastEventsPaginated(this.relayHubInstance, names, extraTopics, options)
  }

  async getPastEventsForRegistrar(extraTopics: Array<Hex | Hex[] | null>, options: FilterBlocks, names: EventName[] = [RelayServerRegistered]): Promise<EventData[]> {
    return await this._getPastEventsPaginated(this.relayRegistrar, names, extraTopics, options)
  }

  async getPastEventsForStakeManager(names: EventName[], extraTopics: Array<Hex | Hex[] | null>, options: FilterBlocks): Promise<EventData[]> {
    const stakeManager = this.stakeManagerInstance
    return await this._getPastEventsPaginated(stakeManager, names, extraTopics, options)
  }

  async getPastEventsForPenalizer(names: EventName[], extraTopics: Array<Hex | Hex[] | null>, options: FilterBlocks): Promise<EventData[]> {
    return await this._getPastEventsPaginated(this.penalizerInstance, names, extraTopics, options)
  }

  getLogsPagesForRange(fromBlock: bigint = 1n, toBlock?: bigint): {
    rangeSize: bigint
    pagesForRange: bigint
  } {
    if (this.maxPageSize === Number.MAX_SAFE_INTEGER) {
      return {
        rangeSize: 1n,
        pagesForRange: 1n
      }
    }
    if (toBlock == null) {
      // Can't calculate without toBlock
      return { rangeSize: 0n, pagesForRange: 1n }
    }
    const rangeSize = toBlock - fromBlock + 1n
    const pagesForRange = (rangeSize + BigInt(this.maxPageSize) - 1n) / BigInt(this.maxPageSize)

    if (pagesForRange > 1n) {
      this.logger.info(`Splitting request for ${rangeSize} blocks into ${pagesForRange} smaller paginated requests!`)
    }
    return {
      rangeSize,
      pagesForRange
    }
  }

  splitRange(fromBlock: bigint, toBlock: bigint, parts: bigint): Array<{
    fromBlock: bigint
    toBlock: bigint
  }> {
    if (parts <= 1n) {
      return [{ fromBlock, toBlock }]
    }
    const rangeSize = toBlock - fromBlock + 1n
    const splitSize = (rangeSize + parts - 1n) / parts

    const ret: Array<{ fromBlock: bigint, toBlock: bigint }> = []
    for (let b = fromBlock; b <= toBlock; b += splitSize) {
      ret.push({ fromBlock: b, toBlock: toBlock < b + splitSize - 1n ? toBlock : b + splitSize - 1n })
    }
    return ret
  }

  async _getPastEventsPaginated(contract: any, names: EventName[], extraTopics: Array<Hex | Hex[] | null>, options: FilterBlocks): Promise<EventData[]> {
    let toBlock = options.toBlock
    if (toBlock == null || toBlock === 'latest') {
      toBlock = BigInt(await this.getBlockNumber())
    }
    let fromBlock = options.fromBlock
    if (fromBlock == null) {
      fromBlock = 1n
    } else {
      fromBlock = BigInt(fromBlock.toString())
    }

    if (fromBlock > (toBlock as bigint)) {
      return []
    }

    let { pagesForRange: pagesCurrent, rangeSize } = this.getLogsPagesForRange(fromBlock as bigint, toBlock as bigint)

    const relayEventParts: EventData[][] = []
    while (true) {
      const rangeParts = this.splitRange(fromBlock as bigint, toBlock as bigint, pagesCurrent)
      try {
        for (const { fromBlock: partFrom, toBlock: partTo } of rangeParts) {
          let attempts = 0
          while (true) {
            try {
              const pastEvents = await this._getPastEvents(contract, names, extraTopics, { fromBlock: partFrom, toBlock: partTo })
              relayEventParts.push(pastEvents)
              break
            } catch (e: any) {
              attempts++
              if (attempts >= 5) throw e
              await sleep(300)
            }
          }
        }
        break
      } catch (e: any) {
        if (e.message.includes('query returned more than')) {
          pagesCurrent *= 4n
        } else {
          throw e
        }
      }
    }
    return relayEventParts.flat()
  }

  async _getPastEvents(contract: any, names: EventName[], extraTopics: Array<Hex | Hex[] | null>, options: FilterBlocks): Promise<EventData[]> {
    const eventsAbi = contract.abi.filter((item: any) => item.type === 'event' && names.includes(item.name))

    const logs = await this.client.getLogs({
      address: contract.address,
      fromBlock: options.fromBlock as bigint,
      toBlock: options.toBlock as bigint,
      event: eventsAbi.length === 1 ? parseAbiItem(`event ${eventsAbi[0].name}(...)`) as any : undefined,
    })

    return parseEventLogs({
      abi: contract.abi,
      logs: logs,
      eventName: names
    }) as unknown as EventData[]
  }

  async getBalance(address: Address, defaultBlock: any = 'latest'): Promise<bigint> {
    return await this.client.getBalance({ address, blockTag: defaultBlock })
  }

  async getBlockNumberRightNow(): Promise<bigint> {
    return await this.client.getBlockNumber()
  }

  async getBlockNumber(): Promise<bigint> {
    let blockNumber = -1n
    let attempts = 0
    while (blockNumber < this.lastBlockNumber && attempts <= 10) {
      try {
        blockNumber = await this.getBlockNumberRightNow()
      } catch (e: any) {
        this.logger.error(`getBlockNumber: ${e.message}`)
      }
      if (blockNumber >= this.lastBlockNumber) {
        break
      }
      await sleep(1000)
      attempts++
    }
    if (blockNumber < this.lastBlockNumber) {
      throw new Error(`couldn't retrieve latest blockNumber. last block: ${this.lastBlockNumber}, got block: ${blockNumber}`)
    }
    this.lastBlockNumber = blockNumber
    return blockNumber
  }

  async sendSignedTransaction(rawTx: Hex): Promise<Hex> {
    return await this.client!.sendRawTransaction({ serializedTransaction: rawTx })
  }

  async estimateGas(transactionDetails: any): Promise<bigint> {
    return await this.client.estimateGas({
      account: transactionDetails.from,
      to: transactionDetails.to,
      data: transactionDetails.data,
      value: transactionDetails.value ? BigInt(transactionDetails.value) : undefined
    })
  }

  async estimateInnerCallGasLimit(gsnTransactionDetails: GsnTransactionDetails): Promise<bigint> {
    const originalGasEstimation = await this.estimateGas(gsnTransactionDetails)
    const calldataGasCost = await this.calculateCalldataGasUsed(gsnTransactionDetails.data as Hex, this.environment, 1, this.client)
    const adjustedEstimation = originalGasEstimation - BigInt(calldataGasCost)
    if (adjustedEstimation < 0n) {
      throw new Error(`estimateGasWithoutCalldata: calldataGasCost(${calldataGasCost}) exceeded originalGasEstimation(${originalGasEstimation})`)
    }
    return adjustedEstimation
  }

  async getGasAndDataLimitsFromPaymaster(paymaster: Address): Promise<any> {
    try {
      const paymasterContract = this._createPaymaster(paymaster)
      return await paymasterContract.read.getGasAndDataLimits()
    } catch (e: any) {
      const error = e as Error
      const message = `not a valid paymaster contract: ${paymaster} ${error.message}`
      throw new Error(message)
    }
  }

  async estimateCalldataCostForRequest(
    relayRequestOriginal: RelayRequest,
    variableFieldSizes: { maxApprovalDataLength: number, maxPaymasterDataLength: number }
  ): Promise<Hex> {
    const relayRequest: RelayRequest =
      Object.assign(
        {}, relayRequestOriginal,
        {
          relayData: Object.assign({}, relayRequestOriginal.relayData)
        })
    relayRequest.relayData.transactionCalldataGasUsed = '0xffffffffff'
    relayRequest.relayData.paymasterData = ('0x' + 'ff'.repeat(variableFieldSizes.maxPaymasterDataLength)) as Hex
    const maxAcceptanceBudget = '0xffffffffff'
    const signature = ('0x' + 'ff'.repeat(65)) as Hex
    const approvalData = ('0x' + 'ff'.repeat(variableFieldSizes.maxApprovalDataLength)) as Hex
    const encodedData = this.encodeABI({
      domainSeparatorName: this.domainSeparatorName,
      relayRequest,
      signature,
      approvalData,
      maxAcceptanceBudget
    })
    const calculatedCalldataGasUsed = await this.calculateCalldataGasUsed(encodedData, this.environment, this.calldataEstimationSlackFactor, this.client)
    return `0x${calculatedCalldataGasUsed.toString(16)}`
  }

  async calculateChargeWithRelayHub(
    gas: bigint,
    relayData: any,
    txDetails: any): Promise<bigint> {
    return await this.relayHubInstance.read.calculateCharge([gas, relayData], {
      account: txDetails.from,
      gas: txDetails.gasLimit,
    })
  }

  async getGasPrice(): Promise<bigint> {
    const gasPriceFromNode = await this.client.getGasPrice()
    if (!this.environment.getGasPriceFactor) {
      return gasPriceFromNode
    }
    return (gasPriceFromNode * BigInt(this.environment.getGasPriceFactor))
  }

  async getFeeHistory(blockCount: any, lastBlock: any, rewardPercentiles: number[]): Promise<FeeHistoryResult> {
    const history = await this.client.getFeeHistory({
      blockCount: Number(blockCount),
      blockTag: lastBlock,
      rewardPercentiles
    })
    return history as unknown as FeeHistoryResult
  }

  async getGasFees(
    blockCount: number,
    rewardPercentile: number
  ): Promise<{ baseFeePerGas: bigint, priorityFeePerGas: bigint }> {
    if (this.transactionType === TransactionType.LEGACY) {
      const gasPrice = await this.getGasPrice()
      return { baseFeePerGas: gasPrice, priorityFeePerGas: gasPrice }
    }
    const networkHistoryFees = await this.getFeeHistory(blockCount, 'pending', [rewardPercentile])
    const baseFeePerGas = BigInt(networkHistoryFees.baseFeePerGas[0])
    // Calculate average priority fee
    const rewards = networkHistoryFees.reward!.flat().map(r => BigInt(r))
    const priorityFeePerGas = averageBN(rewards)
    return { baseFeePerGas, priorityFeePerGas }
  }

  async getTransactionCount(address: Address, defaultBlock?: any): Promise<number> {
    return await this.client.getTransactionCount({ address, blockTag: defaultBlock })
  }

  async getTransaction(transactionHash: Hex): Promise<any | null> {
    return await this.client.getTransaction({ hash: transactionHash })
  }

  async getBlock(blockHashOrBlockNumber: any): Promise<any> {
    if (typeof blockHashOrBlockNumber === 'string' && blockHashOrBlockNumber.startsWith('0x')) {
      if (blockHashOrBlockNumber.length === 66) {
        return await this.client.getBlock({ blockHash: blockHashOrBlockNumber as Hex })
      }
    }
    return await this.client.getBlock({ blockTag: blockHashOrBlockNumber })
  }

  validateAddress(address: string, exceptionTitle = 'invalid address:'): void {
    if (!isAddress(address)) { throw new Error(exceptionTitle + ' ' + address) }
  }

  async getCode(address: Address): Promise<Hex | undefined> {
    return await this.client.getBytecode({ address })
  }

  async isContractDeployed(address: Address): Promise<boolean> {
    const code = await this.getCode(address)
    return code !== undefined && code !== '0x'
  }

  async workerToManager(worker: Address): Promise<Address> {
    return await this.relayHubInstance.read.getWorkerManager([worker])
  }

  async getMinimumStakePerToken(tokenAddress: Address): Promise<bigint> {
    return await this.relayHubInstance.read.getMinimumStakePerToken([tokenAddress])
  }

  async hubBalanceOf(address: Address): Promise<bigint> {
    return await this.relayHubInstance.read.balanceOf([address])
  }

  async getStakeInfo(managerAddress: Address): Promise<StakeInfo> {
    const result = await this.stakeManagerInstance.read.getStakeInfo([managerAddress]) as any
    return result[0] as unknown as StakeInfo
  }

  async isRelayManagerStakedOnHub(relayManager: Address): Promise<ManagerStakeStatus> {
    try {
      await this.relayHubInstance.read.verifyRelayManagerStaked([relayManager])
      return { isStaked: true, errorMessage: null }
    } catch (e: any) {
      return { isStaked: false, errorMessage: e.message }
    }
  }

  async initDeployment(deployment: GSNContractsDeployment): Promise<void> {
    this.deployment = deployment
    await this._initializeContracts()
  }

  getDeployment(): GSNContractsDeployment {
    if (this.deployment == null) {
      throw new Error('Contracts deployment is not initialized for Contract Interactor!')
    }
    return this.deployment
  }

  async broadcastTransaction(signedTransaction: Hex): Promise<Hex> {
    return await this.client.sendRawTransaction({ serializedTransaction: signedTransaction })
  }

  async hubDepositFor(paymaster: Address, transactionDetails: any): Promise<Hex> {
    return await this.client!.writeContract({
      address: this.relayHubInstance.address,
      abi: this.relayHubInstance.abi,
      functionName: 'depositFor',
      args: [paymaster],
      value: transactionDetails.value ? BigInt(transactionDetails.value) : 0n,
      chain: null,
      account: this.client?.account ?? null
    })
  }

  async resolveDeploymentVersions(): Promise<ObjectMap<string>> {
    const versionsMap: ObjectMap<string> = {}
    if (this.deployment.relayHubAddress != null) {
      versionsMap[this.deployment.relayHubAddress] = await this.relayHubInstance.read.versionHub()
    }
    if (this.deployment.penalizerAddress != null) {
      versionsMap[this.deployment.penalizerAddress] = await this.penalizerInstance.read.versionPenalizer()
    }
    if (this.deployment.stakeManagerAddress != null) {
      versionsMap[this.deployment.stakeManagerAddress] = await this.stakeManagerInstance.read.versionSM()
    }
    return versionsMap
  }

  async queryDeploymentBalances(): Promise<ObjectMap<bigint>> {
    const balances: ObjectMap<bigint> = {}
    if (this.deployment.relayHubAddress != null) {
      balances[this.deployment.relayHubAddress] = await this.getBalance(this.deployment.relayHubAddress)
    }
    if (this.deployment.penalizerAddress != null) {
      balances[this.deployment.penalizerAddress] = await this.getBalance(this.deployment.penalizerAddress)
    }
    if (this.deployment.stakeManagerAddress != null) {
      balances[this.deployment.stakeManagerAddress] = await this.getBalance(this.deployment.stakeManagerAddress)
    }
    return balances
  }

  private async _hubStakeManagerAddress(): Promise<Address> {
    return await this.relayHubInstance.read.getStakeManager()
  }

  stakeManagerAddress(): Address {
    return this.stakeManagerInstance.address
  }

  private async _hubPenalizerAddress(): Promise<Address> {
    return await this.relayHubInstance.read.getPenalizer()
  }

  private async _hubRelayRegistrarAddress(): Promise<Address> {
    return await this.relayHubInstance.read.getRelayRegistrar()
  }

  penalizerAddress(): Address {
    return this.penalizerInstance.address
  }

  async getRelayRegistrationMaxAge(): Promise<bigint> {
    return await this.relayRegistrar.read.getRelayRegistrationMaxAge()
  }

  async getRelayInfo(relayManagerAddress: Address): Promise<RegistrarRelayInfo> {
    const relayInfo = await this.relayRegistrar.read.getRelayInfo([this.relayHubInstance.address, relayManagerAddress])
    return Object.assign({}, relayInfo, { relayUrl: packRelayUrlForRegistrar(relayInfo.urlParts) })
  }

  async getRegisteredRelays(): Promise<RegistrarRelayInfo[]> {
    if (this.relayRegistrar == null) {
      throw new Error('Relay Registrar is not initialized')
    }
    const relayHub = this.relayHubInstance.address
    const relayInfos = await this.relayRegistrar.read.readRelayInfos([relayHub])

    return relayInfos.map((info: any) => {
      return Object.assign({}, info, {
        relayUrl: packRelayUrlForRegistrar(info.urlParts)
      })
    })
  }

  async getCreationBlockFromRelayHub(): Promise<bigint> {
    return await this.relayHubInstance.read.getCreationBlock()
  }

  async getRegisteredWorkers(managerAddress: Address): Promise<Address[]> {
    const topics = address2topic(managerAddress)
    const workersAddedEvents = await this.getPastEventsForHub([topics as Hex], { fromBlock: 1n }, [RelayWorkersAdded])
    return workersAddedEvents.map(it => (it as any).args.newRelayWorkers).flat()
  }
}
