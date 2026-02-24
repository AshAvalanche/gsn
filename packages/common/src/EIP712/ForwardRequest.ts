import { type Address, type IntString, type PrefixedHexString } from '../types/Aliases'

type addresses = 'from' | 'to'
type data = 'data'
type intStrings = 'value' | 'nonce' | 'gas' | 'validUntilTime'

export type ForwardRequest = Record<addresses, Address> & Record<data, PrefixedHexString> & Record<intStrings, IntString>
