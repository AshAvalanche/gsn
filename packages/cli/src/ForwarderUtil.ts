import { type WalletClient, type PublicClient, type Address, type Hex, type Account, type Client, type PublicActions, type WalletActions } from 'viem'
import { GsnDomainSeparatorType, GsnRequestType, type LoggerInterface } from '@opengsn/common'

export async function registerForwarderForGsn(
  domainSeparatorName: string,
  forwarderAddress: Address,
  forwarderAbi: any[],
  walletClient: Client & PublicActions & WalletActions,
  publicClient: Client & PublicActions & WalletActions,
  logger?: LoggerInterface,
  from?: Address | Account
): Promise<void> {
  const account = from ?? walletClient.account
  if (!account) {
    throw new Error('registerForwarderForGsn: No account provided or found in walletClient')
  }

  logger?.info(`Registering request type ${GsnRequestType.typeName} with suffix: ${GsnRequestType.typeSuffix}`)
  const hash1 = await walletClient.writeContract({
    address: forwarderAddress,
    abi: forwarderAbi,
    functionName: 'registerRequestType',
    args: [GsnRequestType.typeName, GsnRequestType.typeSuffix],
    account,
    chain: null
  } as any)
  logger?.debug(`Transaction broadcast: ${hash1}`)
  await publicClient.waitForTransactionReceipt({ hash: hash1 })

  logger?.info(`Registering domain separator ${domainSeparatorName} with version: ${GsnDomainSeparatorType.version}`)
  const hash2 = await walletClient.writeContract({
    address: forwarderAddress,
    abi: forwarderAbi,
    functionName: 'registerDomainSeparator',
    args: [domainSeparatorName, GsnDomainSeparatorType.version],
    account,
    chain: null
  } as any)
  logger?.debug(`Transaction broadcast: ${hash2}`)
  await publicClient.waitForTransactionReceipt({ hash: hash2 })
}

