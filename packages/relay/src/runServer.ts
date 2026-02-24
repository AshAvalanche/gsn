// TODO: convert to 'commander' format
import fs from 'fs'
import chalk from 'chalk'
import { createPublicClient, createWalletClient, Hex, http, publicActions, type PublicClient, type WalletClient, type PublicActions, type WalletActions, type Client } from 'viem'
import { HttpServer } from './HttpServer'
import { RelayServer } from './RelayServer'
import { KeyManager } from './KeyManager'
import { TXSTORE_FILENAME, TxStoreManager } from './TxStoreManager'
import {
  ContractInteractor,
  type Environment,
  EnvironmentsKeys,
  RelayCallGasLimitCalculationHelper,
  VersionsManager,
  gsnRequiredVersion,
  gsnRuntimeVersion
} from '@opengsn/common'
import {
  LoggingProviderMode,
  parseServerConfig,
  resolveReputationManagerConfig,
  resolveServerConfig,
  type ServerConfigParams,
  type ServerDependencies
} from './ServerConfigParams'
import { createServerLogger } from '@opengsn/logger/dist/ServerWinstonLogger'
import { type PenalizerDependencies, PenalizerService } from './penalizer/PenalizerService'
import { TransactionManager } from './TransactionManager'
import { EtherscanCachedService } from './penalizer/EtherscanCachedService'
import { TransactionDataCache, TX_PAGES_FILENAME, TX_STORE_FILENAME } from './penalizer/TransactionDataCache'
import { GasPriceFetcher } from './GasPriceFetcher'
import { ReputationManager, type ReputationManagerConfiguration } from './ReputationManager'
import { REPUTATION_STORE_FILENAME, ReputationStoreManager } from './ReputationStoreManager'
import { Web3MethodsBuilder } from './Web3MethodsBuilder'

function error(err: string): never {
  console.error(err)
  process.exit(1)
}

async function run(): Promise<void> {
  let config: ServerConfigParams
  let client: (Client & PublicActions & WalletActions) | undefined
  let environment: Environment
  let runPenalizer: boolean
  let reputationManagerConfig: Partial<ReputationManagerConfiguration>
  let runPaymasterReputations: boolean
  console.log('Starting GSN Relay Server process...\n')
  try {
    console.log('Parsing server config...\n')
    const conf = await parseServerConfig(process.argv.slice(2), process.env)
    if (conf.ethereumNodeUrl == null) {
      error('missing ethereumNodeUrl')
    }
    const loggingProvider: LoggingProviderMode = conf.loggingProvider ?? LoggingProviderMode.NONE
    conf.environmentName = conf.environmentName ?? EnvironmentsKeys.ethereumMainnet
    client = createWalletClient({
      transport: http(conf.ethereumNodeUrl)
    }).extend(publicActions)

    // TODO: if loggingProvider !== LoggingProviderMode.NONE we could add a custom viem transport interceptor

    console.log('Resolving server config ...\n');
    ({ config, environment } = await resolveServerConfig(conf, client))
    runPenalizer = config.runPenalizer
    console.log('Resolving reputation manager config...\n')
    reputationManagerConfig = resolveReputationManagerConfig(conf)
    runPaymasterReputations = config.runPaymasterReputations
  } catch (e: any) {
    error(e.message)
  }
  const { devMode, workdir } = config
  if (devMode) {
    if (fs.existsSync(`${workdir}/${TXSTORE_FILENAME}`)) {
      fs.unlinkSync(`${workdir}/${TXSTORE_FILENAME}`)
    }
    if (fs.existsSync(`${workdir}/${REPUTATION_STORE_FILENAME}`)) {
      fs.unlinkSync(`${workdir}/${REPUTATION_STORE_FILENAME}`)
    }
    if (fs.existsSync(`${workdir}/${TX_STORE_FILENAME}`)) {
      fs.unlinkSync(`${workdir}/${TX_STORE_FILENAME}`)
    }
    if (fs.existsSync(`${workdir}/${TX_PAGES_FILENAME}`)) {
      fs.unlinkSync(`${workdir}/${TX_PAGES_FILENAME}`)
    }
  }
  console.log('Creating server logger...\n')
  const logger = createServerLogger(config.logLevel, config.loggerUrl, config.loggerUserId)
  console.log('Creating managers...\n')
  const managerKeyManager = new KeyManager(1, `${workdir}/manager`)
  const workersKeyManager = new KeyManager(1, `${workdir}/workers/${config.relayHubAddress}`)
  const txStoreManager = new TxStoreManager({
    workdir,
    autoCompactionInterval: config.dbAutoCompactionInterval
  }, logger)
  console.log(chalk.redBright('Relay worker key manager created. This address is staked and meant only for internal (gsn) usage.' +
    ' Using this address for any other purpose may result in loss of funds.'))
  console.log('Creating interactor...\n')
  const contractInteractor = new ContractInteractor({
    client,
    logger,
    environment,
    calldataEstimationSlackFactor: config.calldataEstimationSlackFactor,
    maxPageSize: config.pastEventsQueryMaxPageSize,
    versionManager: new VersionsManager(gsnRuntimeVersion, config.requiredVersionRange ?? gsnRequiredVersion),
    deployment: {
      relayHubAddress: config.relayHubAddress as Hex,
      managerStakeTokenAddress: config.managerStakeTokenAddress as Hex
    }
  })
  console.log('Initializing interactor...\n')
  await contractInteractor.init()
  const gasLimitCalculator = new RelayCallGasLimitCalculationHelper(
    contractInteractor,
    environment,
    logger
  )
  const resolvedDeployment = contractInteractor.getDeployment()
  const web3MethodsBuilder = new Web3MethodsBuilder(resolvedDeployment)

  console.log('Creating gasPrice fetcher...\n')
  const gasPriceFetcher = new GasPriceFetcher(config.gasPriceOracleUrl, config.gasPriceOraclePath, contractInteractor, logger)
  let reputationManager: ReputationManager | undefined
  if (runPaymasterReputations) {
    console.log('Running paymaster reputation: creating reputation manager ...\n')
    const reputationStoreManager = new ReputationStoreManager({ workdir, inMemory: true }, logger)
    reputationManager = new ReputationManager(reputationStoreManager, logger, reputationManagerConfig)
  }

  const dependencies: ServerDependencies = {
    logger,
    txStoreManager,
    reputationManager,
    managerKeyManager,
    workersKeyManager,
    contractInteractor,
    gasLimitCalculator,
    web3MethodsBuilder,
    gasPriceFetcher
  }
  console.log('Creating Transaction Manager...\n')
  const transactionManager: TransactionManager = new TransactionManager(dependencies, config)

  let penalizerService: PenalizerService | undefined
  if (runPenalizer) {
    console.log('Running Penalizer: creating transaction data cache...\n')
    const transactionDataCache: TransactionDataCache = new TransactionDataCache(logger, config.workdir)

    console.log('Running Penalizer: creating etherscan cached service...\n')
    const txByNonceService = new EtherscanCachedService(config.etherscanApiUrl, config.etherscanApiKey, logger, transactionDataCache)
    const penalizerParams: PenalizerDependencies = {
      transactionManager,
      contractInteractor,
      web3MethodsBuilder,
      txByNonceService
    }
    console.log('Running Penalizer: creating penalizer service...\n')
    penalizerService = new PenalizerService(penalizerParams, logger, config)
    console.log('Running Penalizer: initializing penalizer service...\n')
    await penalizerService.init()
  }
  console.log('Creating relay server...\n')
  const relay = new RelayServer(config, transactionManager, dependencies)
  console.log('Initializing penalizer service...\n')
  await relay.init()
  console.log('Creating http server...\n')
  const httpServer = new HttpServer(config.port, logger, relay, penalizerService)
  httpServer.start()
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run()
