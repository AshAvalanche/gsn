import commander from 'commander'
import fs from 'fs'
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts'
import { parseGwei, toHex, type Hex } from 'viem'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { Contract } from '@ethersproject/contracts'

import {
  type Address,
  type LoggerInterface
} from '@opengsn/common'

import { type GSNConfig, type GSNDependencies, type GSNUnresolvedConstructorInput, RelayProvider } from '@opengsn/provider'
import { createCommandsLogger } from '@opengsn/logger/dist/CommandsWinstonLogger'

import { getMnemonic, getNetworkUrl, gsnCommander } from '../utils'
import { CommandsLogic } from '../CommandsLogic'

function commaSeparatedList(value: string, _dummyPrevious: string[]): string[] {
  return value.split(',')
}

gsnCommander(['n', 'f', 'm', 'g', 'l'])
  .option('--directCall', 'whether to run transaction with relay or directly', false)
  .option('--abiFile <string>', 'path to an ABI truffle artifact JSON file')
  .option('--method <string>', 'method name to execute')
  .option('--methodParams <items>', 'comma separated args list', commaSeparatedList)
  .option('--calldata <string>', 'exact calldata to use')
  .option('--to <string>', 'target RelayRecipient contract')
  .option('--paymaster <string>', 'the Paymaster contract to be used')
  .parse(process.argv)

async function getProvider(
  to: Address,
  paymaster: Address,
  mnemonic: string | undefined,
  logger: LoggerInterface,
  host: string): Promise<{ provider: any, from: Address }> {
  const config: Partial<GSNConfig> = {
    clientId: '0',
    paymasterAddress: paymaster
  }
  let from: Address
  let privateKey: Hex | undefined
  if (commander.from != null) {
    from = commander.from
    console.log('using', from)
  } else if (mnemonic != null) {
    const account = mnemonicToAccount(mnemonic)
    from = account.address
    privateKey = account.getHdKey().privateKey != null
      ? `0x${Buffer.from(account.getHdKey().privateKey!).toString('hex')}` as Hex
      : undefined
    console.log('mnemonic account:', from)
  } else {
    throw new Error('must specify either "--mnemonic" or pass "--from" account')
  }
  if (commander.directCall === true) {
    // For direct calls, use a plain ethers provider (compatible with web3 contract interface)
    const provider = new StaticJsonRpcProvider(host)
    return { provider: provider as any, from }
  } else {
    if (paymaster == null) {
      throw new Error('--paymaster: address not specified')
    }
    const overrideDependencies: Partial<GSNDependencies> = {
      logger
    }
    const ethersProvider = new StaticJsonRpcProvider(host)
    const input: GSNUnresolvedConstructorInput = {
      provider: ethersProvider,
      config,
      overrideDependencies
    }
    const relayProvider = await RelayProvider.newWeb3Provider(input)
    if (privateKey != null) {
      relayProvider.addAccount(privateKey)
    }
    return {
      provider: relayProvider,
      from
    }
  }
}

(async () => {
  const network: string = commander.network
  const nodeURL = getNetworkUrl(network)
  const logger = createCommandsLogger(commander.loglevel)
  const mnemonic = getMnemonic(commander.mnemonic)
  const logic = new CommandsLogic(nodeURL, logger, {}, mnemonic, commander.derivationPath, commander.derivationIndex, commander.privateKeyHex)
  await logic.init()

  const { provider, from } = await getProvider(
    commander.to,
    commander.paymaster,
    mnemonic,
    logger,
    nodeURL
  )
  if (commander.abiFile == null || !fs.existsSync(commander.abiFile)) {
    const file: string = commander.abiFile
    throw new Error(`--abiFile: ABI file ${file} does not exist`)
  }
  const abiJson = JSON.parse(fs.readFileSync(commander.abiFile, 'utf8'))
  if (commander.to == null) {
    throw new Error('--to: target address is missing')
  }
  const contract = new Contract(commander.to, abiJson, provider.getSigner(from))

  const calldata = commander.calldata
  const methodName: string = commander.method
  if (calldata != null && methodName != null) {
    throw new Error('Cannot pass both --calldata and --method')
  }
  if (calldata == null && methodName == null) {
    throw new Error('Must pass either --calldata or --method')
  }

  const method = contract[methodName]
  if (method == null) {
    throw new Error(`Method (${methodName}) is not found on contract`)
  }
  const methodParams = commander.methodParams

  const gasPrice = commander.gasPrice != null
    ? toHex(parseGwei(commander.gasPrice))
    : toHex(await logic.getGasPrice())
  const gas = commander.gasLimit

  const tx = await method(...methodParams, {
    gasLimit: gas,
    gasPrice
  })
  console.log(tx)
  const receipt = await tx.wait()
  console.log(receipt)

  console.log(JSON.stringify(methodParams))
  console.log(contract.address)
  process.exit(0)
})().catch(
  reason => {
    console.error(reason)
    process.exit(1)
  }
)
