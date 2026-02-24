import { encodeFunctionData, type Hex, type Abi } from 'viem'

import {
  type Address,
  type GSNContractsDeployment,
  type IntString,
  type RelayRequest,
  splitRelayUrlForRegistrar
} from '@opengsn/common'

import penalizerAbi from '@opengsn/common/dist/interfaces/IPenalizer.json'
import relayHubAbi from '@opengsn/common/dist/interfaces/IRelayHub.json'
import relayRegistrarAbi from '@opengsn/common/dist/interfaces/IRelayRegistrar.json'
import stakeManagerAbi from '@opengsn/common/dist/interfaces/IStakeManager.json'

import { type Client } from 'viem'

/**
 * A minimal "method" object that mirrors the old web3 contract method interface
 * so callers can still call method.encodeABI() and method.estimateGas()
 */
export interface EncodedMethod {
  encodeABI: () => Hex
  call?: (options: any, block?: string, client?: Client, target?: Address) => Promise<any>
}

export class Web3MethodsBuilder {
  private readonly deployment?: GSNContractsDeployment

  constructor(deployment?: GSNContractsDeployment) {
    this.deployment = deployment
  }

  async getRegisterRelayMethod(relayHub: Address, url: string): Promise<EncodedMethod> {
    return {
      encodeABI: () => encodeFunctionData({
        abi: relayRegistrarAbi as Abi,
        functionName: 'registerRelayServer',
        args: [relayHub, splitRelayUrlForRegistrar(url)]
      })
    }
  }

  async getAuthorizeHubByManagerMethod(relayHub: Address): Promise<EncodedMethod> {
    return {
      encodeABI: () => encodeFunctionData({
        abi: stakeManagerAbi as Abi,
        functionName: 'authorizeHubByManager',
        args: [relayHub]
      })
    }
  }

  async getAddRelayWorkersMethod(workers: Address[]): Promise<EncodedMethod> {
    return {
      encodeABI: () => encodeFunctionData({
        abi: relayHubAbi as Abi,
        functionName: 'addRelayWorkers',
        args: [workers]
      })
    }
  }

  async getSetRelayManagerMethod(owner: Address): Promise<EncodedMethod> {
    return {
      encodeABI: () => encodeFunctionData({
        abi: stakeManagerAbi as Abi,
        functionName: 'setRelayManagerOwner',
        args: [owner]
      })
    }
  }

  async getWithdrawMethod(destination: Address, amount: string): Promise<EncodedMethod> {
    return {
      encodeABI: () => encodeFunctionData({
        abi: relayHubAbi as Abi,
        functionName: 'withdraw',
        args: [destination, amount]
      })
    }
  }

  async withdrawHubBalanceEstimateGas(destination: Address, amount: string, managerAddress: Address, gasPrice: IntString): Promise<{
    gasCost: bigint
    gasLimit: number
    method: EncodedMethod
  }> {
    const method = await this.getWithdrawMethod(destination, amount)
    // Gas estimate would need a client — for now return a high default
    // The actual gas estimation is done by the TransactionManager via ContractInteractor
    const withdrawTxGasLimit = 100000
    const gasCost = BigInt(withdrawTxGasLimit) * BigInt(gasPrice)
    return {
      gasLimit: withdrawTxGasLimit,
      gasCost,
      method
    }
  }

  getRelayCallMethod(
    domainSeparatorName: string,
    maxAcceptanceBudget: number | string,
    relayRequest: RelayRequest,
    signature: string,
    approvalData: string
  ): EncodedMethod {
    const abi = relayHubAbi as Abi
    const functionName = 'relayCall'
    const args = [
      domainSeparatorName,
      maxAcceptanceBudget,
      relayRequest,
      signature,
      approvalData
    ]
    return {
      encodeABI: () => encodeFunctionData({ abi, functionName, args }),
      call: async (options: any, block?: string, client?: Client, target?: Address) => {
        if (client == null || target == null) throw new Error('client and target required for call')
        const publicClient = client as any
        const res = await publicClient.readContract({
          address: target,
          abi,
          functionName,
          args,
          account: options.from,
          gas: options.gasLimit != null ? BigInt(options.gasLimit) : undefined,
          maxFeePerGas: options.maxFeePerGas != null ? BigInt(options.maxFeePerGas) : undefined,
          maxPriorityFeePerGas: options.maxPriorityFeePerGas != null ? BigInt(options.maxPriorityFeePerGas) : undefined,
          gasPrice: options.gasPrice != null ? BigInt(options.gasPrice) : undefined,
          blockTag: block
        }) as readonly [boolean, Hex]
        return { paymasterAccepted: res[0], returnValue: res[1] }
      }
    }
  }

  getPenalizerCommitMethod(commitHash: string): EncodedMethod {
    return {
      encodeABI: () => encodeFunctionData({
        abi: penalizerAbi as Abi,
        functionName: 'commit',
        args: [commitHash]
      })
    }
  }

  getPenalizeRepeatedNonceMethod(...args: unknown[]): EncodedMethod {
    return {
      encodeABI: () => encodeFunctionData({
        abi: penalizerAbi as Abi,
        functionName: 'penalizeRepeatedNonce',
        args
      })
    }
  }

  getPenalizeIllegalTransactionMethod(...args: unknown[]): EncodedMethod {
    return {
      encodeABI: () => encodeFunctionData({
        abi: penalizerAbi as Abi,
        functionName: 'penalizeIllegalTransaction',
        args
      })
    }
  }
}
