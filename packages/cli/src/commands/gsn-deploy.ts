import commander from 'commander'
import { parseGwei, toHex, type Address } from 'viem'
import { CommandsLogic } from '../CommandsLogic'
import {
  getMnemonic,
  getNetworkUrl,
  getRelayHubConfiguration,
  gsnCommander,
  saveDeployment,
  showDeployment
} from '../utils'
import { createCommandsLogger } from '@opengsn/logger/dist/CommandsWinstonLogger'
import { type Environment, environments, EnvironmentsKeys } from '@opengsn/common'

gsnCommander(['n', 'f', 'm', 'g', 'l'])
  .option('-w, --workdir <directory>', 'relative work directory (defaults to build/gsn/)', 'build/gsn')
  .option('--forwarder <address>', 'address of forwarder deployed to the current network (optional; deploys new one by default)')
  .option('--stakeManager <address>', 'stakeManager')
  .option('--relayHub <address>', 'relayHub')
  .option('--penalizer <address>', 'penalizer')
  .option('--relayRegistrar <address>', 'relayRegistrar')
  .option('--environmentName <string>', `name of one of the GSN supported environments: (${Object.keys(EnvironmentsKeys).toString()}; default: ethereumMainnet)`, EnvironmentsKeys.ethereumMainnet)
  .requiredOption('--burnAddress <string>', 'address to transfer burned stake tokens into')
  .requiredOption('--devAddress <string>', 'address to transfer abandoned stake tokens into')
  .option('--stakingToken <string>', 'default staking token to use')
  .option('--minimumTokenStake <number>', 'minimum staking value', '1')
  .option('--yes, --skipConfirmation', 'skip confirmation message for deployment transaction')
  .option('--testToken', 'deploy test weth token', false)
  .option('--testPaymaster', 'deploy test paymaster (accepts everything, avoid on main-nets)', false)
  .option('-c, --config <path>', 'config JSON file to change the configuration of the RelayHub being deployed (optional)')
  .parse(process.argv);

(async () => {
  const network: string = commander.network
  const nodeURL = getNetworkUrl(network)
  const environment: Environment = environments[commander.environmentName as EnvironmentsKeys]
  if (environment == null) {
    throw new Error(`Unknown named environment: ${commander.environmentName as string}`)
  }
  console.log('Using environment: ', JSON.stringify(environment))

  const logger = createCommandsLogger(commander.loglevel)
  const mnemonic = getMnemonic(commander.mnemonic)
  const relayHubConfiguration = getRelayHubConfiguration(commander.config) ?? environment.relayHubConfiguration
  const penalizerConfiguration = environment.penalizerConfiguration
  const logic = new CommandsLogic(nodeURL, logger, {}, mnemonic, commander.derivationPath, commander.derivationIndex, commander.privateKeyHex)
  await logic.init()
  const from = commander.from ?? await logic.findWealthyAccount()

  const gasPrice = commander.gasPrice != null
    ? toHex(parseGwei(commander.gasPrice))
    : toHex(await logic.getGasPrice())
  const gasLimit = commander.gasLimit

  if (commander.testToken === (commander.stakingToken != null)) {
    throw new Error('must specify either --testToken or --stakingToken')
  }

  const deploymentResult = await logic.deployGsnContracts({
    from: from as Address,
    gasPrice,
    gasLimit,
    relayHubConfiguration,
    penalizerConfiguration,
    stakingTokenAddress: commander.stakingToken as Address,
    minimumTokenStake: commander.minimumTokenStake,
    deployPaymaster: commander.testPaymaster,
    deployTestToken: commander.testToken,
    verbose: true,
    skipConfirmation: commander.skipConfirmation,
    forwarderAddress: commander.forwarder as Address,
    stakeManagerAddress: commander.stakeManager as Address,
    relayHubAddress: commander.relayHub as Address,
    penalizerAddress: commander.penalizer as Address,
    relayRegistryAddress: commander.relayRegistrar as Address,
    burnAddress: commander.burnAddress as Address,
    devAddress: commander.devAddress as Address
  })
  const paymasterName = 'Default'

  showDeployment(deploymentResult, `Deployed GSN to network: ${network}`, console, paymasterName)
  saveDeployment(deploymentResult, commander.workdir)
  process.exit(0)
})().catch(
  reason => {
    console.error(reason)
    process.exit(1)
  }
)
