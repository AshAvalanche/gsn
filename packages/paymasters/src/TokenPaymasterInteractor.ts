

import {
  type Address,
  Hex,
  type LoggerInterface,
  constants
} from '@opengsn/common'

import {
  type IChainlinkOracle, IChainlinkOracle__factory,
  IERC20__factory,
  type IERC20,
  type PermitERC20UniswapV3Paymaster,
  PermitERC20UniswapV3Paymaster__factory
} from '../types/ethers-contracts'

import { wrapInputProviderLike } from '@opengsn/provider'

export interface TokenSwapData {
  priceFeed: string
  reverseQuote: boolean
  uniswapPoolFee: number
  slippage: number
  permitMethodSelector: string
  priceDivisor: bigint
  validFromBlockNumber: bigint
}

export class TokenPaymasterInteractor {
  private provider: JsonRpcProvider
  private readonly paymasterAddress: Address
  private readonly logger: LoggerInterface

  tokenAddress?: Address
  tokenSwapData?: TokenSwapData

  paymaster!: PermitERC20UniswapV3Paymaster
  token!: IERC20

  constructor(
    provider: JsonRpcProvider | ExternalProvider,
    paymasterAddress: Address,
    logger: LoggerInterface
  ) {
    this.paymasterAddress = paymasterAddress
    this.logger = logger
    this.provider = provider
  }

  async init(): Promise<this> {
    this.provider = (await wrapInputProviderLike(this.provider)).provider
    this.paymaster = await this._createPermitERC20UniswapV3Paymaster(this.paymasterAddress)
    return this
  }

  async setToken(tokenAddress: Address): Promise<void> {
    this.tokenAddress = tokenAddress
    this.token = await this._createIERC20Instance(this.tokenAddress)
    const data = await this.paymaster.getTokenSwapData(tokenAddress)
    this.tokenSwapData = {
      priceFeed: data.priceFeed,
      reverseQuote: data.reverseQuote,
      uniswapPoolFee: data.uniswapPoolFee,
      slippage: data.slippage,
      permitMethodSelector: data.permitMethodSelector,
      priceDivisor: BigInt(data.priceDivisor.toString()),
      validFromBlockNumber: BigInt(data.validFromBlockNumber.toString())
    }
  }

  async _createIERC20Instance(address: Address): Promise<IERC20> {
    return IERC20__factory.connect(address, this.provider)
  }

  async _createPermitERC20UniswapV3Paymaster(address: Address): Promise<PermitERC20UniswapV3Paymaster> {
    return PermitERC20UniswapV3Paymaster__factory.connect(address, this.provider)
  }

  async _createChainlinkOracleInstance(address: Address): Promise<IChainlinkOracle> {
    return IChainlinkOracle__factory.connect(address, this.provider)
  }

  async getAllowance(owner: Address, spender: Address): Promise<bigint> {
    const res = await this.token.allowance(owner, spender)
    return BigInt(res.toString())
  }

  async supportedTokens(): Promise<Address[]> {
    return (await this.paymaster.getTokens()) as unknown as Address[]
  }

  async isTokenSupported(token: Address): Promise<boolean> {
    return await this.paymaster.isTokenSupported(token)
  }

  async tokenBalanceOf(owner: Address, tokenAddress: Address): Promise<bigint> {
    const tokenInstance = await this._createIERC20Instance(tokenAddress)
    const res = await tokenInstance.balanceOf(owner)
    return BigInt(res.toString())
  }

  async tokenPaymasterAllowance(owner: Address, tokenAddress: Address): Promise<bigint> {
    const tokenInstance = await this._createIERC20Instance(tokenAddress)
    const res = await tokenInstance.allowance(owner, this.paymaster.address)
    return BigInt(res.toString())
  }

  async tokenToWei(tokenAddress: Address, tokenAmount: bigint): Promise<{
    actualQuote: bigint
    amountInWei: bigint
  }> {
    const tokenSwapData = await this.paymaster.getTokenSwapData(tokenAddress)
    const chainlinkInstance = await this._createChainlinkOracleInstance(tokenSwapData.priceFeed as Hex)
    const quote = await chainlinkInstance.latestAnswer()
    const description = `(tokenAddress=${tokenAddress} tokenAmount=${tokenAmount.toString()} priceFeed=${tokenSwapData.priceFeed} quote=${quote.toString()} priceDivisor=${tokenSwapData.priceDivisor.toString()} reverseQuote=${tokenSwapData.reverseQuote})`
    this.logger.debug(`Converting token balance to Ether quote ${description}`)
    try {
      const actualQuote = await this.paymaster.toActualQuote(quote.toString(), tokenSwapData.priceDivisor.toString())
      this.logger.debug(`actualQuote=${actualQuote.toString()}`)
      if (tokenAmount > BigInt(10) ** BigInt(30)) {
        this.logger.debug(`Amount to convert is > 1e30 which is infinity in most cases (tokenAddress=${tokenAddress})`)
        return {
          actualQuote: BigInt(0),
          amountInWei: BigInt(constants.MAX_UINT256.toString())
        }
      }
      const amountInWei = await this.paymaster.tokenToWei(tokenAmount.toString(), actualQuote.toString(), tokenSwapData.reverseQuote)
      this.logger.debug(`amountInWei=${amountInWei.toString()}`)
      return { actualQuote: actualQuote.toBigInt(), amountInWei: amountInWei.toBigInt() }
    } catch (error: any) {
      this.logger.error(`Failed to convert token balance to Ether quote ${description}`)
      this.logger.error(error)
      return {
        actualQuote: BigInt(0),
        amountInWei: BigInt(0)
      }
    }
  }
}

