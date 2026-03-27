import { type Hex, parseTransaction, serializeTransaction, type TransactionSerializable, hashTypedData, recoverTypedDataAddress } from 'viem'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'

import {
  type Address,
  type RelayRequest,
  type RLPEncodedTransaction,
  TypedRequestData,
  getEip712Signature,
  isSameAddress,
  removeHexPrefix,
  type PrefixedHexString
} from '@opengsn/common'

import { type GSNConfig } from './GSNConfigurator'
import { type WrappedSigner } from './WrappedProviderTypes'
import { type GsnTransactionConfig } from './RelayProvider'

export interface AccountKeypair {
  privateKey: PrefixedHexString
  address: Address
}

function toAddress(privateKey: PrefixedHexString): Address {
  const account = privateKeyToAccount(privateKey as Hex)
  return account.address as Address
}

export class AccountManager {
  private signer: WrappedSigner
  private readonly accounts: AccountKeypair[] = []
  private readonly config: GSNConfig
  readonly chainId: number

  constructor(signer: WrappedSigner, chainId: number, config: GSNConfig) {
    this.signer = signer
    this.chainId = chainId
    this.config = config
  }

  addAccount(privateKey: PrefixedHexString): AccountKeypair {
    // TODO: backwards-compatibility 101 - remove on next version bump
    // addAccount used to accept AccountKeypair with Buffer in it
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (privateKey.privateKey) {
      console.error('ERROR: addAccount accepts a private key as a prefixed hex string now!')
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      privateKey = `0x${privateKey.privateKey.toString('hex')}`
    }
    const address = toAddress(privateKey)
    const keypair: AccountKeypair = {
      privateKey,
      address
    }
    this.accounts.push(keypair)
    return keypair
  }

  newAccount(): AccountKeypair {
    const privateKey = generatePrivateKey()
    this.addAccount(privateKey)
    const address = toAddress(privateKey)
    return {
      privateKey,
      address
    }
  }

  signMessage(message: string, from: Address): PrefixedHexString {
    const keypair = this.accounts.find(account => isSameAddress(account.address, from))
    if (keypair == null) {
      throw new Error(`Account ${from} not found`)
    }
    const account = privateKeyToAccount(keypair.privateKey as Hex)
    // personalSign equivalent: sign the raw message
    // viem's signMessage expects Uint8Array or string
    const signature = account.signMessage({ message })
    // Return synchronously - but signMessage returns a promise
    throw new Error('signMessage is now async - callers must be updated')
  }

  async signMessageAsync(message: string, from: Address): Promise<PrefixedHexString> {
    const keypair = this.accounts.find(account => isSameAddress(account.address, from))
    if (keypair == null) {
      throw new Error(`Account ${from} not found`)
    }
    const account = privateKeyToAccount(keypair.privateKey as Hex)
    return await account.signMessage({ message })
  }

  async signTransaction(transactionConfig: GsnTransactionConfig, from: Address): Promise<RLPEncodedTransaction> {
    if (transactionConfig.chainId != null && transactionConfig.chainId !== this.chainId) {
      throw new Error(`This provider is initialized for chainId ${this.chainId} but transaction targets chainId ${transactionConfig.chainId}`)
    }
    const privateKey = this.findPrivateKey(from)
    const account = privateKeyToAccount(privateKey as Hex)

    const type: number = transactionConfig.type ?? (transactionConfig.maxFeePerGas == null ? 0 : 2)
    const chainId = transactionConfig.chainId ?? this.chainId

    const txData: TransactionSerializable = type === 2
      ? {
        to: (transactionConfig.to ?? undefined) as Hex | undefined,
        data: (transactionConfig.data ?? '0x') as Hex,
        value: transactionConfig.value != null ? BigInt(transactionConfig.value) : 0n,
        nonce: transactionConfig.nonce != null ? Number(transactionConfig.nonce) : 0,
        gas: transactionConfig.gasLimit != null ? BigInt(transactionConfig.gasLimit) : 0n,
        maxFeePerGas: transactionConfig.maxFeePerGas != null ? BigInt(transactionConfig.maxFeePerGas) : 0n,
        maxPriorityFeePerGas: transactionConfig.maxPriorityFeePerGas != null ? BigInt(transactionConfig.maxPriorityFeePerGas) : 0n,
        chainId,
        type: 'eip1559'
      }
      : {
        to: (transactionConfig.to ?? undefined) as Hex | undefined,
        data: (transactionConfig.data ?? '0x') as Hex,
        value: transactionConfig.value != null ? BigInt(transactionConfig.value) : 0n,
        nonce: transactionConfig.nonce != null ? Number(transactionConfig.nonce) : 0,
        gas: transactionConfig.gasLimit != null ? BigInt(transactionConfig.gasLimit) : 0n,
        gasPrice: transactionConfig.gasPrice != null ? BigInt(transactionConfig.gasPrice) : 0n,
        chainId,
        type: 'legacy'
      }

    const raw = await account.signTransaction(txData)
    const parsed = parseTransaction(raw)
    // @ts-ignore
    return { raw, tx: parsed }
  }

  private findPrivateKey(from: Address): PrefixedHexString {
    const keypair = this.accounts.find(account => isSameAddress(account.address, from))
    if (keypair == null) {
      throw new Error(`Account ${from} not found`)
    }
    return keypair.privateKey
  }

  async signTypedData(typedMessage: Record<string, unknown>, from: Address): Promise<PrefixedHexString> {
    return await this._signWithControlledKey(this.findPrivateKey(from), typedMessage) as PrefixedHexString
  }

  async sign(
    domainSeparatorName: string,
    relayRequest: RelayRequest
  ): Promise<PrefixedHexString> {
    let signature: string
    const forwarder = relayRequest.relayData.forwarder

    const cloneRequest = { ...relayRequest }
    const signedData = new TypedRequestData(
      domainSeparatorName,
      this.chainId,
      forwarder,
      cloneRequest
    )
    const keypair = this.accounts.find(account => isSameAddress(account.address, relayRequest.request.from))
    let rec: Address

    try {
      if (keypair != null) {
        signature = await this._signWithControlledKey(keypair.privateKey, signedData as unknown as Record<string, unknown>)
      } else {
        signature = await this._signWithProvider(signedData)
      }
      // Sanity check only — recover the signer from the typed data signature
      rec = await recoverTypedDataAddress({
        domain: signedData.domain as Record<string, unknown>,
        types: signedData.types as Record<string, readonly { name: string; type: string }[]>,
        primaryType: signedData.primaryType as string,
        message: signedData.message as Record<string, unknown>,
        signature: signature as Hex
      }) as Address
    } catch (error: unknown) {
      throw new Error(`Failed to sign relayed transaction for ${relayRequest.request.from}: ${(error as Error).message}`)
    }
    if (!isSameAddress(relayRequest.request.from.toLowerCase() as Address, rec)) {
      throw new Error(`Internal RelayClient exception: signature is not correct: sender=${relayRequest.request.from}, recovered=${rec}`)
    }
    return signature as PrefixedHexString
  }

  // These methods are extracted to
  // a) allow different implementations in the future, and
  // b) allow spying on Account Manager in tests
  async _signWithProvider(signedData: { domain: unknown; types: unknown; message: unknown }): Promise<string> {
    if (this.signer.signTypedData == null) {
      throw new Error('Signer does not support signTypedData')
    }
    return await this.signer.signTypedData(
      signedData.domain as Record<string, unknown>,
      signedData.types as Record<string, unknown[]>,
      signedData.message as Record<string, unknown>
    )
  }

  async _signWithControlledKey(privateKey: PrefixedHexString, signedData: Record<string, unknown>): Promise<string> {
    const account = privateKeyToAccount(privateKey as Hex)
    return await account.signTypedData({
      domain: (signedData.domain ?? {}) as Record<string, unknown>,
      types: (signedData.types ?? {}) as Record<string, readonly { name: string; type: string }[]>,
      primaryType: (signedData.primaryType ?? '') as string,
      message: (signedData.message ?? {}) as Record<string, unknown>
    })
  }

  getAccounts(): string[] {
    return this.accounts.map(it => it.address)
  }

  switchSigner(signer: WrappedSigner): void {
    this.signer = signer
  }
}
