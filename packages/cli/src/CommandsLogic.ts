// @ts-ignore
import io from 'console-read-write'
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  formatGwei,
  toHex,
  parseEther,
  type PublicClient,
  type WalletClient,
  type Hex,
  type Address as ViemAddress,
  type Abi,
  publicActions,
  type PublicActions
} from 'viem'
import { mnemonicToAccount, privateKeyToAccount, type PrivateKeyAccount, type HDAccount } from 'viem/accounts'
import { type GetContractReturnType } from 'viem'


import {
  type Address,
  ContractInteractor,
  type GSNContractsDeployment,
  HttpClient,
  HttpWrapper,
  type IntString,
  type LoggerInterface,
  type PenalizerConfiguration,
  type RelayHubConfiguration,
  constants,
  defaultEnvironment,
  ether,
  formatTokenAmount,
  isSameAddress,
  sleep,
  toBN,
  toNumber,
  RelayCallGasLimitCalculationHelper,
  MainnetCalldataGasEstimation,
  type GsnContract
} from '@opengsn/common'
import { defaultGsnConfig } from '@opengsn/provider'

// compiled folder populated by "preprocess"
import StakeManager from './compiled/StakeManager.json'
import RelayHub from './compiled/RelayHub.json'
import RelayRegistrar from './compiled/RelayRegistrar.json'
import Penalizer from './compiled/Penalizer.json'
import Paymaster from './compiled/TestPaymasterEverythingAccepted.json'
import Forwarder from './compiled/Forwarder.json'
import TestWrappedNativeToken from './compiled/TestWrappedNativeToken.json'

import { type KeyManager } from '@opengsn/relay/dist/KeyManager'
import { type ServerConfigParams } from '@opengsn/relay/dist/ServerConfigParams'

import { registerForwarderForGsn } from './ForwarderUtil'

export interface RegisterOptions {
  /** ms to sleep if waiting for RelayServer to set its owner */
  sleepMs: number
  /** number of times to sleep before timeout */
  sleepCount: number
  from: Address
  token?: Address
  gasPrice?: bigint
  stake: string
  wrap: boolean
  funds: string | bigint
  relayUrl: string
  unstakeDelay: string
}

export interface WithdrawOptions {
  withdrawAmount: bigint
  keyManager: KeyManager
  config: ServerConfigParams
  broadcast: boolean
  gasPrice?: bigint
  withdrawTarget?: Address
  useAccountBalance: boolean
}

interface DeployOptions {
  from: Address
  gasPrice: string
  gasLimit: number | IntString
  deployPaymaster?: boolean
  forwarderAddress?: Address
  relayHubAddress?: Address
  relayRegistryAddress?: Address
  stakeManagerAddress?: Address
  deployTestToken?: boolean
  stakingTokenAddress?: Address
  minimumTokenStake: number | IntString
  penalizerAddress?: Address
  burnAddress?: Address
  devAddress?: Address
  verbose?: boolean
  skipConfirmation?: boolean
  relayHubConfiguration: RelayHubConfiguration
  penalizerConfiguration: PenalizerConfiguration
}

interface RegistrationResult {
  success: boolean
  transactions?: string[]
  error?: string
}

type WithdrawalResult = RegistrationResult

export interface SendOptions {
  from: string
  gasPrice: number | string | bigint
  gasLimit: number | string | bigint
  value: number | string | bigint
}

export class CommandsLogic {
  private readonly contractInteractor: ContractInteractor
  private readonly httpClient: HttpClient
  private readonly walletClient: WalletClient & PublicActions
  private readonly logger: LoggerInterface
  private account?: HDAccount | PrivateKeyAccount

  private deployment?: GSNContractsDeployment

  constructor(
    host: string,
    logger: LoggerInterface,
    deployment: GSNContractsDeployment,
    mnemonic?: string,
    derivationPath?: string,
    derivationIndex: string = '0',
    privateKey?: string
  ) {
    this.logger = logger
    this.account = undefined

    // Build viem transport
    const transport = http(host, { timeout: 120_000 })

    // Local account (private key or mnemonic)
    this.account = undefined

    // Build account from mnemonic or private key
    let account: HDAccount | PrivateKeyAccount | undefined
    if (mnemonic != null) {
      const index = parseInt(derivationIndex)
      account = mnemonicToAccount(mnemonic, {
        path: `m/44'/60'/0'/0/${index}` as any,
        ...(derivationPath != null ? { path: derivationPath as any } : {})
      })
      this.logger.warn(`Using mnemonic account ${account.address}`)
    } else if (privateKey != null) {
      const pk = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as Hex
      account = privateKeyToAccount(pk)
      this.logger.warn(`Using private key account ${account.address}`)
    }
    this.account = account

    // Build viem wallet client (write + read)
    this.walletClient = createWalletClient({ account, transport }).extend(publicActions) as WalletClient & PublicActions

    this.httpClient = new HttpClient(new HttpWrapper(), logger)
    const maxPageSize = Number.MAX_SAFE_INTEGER
    const environment = defaultEnvironment
    this.contractInteractor = new ContractInteractor({
      client: this.walletClient,
      logger: this.logger,
      deployment,
      maxPageSize,
      environment
    })
    this.deployment = deployment
  }

  async init(): Promise<this> {
    await this.contractInteractor.init()
    return this
  }

  async findWealthyAccount(requiredBalance = parseEther('0.5')): Promise<string> {
    let accounts: readonly ViemAddress[] = []
    const balances: string[] = []
    try {
      accounts = await this.walletClient.getAddresses()
      for (const account of accounts) {
        const balance = await this.walletClient.getBalance({ address: account })
        balances.push(`${account}: ${formatEther(balance)}`)
        if (balance >= requiredBalance) {
          this.logger.info(`Found funded account ${account} balance: ${formatEther(balance)}`)
          return account
        }
      }
    } catch (error: any) {
      this.logger.error(`Failed to retrieve accounts and balances: ${error.toString() as string}`)
    }
    throw new Error(`could not find unlocked account with sufficient balance; all accounts:\n - ${balances.join('\n - ')}`)
  }

  async isRelayReady(relayUrl: string): Promise<boolean> {
    const response = await this.httpClient.getPingResponse(relayUrl)
    return response.ready
  }

  async waitForRelay(relayUrl: string, timeout = 60): Promise<void> {
    this.logger.warn(`Will wait up to ${timeout}s for the relay to be ready`)

    const endTime = Date.now() + timeout * 1000
    while (Date.now() < endTime) {
      let isReady = false
      try {
        isReady = await this.isRelayReady(relayUrl)
      } catch (e: any) {
        this.logger.warn(e.message)
      }
      if (isReady) {
        return
      }
      await sleep(3000)
    }
    throw Error(`Relay not ready after ${timeout}s`)
  }

  async getPaymasterBalance(paymaster: Address): Promise<bigint> {
    if (this.deployment == null) {
      throw new Error('Deployment is not initialized!')
    }
    const bal = await this.contractInteractor.hubBalanceOf(paymaster)
    return BigInt(bal.toString())
  }

  async fundPaymaster(
    from: Address, paymaster: Address, amount: string | bigint
  ): Promise<bigint> {
    if (this.deployment == null) {
      throw new Error('Deployment is not initialized!')
    }
    const currentBalance = await this.contractInteractor.hubBalanceOf(paymaster)
    const targetAmount = BigInt(amount)
    if (currentBalance < targetAmount) {
      const value = (targetAmount - currentBalance)
      await this.contractInteractor.hubDepositFor(paymaster, {
        value,
        from
      })
      return targetAmount
    } else {
      return currentBalance
    }
  }

  async registerRelay(options: RegisterOptions): Promise<RegistrationResult> {
    const transactions: string[] = []
    try {
      this.logger.info(`Registering GSN relayer at ${options.relayUrl}`)

      const gasPrice = toHex(options.gasPrice ?? await this.getGasPrice())
      const sendOptions: any = {
        from: options.from,
        gasLimit: 1e6,
        gasPrice
      }
      const response = await this.httpClient.getPingResponse(options.relayUrl)
        .catch((error: any) => {
          this.logger.error(error)
          throw new Error('could contact not relayer, is it running?')
        })
      if (response.ready) {
        return {
          success: false,
          error: 'Nothing to do. Relayer already registered'
        }
      }
      const chainId = this.contractInteractor.chainId
      if (response.chainId !== chainId.toString()) {
        throw new Error(`wrong chain-id: Relayer on (${response.chainId}) but our provider is on (${chainId})`)
      }
      if (!isSameAddress(response.ownerAddress, options.from)) {
        throw new Error(`Relayer configured with wrong owner: ${response.ownerAddress}, our account: ${options.from}`)
      }
      const relayAddress = response.relayManagerAddress as Address
      const relayHubAddress = response.relayHubAddress as Address
      await this.contractInteractor._resolveDeploymentFromRelayHub(relayHubAddress)

      const relayHub = this.contractInteractor.relayHubInstance
      console.log("relayHub.read?", !!relayHub.read); const stakeManagerAddress = await relayHub.read.getStakeManager()
      const stakeManager = await this.contractInteractor._createStakeManager(stakeManagerAddress)
      const { stake, unstakeDelay, owner, token } = await this.contractInteractor.getStakeInfo(relayAddress as Address)

      let stakingToken = options.token
      if (stakingToken == null) {
        stakingToken = await this._findFirstToken(relayHubAddress) as Hex
      }

      if (!(isSameAddress(token, stakingToken) || isSameAddress(token, constants.ZERO_ADDRESS))) {
        throw new Error(`Cannot use token ${stakingToken}. Relayer already uses token: ${token}`)
      }
      const stakingTokenContract = await this.contractInteractor._createERC20(stakingToken)
      console.log("stakingTokenContract.read?", !!stakingTokenContract.read); const tokenDecimals = await stakingTokenContract.read.decimals()
      const tokenSymbol = await stakingTokenContract.read.symbol()

      const stakeParam = BigInt(Math.floor(toNumber(options.stake) * Math.pow(10, Number(tokenDecimals))))

      const formatToken = (val: any): string => formatTokenAmount(BigInt(val.toString()), Number(tokenDecimals), stakingToken ?? '', tokenSymbol)

      this.logger.info(`current stake= ${formatToken(stake)}`)

      if (owner !== constants.ZERO_ADDRESS && !isSameAddress(owner, options.from)) {
        throw new Error(`Already owned by ${owner}, our account=${options.from}`)
      }

      const bal = await this.contractInteractor.getBalance(relayAddress)
      if (toBN(bal).gt(toBN(options.funds.toString()))) {
        this.logger.info('Relayer already funded')
      } else {
        this.logger.info('Funding relayer')

        const txHash = await this.walletClient.sendTransaction({
          to: relayAddress as ViemAddress,
          value: BigInt(options.funds.toString()),
          chain: null
        } as any)
        transactions.push(txHash)
        await this.walletClient.waitForTransactionReceipt({ hash: txHash })
      }

      if (owner === constants.ZERO_ADDRESS) {
        let i = 0
        while (true) {
          this.logger.debug(`Waiting ${options.sleepMs}ms ${i}/${options.sleepCount} for relayer to set ${options.from} as owner`)
          await sleep(options.sleepMs)
          const newStakeInfo = await this.contractInteractor.getStakeInfo(relayAddress as Address)
          if (newStakeInfo.owner !== constants.ZERO_ADDRESS && isSameAddress(newStakeInfo.owner, options.from)) {
            this.logger.info('RelayServer successfully set its owner on the StakeManager')
            break
          }
          if (options.sleepCount === i++) {
            throw new Error('RelayServer failed to set its owner on the StakeManager')
          }
        }
      }
      if (unstakeDelay >= BigInt(options.unstakeDelay.toString()) &&
        stake >= stakeParam
      ) {
        this.logger.info('Relayer already staked')
      } else {
        console.log("relayHub.read before config?", !!relayHub.read); const config = (await relayHub.read.getConfiguration()) as any
        const minimumStakeForToken = await relayHub.read.getMinimumStakePerToken([stakingToken as any]) as bigint
        if (minimumStakeForToken > BigInt(stakeParam.toString())) {
          throw new Error(`Given stake ${formatToken(stakeParam)} too low for the given hub ${formatToken(minimumStakeForToken)} and token ${stakingToken}`)
        }
        if (minimumStakeForToken === 0n) {
          throw new Error(`Selected token (${stakingToken}) is not allowed in the current RelayHub`)
        }
        if (BigInt(config.minimumUnstakeDelay.toString()) > BigInt(options.unstakeDelay.toString())) {
          throw new Error(`Given minimum unstake delay ${options.unstakeDelay.toString()} too low for the given hub ${config.minimumUnstakeDelay.toString()}`)
        }
        const stakeValue = stakeParam - BigInt(stake.toString())
        this.logger.info(`Staking relayer ${formatToken(stakeValue)}` +
          stake.toString() === '0'
          ? ''
          : ` (already has ${formatToken(stake)})`)

        const tokenBalance = await stakingTokenContract.read.balanceOf([options.from as any]) as bigint
        if (tokenBalance < BigInt(stakeValue.toString()) && options.wrap) {
          this.logger.info(`Wrapping ${formatToken(stakeValue)}`)
          let depositTx: any
          try {
            depositTx = await stakingTokenContract.write.deposit([], {
              ...sendOptions,
              chain: null,
              account: this.getViemAccount(options.from)
            } as any)
          } catch (e) {
            throw new Error('No deposit() method on default token. is it wrapped ETH?')
          }
          transactions.push(depositTx)
          await this.walletClient.waitForTransactionReceipt({ hash: depositTx })
        }

        const currentAllowance = await stakingTokenContract.read.allowance([options.from, stakeManager.address] as any) as bigint
        this.logger.info(`Current allowance: ${formatToken(currentAllowance)}`)
        if (currentAllowance < BigInt(stakeValue.toString())) {
          this.logger.info(`Approving ${formatToken(stakeValue)} to StakeManager`)
          const approveTx = await stakingTokenContract.write.approve([stakeManager.address, stakeValue] as any, {
            ...sendOptions,
            from: options.from,
            chain: null,
            account: this.getViemAccount(options.from)
          } as any)
          // @ts-ignore
          transactions.push(approveTx)
          await this.walletClient.waitForTransactionReceipt({ hash: approveTx })
        }

        const stakeTx = await stakeManager
          .write.stakeForRelayManager([stakingToken, relayAddress, BigInt(options.unstakeDelay), stakeValue] as any, {
            ...sendOptions,
            chain: null,
            account: this.getViemAccount(options.from)
          } as any)
        // @ts-ignore
        transactions.push(stakeTx)
        await this.walletClient.waitForTransactionReceipt({ hash: stakeTx })
      }

      try {
        await relayHub.read.verifyRelayManagerStaked([relayAddress as any])
        this.logger.info('Relayer already authorized')
      } catch (e: any) {
        if (e.message.match(/not authorized/) == null) {
          this.logger.info(`verifyRelayManagerStaked reverted with: ${e.message as string}`)
        }
        this.logger.info('Authorizing relayer for hub')
        const authorizeTx = await stakeManager
          .write.authorizeHubByOwner([relayAddress, relayHubAddress] as any, { ...sendOptions, account: this.getViemAccount(options.from) } as any)
        // @ts-ignore
        transactions.push(authorizeTx)
        await this.walletClient.waitForTransactionReceipt({ hash: authorizeTx })
      }

      await this.waitForRelay(options.relayUrl)
      return {
        success: true,
        transactions
      }
    } catch (error: any) {
      this.logger.error(error)
      return {
        success: false,
        transactions,
        error: error.message
      }
    }
  }

  async _findFirstToken(relayHubAddress: Hex): Promise<Hex> {
    // Note: getPastEventsForHub logic in ContractInteractor handles creation block?
    // But we need getCreationBlock explicitly.
    const relayHub = await this.contractInteractor._createRelayHub(relayHubAddress as Address)
    // @ts-ignore
    const fromBlock = await relayHub.read.getCreationBlock()
    const blockNumber = await this.contractInteractor.getBlockNumber()
    const toBlock = Number(fromBlock) + 5000 > Number(blockNumber) ? Number(blockNumber) : Number(fromBlock) + 5000
    const tokens = await this.contractInteractor.getPastEventsForHub([null], {
      fromBlock: BigInt(fromBlock),
      // @ts-ignore
      toBlock: BigInt(toBlock)
    }, ['StakingTokenDataChanged'])
    if (tokens.length === 0) {
      throw new Error(`no registered staking tokens on RelayHub ${relayHubAddress}`)
    }
    return tokens[0].args.token
  }

  async displayManagerBalances(config: ServerConfigParams, keyManager: KeyManager): Promise<void> {
    const relayManager = keyManager.getAddress(0)
    this.logger.info(`relayManager is ${relayManager}`)
    const relayHub = await this.contractInteractor._createRelayHub(config.relayHubAddress as Address)
    const accountBalance = await this.walletClient.getBalance({ address: relayManager as ViemAddress })
    this.logger.info(`Relay manager account balance is ${formatEther(accountBalance)}eth`)
    const hubBalance = await relayHub.read.balanceOf([relayManager])
    this.logger.info(`Relay manager hub balance is ${formatEther(BigInt(hubBalance.toString()))}eth`)
  }

  async withdrawToOwner(options: WithdrawOptions): Promise<WithdrawalResult> {
    const transactions: string[] = []
    try {
      const relayManager = options.keyManager.getAddress(0)
      this.logger.info(`relayManager is ${relayManager}`)
      const relayHub = await this.contractInteractor._createRelayHub(options.config.relayHubAddress as Address)
      console.log("relayHub.read?", !!relayHub.read); const stakeManagerAddress = await relayHub.read.getStakeManager()
      const stakeManager = await this.contractInteractor._createStakeManager(stakeManagerAddress)
      const { owner } = await this.contractInteractor.getStakeInfo(relayManager as Address)
      if (options.config.ownerAddress != null) {
        if (owner.toLowerCase() !== options.config.ownerAddress!.toLowerCase()) {
          throw new Error(`Owner in relayHub ${owner} is different than in server config ${options.config.ownerAddress}`)
        }
      }
      const withdrawTarget = options.withdrawTarget ?? owner

      const nonce = await this.contractInteractor.getTransactionCount(relayManager as Address)
      const gasPrice = toHex(options.gasPrice ?? await this.getGasPrice())
      const gasLimit = 1e5

      if (options.useAccountBalance) {
        const balance = await this.walletClient.getBalance({ address: relayManager as ViemAddress })
        this.logger.info(`Relay manager account balance is ${formatEther(balance)}eth`)
        if (balance < options.withdrawAmount) {
          throw new Error('Relay manager account balance lower than withdrawal amount')
        }
        this.logger.info('Calling in view mode')
        if (options.broadcast) {
          const txHash = await this.walletClient.sendTransaction({
            account: this.getViemAccount(relayManager),
            to: withdrawTarget as ViemAddress,
            value: options.withdrawAmount,
            gas: BigInt(gasLimit),
            gasPrice: BigInt(parseInt(gasPrice, 16)),
            nonce: BigInt(nonce),
            chain: null
          } as any)
          transactions.push(txHash)
        }
      } else {
        const balance = await relayHub.read.balanceOf([relayManager as Address])
        this.logger.info(`Relay manager hub balance is ${formatEther(BigInt(balance.toString()))}eth`)
        if (BigInt(balance.toString()) < options.withdrawAmount) {
          throw new Error('Relay manager hub balance lower than withdrawal amount')
        }

        const { encodeFunctionData } = require('viem')
        const encodedCall = encodeFunctionData({
          abi: relayHub.abi,
          functionName: 'withdraw',
          args: [withdrawTarget, options.withdrawAmount]
        })

        this.logger.info('Calling in view mode')
        // Simulate to check for reverts
        await this.walletClient.simulateContract({
          address: relayHub.address,
          abi: relayHub.abi,
          functionName: 'withdraw',
          args: [withdrawTarget as Address, options.withdrawAmount],
          account: relayManager as Address
        })

        if (options.broadcast) {
          const signedTx = options.keyManager.signTransaction(relayManager, {
            to: options.config.relayHubAddress,
            value: 0,
            gasLimit,
            gasPrice,
            data: Buffer.from(encodedCall.slice(2), 'hex'),
            nonce
          } as any)
          this.logger.info(`signed withdrawal hex tx: ${signedTx.rawTx}`)
          const txHash = await this.contractInteractor.broadcastTransaction(signedTx.rawTx)
          transactions.push(txHash)
        }
      }
      return {
        success: true,
        transactions
      }
    } catch (e: any) {
      this.logger.error(e)
      return {
        success: false,
        transactions,
        error: e.message
      }
    }
  }



  async deployGsnContracts(deployOptions: DeployOptions): Promise<GSNContractsDeployment> {
    const options: Required<SendOptions> = {
      from: deployOptions.from,
      gasLimit: deployOptions.gasLimit,
      value: 0,
      gasPrice: deployOptions.gasPrice
    }

    const rrInstance = await this.getContractInstance(RelayRegistrar, {
      arguments: [
        constants.yearInSec
      ]
    }, deployOptions.relayRegistryAddress, { ...options }, deployOptions.skipConfirmation)
    const sInstance = await this.getContractInstance(StakeManager, {
      arguments: [defaultEnvironment.maxUnstakeDelay, defaultEnvironment.abandonmentDelay, defaultEnvironment.escheatmentDelay, deployOptions.burnAddress, deployOptions.devAddress]
    }, deployOptions.stakeManagerAddress, { ...options }, deployOptions.skipConfirmation)
    const pInstance = await this.getContractInstance(Penalizer, {
      arguments: [
        deployOptions.penalizerConfiguration.penalizeBlockDelay,
        deployOptions.penalizerConfiguration.penalizeBlockExpiration
      ]
    }, deployOptions.penalizerAddress, { ...options }, deployOptions.skipConfirmation)
    const fInstance = await this.getContractInstance(Forwarder, {}, deployOptions.forwarderAddress, { ...options }, deployOptions.skipConfirmation)
    const batchGatewayAddress = constants.ZERO_ADDRESS
    const rInstance = await this.getContractInstance(RelayHub, {
      arguments: [
        sInstance.address,
        pInstance.address,
        batchGatewayAddress,
        rrInstance.address,
        deployOptions.relayHubConfiguration
      ]
    }, deployOptions.relayHubAddress, { ...options }, deployOptions.skipConfirmation)

    if (!isSameAddress(await rInstance.read.getRelayRegistrar() as Address, rrInstance.address)) {
      const tx = await rInstance.write.setRegistrar([rrInstance.address] as any, { chain: null })
      await this.walletClient.waitForTransactionReceipt({ hash: tx })
    }

    let pmInstance: GetContractReturnType | undefined
    if (deployOptions.deployPaymaster ?? false) {
      pmInstance = await this.deployPaymaster({ ...options }, rInstance.address, fInstance, deployOptions.skipConfirmation)
    }

    await registerForwarderForGsn(
      defaultGsnConfig.domainSeparatorName,
      fInstance.address as ViemAddress, // Assuming forwarderAddress refers to fInstance.address
      Forwarder.abi,
      this.walletClient,
      this.walletClient,
      this.logger,
      this.getViemAccount(options.from as Hex)
    )

    let stakingTokenAddress = deployOptions.stakingTokenAddress

    let ttInstance: GetContractReturnType | undefined
    if (deployOptions.deployTestToken ?? false) {
      ttInstance = await this.getContractInstance(TestWrappedNativeToken, {}, undefined, { ...options }, deployOptions.skipConfirmation)
      this.logger.info('Setting minimum stake of 1 TestWeth on Hub')
      const tx = await rInstance.write.setMinimumStakes([[ttInstance.address] as any, [BigInt(1e18)] as any], { chain: null })
      await this.walletClient.waitForTransactionReceipt({ hash: tx })
      stakingTokenAddress = ttInstance.address
    }

    const stakingTokenContract = await this.contractInteractor._createERC20(stakingTokenAddress ?? '0x')
    console.log("stakingTokenContract.read?", !!stakingTokenContract.read); const tokenDecimals = await stakingTokenContract.read.decimals()
    const tokenSymbol = await stakingTokenContract.read.symbol()

    const formatToken = (val: any): string => formatTokenAmount(BigInt(val.toString()), Number(tokenDecimals), stakingTokenAddress ?? '0x', tokenSymbol)

    this.logger.info(`Setting minimum stake of ${formatToken(deployOptions.minimumTokenStake)}`)
    const tx = await rInstance.write.setMinimumStakes([[stakingTokenAddress] as any, [BigInt(deployOptions.minimumTokenStake)] as any], { chain: null })
    await this.walletClient.waitForTransactionReceipt({ hash: tx })
    this.deployment = {
      relayHubAddress: rInstance.address,
      stakeManagerAddress: sInstance.address,
      penalizerAddress: pInstance.address,
      relayRegistrarAddress: rrInstance.address,
      forwarderAddress: fInstance.address,
      managerStakeTokenAddress: stakingTokenAddress,
      paymasterAddress: pmInstance?.address ?? constants.ZERO_ADDRESS
    }

    await this.contractInteractor.initDeployment(this.deployment as any)
    return this.deployment as any
  }

  private async getContractInstance(json: any, constructorArgs: any, address: Address | undefined, options: Required<SendOptions>, skipConfirmation: boolean = false): Promise<GsnContract<Abi>> {
    const contractName: string = json.contractName
    let contractInstance
    if (address == null) {
      if (!skipConfirmation) {
        await this.confirm()
      }
      this.logger.info(`Deploying ${contractName}...`)
      // Uses viem walletClient to deploy
      const args = constructorArgs.arguments ?? []
      const hash = await this.walletClient.deployContract({
        abi: json.abi,
        bytecode: json.bytecode,
        args,
        account: this.getViemAccount(options.from as Hex),
        chain: null,
        gas: BigInt(options.gasLimit),
        gasPrice: BigInt(options.gasPrice)
      })
      this.logger.info(`Transaction broadcast: ${hash}`)
      const receipt = await this.walletClient.waitForTransactionReceipt({ hash })
      if (!receipt.contractAddress) {
        throw new Error(`Failed to deploy ${contractName}: no contract address in receipt`)
      }
      contractInstance = await this.contractInteractor._createContract(receipt.contractAddress, json.abi)
      this.logger.info(`Deployed ${contractName} at address ${contractInstance.address}\n\n`)
    } else {
      this.logger.info(`Using ${contractName} at given address ${address}\n\n`)
      contractInstance = await this.contractInteractor._createContract(address, json.abi)
    }
    return contractInstance
  }

  async deployPaymaster(options: Required<SendOptions>, hub: Address, fInstance: any, skipConfirmation: boolean | undefined): Promise<GsnContract<Abi>> {
    const pmInstance = await this.getContractInstance(Paymaster, {}, undefined, { ...options }, skipConfirmation)
    const tx1 = await pmInstance.write.setRelayHub([hub] as any, { chain: null })
    await this.walletClient.waitForTransactionReceipt({ hash: tx1 })
    const tx2 = await pmInstance.write.setTrustedForwarder([fInstance.address], { chain: null })
    await this.walletClient.waitForTransactionReceipt({ hash: tx2 })
    return pmInstance
  }

  async confirm(): Promise<void> {
    let input
    while (true) {
      console.log('Confirm (yes/no)?')
      input = await io.read()
      if (input === 'yes') {
        return
      } else if (input === 'no') {
        throw new Error('User rejected')
      }
    }
  }

  async getGasPrice(): Promise<bigint> {
    const gasPrice = await this.walletClient.getGasPrice()
    this.logger.info(`Using network gas price of ${formatGwei(gasPrice)}gwei`)
    return gasPrice
  }

  private getViemAccount(address: Address): ViemAddress | HDAccount | PrivateKeyAccount {
    if (this.account != null && isSameAddress(this.account.address, address)) {
      return this.account
    }
    return address as ViemAddress
  }
}
