import commander from 'commander'
import { gsnCommander, saveDeployment, showDeployment, getServerConfig } from '../utils'
import { GsnTestEnvironment } from '../GsnTestEnvironment'
import { createCommandsLogger } from '@opengsn/logger/dist/CommandsWinstonLogger'
import { type ServerConfigParams } from '@opengsn/relay/dist/ServerConfigParams'
import fs from 'fs'

gsnCommander(['n', 'm'])
  .option('-w, --workdir <directory>', 'relative work directory (defaults to build/gsn/)', 'build/gsn')
  .option('--relayUrl <url>', 'url to advertise the relayer', 'http://127.0.0.1/')
  .option('--port <number>', 'a port for the relayer to listen on. By default, relay will find random available port')
  .option('-c, --config <string>', 'path to a json file containing the relay server configuration')
  .parse(process.argv);

(async () => {
  const logger = createCommandsLogger(commander.loglevel)
  const network: string = commander.network
  const localRelayUrl: string = commander.relayUrl
  let port: number | undefined
  if (commander.port != null) {
    port = parseInt(commander.port)
    if (isNaN(port)) {
      throw new Error('port is NaN')
    }
  }
  const mnemonic: string = commander.mnemonic
  const derivationPath: string = commander.derivationPath
  const derivationIndex: string = commander.derivationIndex
  const privateKey: string = commander.privateKeyHex

  let customConfig: Partial<ServerConfigParams> = {}
  if (commander.config != null) {
    customConfig = getServerConfig(commander.config)
  }

  const env = await GsnTestEnvironment.startGsn(network, localRelayUrl, port, logger, true, customConfig, mnemonic, derivationPath, derivationIndex, privateKey)
  saveDeployment(env.contractsDeployment, commander.workdir)
  showDeployment(env.contractsDeployment, 'GSN started', logger, undefined)

  logger.info(`Relay is active, URL = ${env.relayUrl} . Press Ctrl-C to abort`)
})().catch(
  reason => {
    console.error(reason)
    process.exit(1)
  }
)
