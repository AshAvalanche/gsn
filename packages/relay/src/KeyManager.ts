import { HDKey } from 'viem/accounts'
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'
import { type Hex, type TransactionSerializable, serializeTransaction } from 'viem'

import fs from 'fs'
import ow from 'ow'
import { randomBytes } from 'crypto'

export const KEYSTORE_FILENAME = 'keystore'

export interface SignedTransaction {
  rawTx: Hex
  signedTx: TransactionSerializable
}

export class KeyManager {
  private readonly hdkey: HDKey
  private _privateKeys: Record<Hex, Hex> = {}
  private nonces: Record<string, number> = {}

  /**
   * @param count - # of addresses managed by this manager
   * @param workdir - read seed from keystore file (or generate one and write it)
   * @param seed - if working in memory (no workdir), you can specify a seed - or use randomly generated one.
   */
  constructor(count: number, workdir?: string, seed?: string) {
    ow(count, ow.number)
    if (seed != null && workdir != null) {
      throw new Error('Can\'t specify both seed and workdir')
    }

    if (workdir != null) {
      if (!fs.existsSync(workdir)) {
        fs.mkdirSync(workdir, { recursive: true })
      }
      let genseed: string
      const keyStorePath = workdir + '/' + KEYSTORE_FILENAME
      if (fs.existsSync(keyStorePath)) {
        genseed = JSON.parse(fs.readFileSync(keyStorePath).toString()).seed
      } else {
        genseed = randomBytes(32).toString('hex')
        fs.writeFileSync(keyStorePath, JSON.stringify({ seed: genseed }), { flag: 'w' })
      }
      this.hdkey = HDKey.fromMasterSeed(Buffer.from(genseed, 'hex'))
    } else {
      // no workdir: working in-memory
      let seedBuffer: Buffer
      if (seed == null) {
        seedBuffer = randomBytes(32)
      } else {
        seedBuffer = seed.startsWith('0x') ? Buffer.from(seed.slice(2), 'hex') : Buffer.from(seed, 'hex')
      }
      this.hdkey = HDKey.fromMasterSeed(seedBuffer)
    }

    this.generateKeys(count)
  }

  generateKeys(count: number): void {
    this._privateKeys = {}
    this.nonces = {}
    for (let index = 0; index < count; index++) {
      const derived = this.hdkey.deriveChild(index)
      if (derived.privateKey == null) {
        throw new Error(`Failed to derive private key for index ${index}`)
      }
      const privateKeyHex = `0x${Buffer.from(derived.privateKey).toString('hex')}` as Hex
      const account = privateKeyToAccount(privateKeyHex)
      const address = account.address.toLowerCase() as Hex
      this._privateKeys[address] = privateKeyHex
      this.nonces[index] = 0
    }
  }

  getAddress(index: number): Hex {
    return this.getAddresses()[index]
  }

  getAddresses(): Hex[] {
    return Object.keys(this._privateKeys) as Hex[]
  }

  isSigner(signer: Hex): boolean {
    return this._privateKeys[signer.toLowerCase() as Hex] != null
  }

  async signTransaction(signer: Hex, tx: TransactionSerializable): Promise<SignedTransaction> {
    ow(signer, ow.string)
    const privateKey = this._privateKeys[signer.toLowerCase() as Hex]
    if (privateKey === undefined) {
      throw new Error(`Can't sign: signer=${signer} is not managed`)
    }
    const account = privateKeyToAccount(privateKey)
    const rawTx = await account.signTransaction(tx)
    return { rawTx, signedTx: tx }
  }
}
