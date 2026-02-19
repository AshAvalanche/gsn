import { type ERC20TokenMetadata } from './ContractInteractor'
import { type LoggerInterface } from './LoggerInterface'
import { boolString, formatTokenAmount, isSameAddress } from './Utils'
import { constants } from './Constants'
import { type Address } from './types/Aliases'

const ether: ERC20TokenMetadata = {
  tokenAddress: constants.ZERO_ADDRESS,
  tokenName: 'Ether',
  tokenSymbol: 'ETH',
  tokenDecimals: 18
}

export class AmountRequired {
  logger: LoggerInterface
  _name: string
  _currentValue = 0n
  _requiredValue = 0n
  _currentTokenAddress = constants.ZERO_ADDRESS
  _listener?: () => void
  _tokenMetadata: ERC20TokenMetadata

  constructor(
    name: string,
    requiredValue: bigint,
    requiredTokenAddress: Address, // strict Address
    logger: LoggerInterface,
    listener?: () => void,
    tokenMetadata: ERC20TokenMetadata = ether
  ) {
    this.logger = logger
    this._name = name
    this._tokenMetadata = tokenMetadata
    this._requiredValue = requiredValue
    this._listener = listener
    // Initialize token address if passed, though strict typing might differ from legacy
    // Legacy accepted string. We accept Address (Common alias).
    this._currentTokenAddress = requiredTokenAddress
  }

  get currentValue(): bigint {
    return this._currentValue
  }

  set currentValue(newValue: bigint) {
    const didChange = this._currentValue !== newValue
    const wasSatisfied = this.isSatisfied
    this._currentValue = newValue
    if (didChange) {
      this._onChange(wasSatisfied)
    }
  }

  get currentTokenAddress(): Address {
    return this._currentTokenAddress
  }

  set currentTokenAddress(newValue: Address) {
    const didChange = !isSameAddress(this._currentTokenAddress, newValue)
    const wasSatisfied = this.isSatisfied
    this._currentTokenAddress = newValue
    if (didChange) {
      this._onChange(wasSatisfied)
    }
  }

  get requiredValue(): bigint {
    return this._requiredValue
  }

  set requiredValue(newValue: bigint) {
    const didChange = this._requiredValue !== newValue
    const wasSatisfied = this.isSatisfied
    this._requiredValue = newValue
    if (didChange) {
      this._onChange(wasSatisfied)
    }
  }

  _onChange(wasSatisfied: boolean): void {
    let changeString
    if (wasSatisfied === this.isSatisfied) {
      changeString = `still${this.isSatisfied ? '' : ' not'}`
    } else if (this.isSatisfied) {
      changeString = 'now'
    } else {
      changeString = 'no longer'
    }
    const message = `${this._name} requirement is ${changeString} satisfied
${this.description}`
    this.logger.warn(message)
    if (this._listener != null) {
      this._listener()
    }
  }

  get isSatisfied(): boolean {
    const correctTokenSatisfied = isSameAddress(this._tokenMetadata.tokenAddress, this._currentTokenAddress)
    const valueSatisfied = this._currentValue >= this._requiredValue
    return correctTokenSatisfied && valueSatisfied
  }

  get description(): string {
    const status = boolString(this.isSatisfied)
    const actual: string = formatTokenAmount(this._currentValue, this._tokenMetadata.tokenDecimals, this._tokenMetadata.tokenAddress, this._tokenMetadata.tokenSymbol)
    const required: string = formatTokenAmount(this._requiredValue, this._tokenMetadata.tokenDecimals, this._tokenMetadata.tokenAddress, this._tokenMetadata.tokenSymbol)
    return `${this._name.padEnd(14)} | ${status.padEnd(14)} | actual: ${actual.padStart(16)} | required: ${required.padStart(16)}`
  }
}
