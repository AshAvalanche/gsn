/**
 * Minimal provider/signer interfaces to replace ethers.js types.
 * These are used internally by the GSN provider package.
 */

export interface WrappedProvider {
  send(method: string, params: unknown[]): Promise<unknown>
  getBlockNumber(): Promise<number>
  getNetwork(): Promise<{ chainId: number | bigint }>
  getSigner(addressOrIndex?: string | number): WrappedSigner
}

export interface WrappedSigner {
  getAddress(): Promise<string>
  signTypedData?(domain: Record<string, unknown>, types: Record<string, unknown[]>, value: Record<string, unknown>): Promise<string>
}
