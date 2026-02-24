import ow from 'ow'
import { type PrefixedHexString } from '../types/Aliases'

export interface AuditRequest {
  signedTx: PrefixedHexString
}

export interface AuditResponse {
  commitTxHash?: PrefixedHexString
  message?: string
}

export const AuditRequestShape = {
  signedTx: ow.string
}
