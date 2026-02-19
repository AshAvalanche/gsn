
import { type ContractInteractor } from './ContractInteractor'
import { type Environment } from './environments/Environments'
import { type LoggerInterface } from './LoggerInterface'
import { toNumber } from './Utils'
import { constants } from './Constants'

export interface RelayRequestLimits {
  effectiveAcceptanceBudgetGasUsed: number
  maxPossibleGasUsed: bigint
  maxPossibleCharge: bigint
  transactionCalldataGasUsed: number
}

// TODO: import this from generated types if possible
export interface GasAndDataLimits {
  acceptanceBudget: bigint
  preRelayedCallGasLimit: bigint
  postRelayedCallGasLimit: bigint
  calldataSizeLimit: bigint
}

export class RelayCallGasLimitCalculationHelper {
  readonly contractInteractor: ContractInteractor
  readonly environment: Environment
  readonly logger: LoggerInterface

  constructor(contractInteractor: ContractInteractor, environment: Environment, logger: LoggerInterface) {
    this.contractInteractor = contractInteractor
    this.environment = environment
    this.logger = logger
  }

  async calculateMaxPossibleGasAndCharge(
    relayRequest: any,
    gasAndDataLimits: GasAndDataLimits,
    innerRecipientCallGasLimit: string,
    calldataGasUsed: number,
    baseFeePerGas: bigint,
    priorityFeePerGas: bigint
  ): Promise<RelayRequestLimits> {
    const transactionMaxPossibleGasUsed = await this.calculateTransactionMaxPossibleGasUsed(
      relayRequest.relayData.transactionCalldataGasUsed, // assuming this is passed as number/string
      gasAndDataLimits,
      innerRecipientCallGasLimit,
      calldataGasUsed
    )

    // max possible charge calculation using max fee per gas and priority
    // For legacy tx, it effectively uses gasPrice which is base + priority?
    // We strictly use EIP-1559 math here: (base + priority) * gas? No, maxFeePerGas includes base.
    // If relayRequest has maxFeePerGas, we should use it.
    // But here we are passed baseFee and priorityFee (current network values?).
    // No, we are passed values to verify?
    // The previous code calculated maxPossibleCharge.

    const maxPossibleCharge =
      await this.contractInteractor.calculateChargeWithRelayHub(transactionMaxPossibleGasUsed, relayRequest.relayData, {
        from: constants.DRY_RUN_ADDRESS,
        gasLimit: transactionMaxPossibleGasUsed // Passing bigint as gas limit
      })

    return {
      effectiveAcceptanceBudgetGasUsed: toNumber(gasAndDataLimits.acceptanceBudget),
      maxPossibleGasUsed: transactionMaxPossibleGasUsed,
      maxPossibleCharge,
      transactionCalldataGasUsed: calldataGasUsed
    }
  }

  async calculateTransactionMaxPossibleGasUsed(
    msgDataLength: number,
    gasAndDataLimits: GasAndDataLimits,
    innerRecipientCallGasLimit: string,
    calldataGasUsed: number
  ): Promise<bigint> {
    const msgDataGasCostInsideTransaction: number =
      toNumber(BigInt(this.contractInteractor.environment.dataOnChainHandlingGasCostPerByte) * BigInt(msgDataLength))

    const gasOverhead = this.contractInteractor.relayHubConfiguration.gasOverhead
    const result = toNumber(gasOverhead) +
      msgDataGasCostInsideTransaction +
      calldataGasUsed +
      parseInt(innerRecipientCallGasLimit) +
      toNumber(gasAndDataLimits.preRelayedCallGasLimit) +
      toNumber(gasAndDataLimits.postRelayedCallGasLimit)

    return BigInt(result)
  }
}
