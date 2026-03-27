import { type Hex, type TransactionSerializable, serializeTransaction, keccak256 } from 'viem'
import { type Address } from '@opengsn/common'

export enum ServerAction {
  REGISTER_SERVER,
  ADD_WORKER,
  RELAY_CALL,
  VALUE_TRANSFER,
  DEPOSIT_WITHDRAWAL,
  PENALIZATION,
  SET_OWNER,
  AUTHORIZE_HUB
}

export interface StoredTransactionMetadata {
  readonly from: Address
  readonly attempts: number
  readonly serverAction: ServerAction
  readonly creationBlock: ShortBlockInfo
  readonly boostBlock?: ShortBlockInfo
  readonly minedBlock?: ShortBlockInfo
}

export interface StoredTransactionSerialized {
  readonly to: Address
  readonly gas: number
  maxFeePerGas: number
  maxPriorityFeePerGas: number
  readonly data: Hex
  readonly nonce: number
  readonly txId: Hex
  readonly value: Hex
  readonly rawSerializedTx: Hex
}

export interface NonceSigner {
  nonceSigner?: {
    nonce: number
    signer: Address
  }
}

export interface ShortBlockInfo {
  hash: Hex
  number: number
  timestamp: number | string
}

export type StoredTransaction = StoredTransactionSerialized & StoredTransactionMetadata & NonceSigner

/**
 * Convert a viem TransactionSerializable + raw signed tx into StoredTransaction format.
 * @param tx - the transaction data (unserialized fields)
 * @param rawTx - the signed, serialized raw transaction hex
 * @param metadata - server-side metadata
 */
export function createStoredTransaction(
  tx: TransactionSerializable,
  rawTx: Hex,
  metadata: StoredTransactionMetadata
): StoredTransaction {
  if (tx.to == null) {
    throw new Error('tx.to must be defined')
  }

  const txId = keccak256(rawTx)

  const details: Partial<StoredTransactionSerialized> = {
    to: tx.to as Address,
    gas: Number(tx.gas ?? 0),
    data: (tx.data ?? '0x') as Hex,
    nonce: Number(tx.nonce ?? 0),
    txId,
    value: (tx.value != null ? `0x${tx.value.toString(16)}` : '0x0') as Hex,
    rawSerializedTx: rawTx
  }

  // Extract gas price fields based on transaction type
  if ('maxFeePerGas' in tx && tx.maxFeePerGas != null) {
    details.maxFeePerGas = Number(tx.maxFeePerGas)
    details.maxPriorityFeePerGas = Number((tx as { maxPriorityFeePerGas?: bigint }).maxPriorityFeePerGas ?? 0n)
  } else if ('gasPrice' in tx && tx.gasPrice != null) {
    details.maxFeePerGas = Number(tx.gasPrice)
    details.maxPriorityFeePerGas = Number(tx.gasPrice)
  }

  return Object.assign({}, details as StoredTransactionSerialized, metadata)
}
