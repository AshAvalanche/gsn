
import { type CalldataGasEstimation, type Hex, type Address } from '../types/Aliases'
import { type Environment } from './Environments'
import { constants } from '../Constants'
import { type Client, type PublicActions } from 'viem'

/**
 * In most L2s, the cost of the transaction is dynamic and depends on L1 gas price.
 * This function tries to extract calldata cost by requesting an estimate but setting target to zero address.
 * As our result must be above the Relay Server's estimate, it makes sense to add some slack to the estimate.
 */
export const AsyncZeroAddressCalldataGasEstimation: CalldataGasEstimation = async (
  calldata: Hex,
  environment: Environment,
  calldataEstimationSlackFactor: number,
  client: Client & PublicActions
): Promise<bigint> => {
  const estimateGasCallToZero = await client.estimateGas({
    to: constants.ZERO_ADDRESS as Address,
    data: calldata
  })
  return (estimateGasCallToZero * BigInt(Math.ceil(calldataEstimationSlackFactor * 100))) / 100n
}
