import { type Hex, parseTransaction, toFunctionSelector } from 'viem'

import RelayHubABI from '@opengsn/common/dist/interfaces/IRelayHub.json'
import {
  type ContractInteractor,
  type LoggerInterface,
  type ObjectMap,
  type PrefixedHexString,
  type RelayTransactionRequest,
  type Address,
  isSameAddress
} from '@opengsn/common'

import { type GSNConfig } from './GSNConfigurator'
import { type ParsedTransaction } from './RelayClient'

export interface GasPriceValidationResult {
  isTransactionTypeValid: boolean
  isFeeMarket1559Transaction: boolean
  isLegacyGasPriceValid: boolean
  isMaxFeePerGasValid: boolean
  isMaxPriorityFeePerGasValid: boolean
}

export interface TransactionValidationResult {
  gasPriceValidationResult: GasPriceValidationResult
  nonceGapFilledValidationResult: TransactionValidationResult[]
  isNonceGapFilledSizeValid: boolean
  isTransactionTargetValid: boolean
  isTransactionSenderValid: boolean
  isTransactionContentValid: boolean
  isTransactionNonceValid: boolean
}

export function isTransactionValid(result: TransactionValidationResult): boolean {
  const isValid1559GasFee =
    result.gasPriceValidationResult.isFeeMarket1559Transaction &&
    result.gasPriceValidationResult.isMaxFeePerGasValid &&
    result.gasPriceValidationResult.isMaxPriorityFeePerGasValid
  const isGasPriceValid =
    result.gasPriceValidationResult.isTransactionTypeValid &&
    (result.gasPriceValidationResult.isLegacyGasPriceValid || isValid1559GasFee)

  // this call is 'recursive' but transactions inside nonce gap have empty arrays here and function is not called
  const isNonceGapFilled = !result.nonceGapFilledValidationResult.map(it => isTransactionValid(it)).includes(false)
  return isGasPriceValid &&
    isNonceGapFilled &&
    result.isTransactionTargetValid &&
    result.isTransactionSenderValid &&
    result.isTransactionContentValid &&
    result.isNonceGapFilledSizeValid &&
    result.isTransactionNonceValid
}

export class RelayedTransactionValidator {
  private readonly contractInteractor: ContractInteractor
  private readonly config: GSNConfig
  private readonly logger: LoggerInterface

  constructor(contractInteractor: ContractInteractor, logger: LoggerInterface, config: GSNConfig) {
    this.contractInteractor = contractInteractor
    this.config = config
    this.logger = logger
  }

  /**
   * Decode the signed transaction returned from the Relay Server, compare it to the
   * requested transaction and validate its signature.
   * @returns true if relay response is valid, false otherwise
   */
  validateTransactionInNonceGap(request: RelayTransactionRequest, transaction: ParsedTransaction, expectedNonce: number): TransactionValidationResult {
    const isTransactionSenderValid = this._validateTransactionSender(request, transaction)
    const isTransactionTargetValid = this.validateTransactionTarget(transaction)
    const isTransactionContentValid = this._validateTransactionMethodSignature(transaction)
    const gasPriceValidationResult = this._validateNonceGapGasPrice(request, transaction)
    const isTransactionNonceValid = transaction.nonce === expectedNonce
    return {
      nonceGapFilledValidationResult: [],
      isNonceGapFilledSizeValid: true,
      isTransactionTargetValid,
      isTransactionSenderValid,
      isTransactionContentValid,
      gasPriceValidationResult,
      isTransactionNonceValid
    }
  }

  validateRelayResponse(
    request: RelayTransactionRequest,
    returnedTx: PrefixedHexString,
    nonceGapFilled: ObjectMap<PrefixedHexString>
  ): TransactionValidationResult {
    const transaction = parseTransaction(returnedTx as Hex) as unknown as ParsedTransaction
    this.logger.debug(`returnedTx: ${JSON.stringify(transaction, null, 2)}`)

    const nonce = transaction.nonce
    const expectedNonceGapLength = nonce - request.metadata.relayLastKnownNonce
    const isNonceGapFilledSizeValid = Object.keys(nonceGapFilled).length === expectedNonceGapLength
    const isTransactionTargetValid = this.validateTransactionTarget(transaction)
    const isTransactionSenderValid = this._validateTransactionSender(request, transaction)
    const isTransactionContentValid = this._validateTransactionContent(request, transaction)
    const gasPriceValidationResult = this._validateGasPrice(request, transaction)
    const isTransactionNonceValid = nonce <= request.metadata.relayMaxNonce
    const nonceGapFilledValidationResult =
      this._validateNonceGapFilled(
        request,
        nonceGapFilled
      )

    return {
      gasPriceValidationResult,
      isTransactionTargetValid,
      isTransactionSenderValid,
      isTransactionContentValid,
      isTransactionNonceValid,
      isNonceGapFilledSizeValid,
      nonceGapFilledValidationResult
    }
  }

  private validateTransactionTarget(transaction: ParsedTransaction): boolean {
    const relayHubAddress = this.contractInteractor.getDeployment().relayHubAddress
    return transaction.to != null && relayHubAddress != null && isSameAddress(transaction.to.toString() as unknown as Address, relayHubAddress)
  }

  _validateTransactionSender(
    request: RelayTransactionRequest,
    transaction: ParsedTransaction
  ): boolean {
    const signer = transaction.from ?? ''
    return isSameAddress(request.relayRequest.relayData.relayWorker, signer as unknown as Address)
  }

  /**
   * For transactions that are filling the nonce gap, we only check that the transaction is not penalizable.
   */
  _validateTransactionMethodSignature(transaction: ParsedTransaction): boolean {
    const relayCallSelector = toFunctionSelector('relayCall(string,(address,address,uint256,uint256,uint256,bytes,uint256),(uint256,uint256,uint256,address,address,address,bytes,uint256),bytes,bytes,uint256)')
    return transaction.data.startsWith(relayCallSelector)
  }

  _validateTransactionContent(request: RelayTransactionRequest, transaction: ParsedTransaction): boolean {
    const relayRequestAbiEncode = this.contractInteractor.encodeABI({
      domainSeparatorName: request.metadata.domainSeparatorName,
      relayRequest: request.relayRequest,
      signature: request.metadata.signature as Hex,
      approvalData: request.metadata.approvalData as Hex,
      maxAcceptanceBudget: request.metadata.maxAcceptanceBudget as Hex
    })
    return relayRequestAbiEncode === transaction.data
  }

  _validateNonceGapGasPrice(_request: RelayTransactionRequest, _transaction: ParsedTransaction): GasPriceValidationResult {
    // TODO: implement logic for verifying gas price is valid for transactions in the nonce gap
    this.logger.debug('not checking gas prices for transaction in nonce gap - not implemented')
    return {
      isTransactionTypeValid: true,
      isFeeMarket1559Transaction: true,
      isLegacyGasPriceValid: true,
      isMaxFeePerGasValid: true,
      isMaxPriorityFeePerGasValid: true
    }
  }

  _validateGasPrice(request: RelayTransactionRequest, transaction: ParsedTransaction): GasPriceValidationResult {
    let isTransactionTypeValid = true
    let isFeeMarket1559Transaction = false
    let isLegacyGasPriceValid = false
    let isMaxFeePerGasValid = false
    let isMaxPriorityFeePerGasValid = false

    if (transaction.gasPrice != null) {
      isLegacyGasPriceValid = transaction.gasPrice >= BigInt(request.relayRequest.relayData.maxFeePerGas)
    } else if (transaction.maxFeePerGas != null && transaction.maxPriorityFeePerGas != null) {
      isFeeMarket1559Transaction = true
      isMaxPriorityFeePerGasValid = transaction.maxPriorityFeePerGas >= BigInt(request.relayRequest.relayData.maxPriorityFeePerGas)
      isMaxFeePerGasValid = transaction.maxFeePerGas >= BigInt(request.relayRequest.relayData.maxFeePerGas)
    } else {
      isTransactionTypeValid = false
    }
    return {
      isTransactionTypeValid,
      isFeeMarket1559Transaction,
      isLegacyGasPriceValid,
      isMaxFeePerGasValid,
      isMaxPriorityFeePerGasValid
    }
  }

  _validateNonceGapFilled(
    request: RelayTransactionRequest,
    transactionsInGap: ObjectMap<PrefixedHexString>
  ): TransactionValidationResult[] {
    const result: TransactionValidationResult[] = []
    let expectedNonce = request.metadata.relayLastKnownNonce
    for (const rawTransaction of Object.values(transactionsInGap)) {
      const transaction = parseTransaction(rawTransaction as Hex) as unknown as ParsedTransaction
      const validationResult = this.validateTransactionInNonceGap(request, transaction, expectedNonce)
      result.push(validationResult)
      expectedNonce++
    }
    return result
  }
}
