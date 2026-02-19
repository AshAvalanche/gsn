
import { type CalldataGasEstimation, type Hex } from '../types/Aliases'
import { calculateCalldataBytesZeroNonzero } from '../Utils'
import { type Environment } from './Environments'

/**
 * On the Ethereum Mainnet, the transaction cost is currently determined by the EIP-2028.
 * In case different coefficients are used later or in different chains, the values are read from the Environment.
 */
export const MainnetCalldataGasEstimation: CalldataGasEstimation = async (
  calldata: Hex,
  environment: Environment
): Promise<bigint> => {
  const { calldataZeroBytes, calldataNonzeroBytes } = calculateCalldataBytesZeroNonzero(calldata)
  // environment values are likely numbers. We cast to bigint.
  return BigInt(environment.mintxgascost) +
    BigInt(calldataZeroBytes) * BigInt(environment.gtxdatazero) +
    BigInt(calldataNonzeroBytes) * BigInt(environment.gtxdatanonzero)
}
