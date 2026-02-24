import { type Hex, serializeTransaction, keccak256, type TransactionSerializable } from 'viem'
import { signatureRSV2Hex } from '@opengsn/common'

export function getDataAndSignature(tx: TransactionSerializable, chainId?: number): { data: Hex, signature: Hex } {
  if (tx.r == null || tx.s == null) {
    throw new Error('tx signature must be defined')
  }

  // To get the unsigned transaction, we serialize without the signature fields
  const unsignedTx = serializeTransaction({
    ...tx,
    r: undefined,
    s: undefined,
    v: undefined,
    yParity: undefined
  } as TransactionSerializable)

  let vInt = tx.v != null ? Number(tx.v) : tx.yParity != null ? tx.yParity : 0
  const actualChainId = tx.chainId ?? chainId

  if (vInt > 28 && actualChainId != null) {
    vInt -= actualChainId * 2 + 8
  }

  const signature = signatureRSV2Hex(tx.r, tx.s, vInt)
  return {
    data: unsignedTx,
    signature
  }
}

export function signedTransactionToHash(signedTransaction: Hex): Hex {
  return keccak256(signedTransaction)
}
