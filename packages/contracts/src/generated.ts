//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Forwarder
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const forwarderAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    inputs: [],
    name: 'EIP712_DOMAIN_TYPE',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'GENERIC_PARAMS',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'req',
        internalType: 'struct IForwarder.ForwardRequest',
        type: 'tuple',
        components: [
          { name: 'from', internalType: 'address', type: 'address' },
          { name: 'to', internalType: 'address', type: 'address' },
          { name: 'value', internalType: 'uint256', type: 'uint256' },
          { name: 'gas', internalType: 'uint256', type: 'uint256' },
          { name: 'nonce', internalType: 'uint256', type: 'uint256' },
          { name: 'data', internalType: 'bytes', type: 'bytes' },
          { name: 'validUntilTime', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'requestTypeHash', internalType: 'bytes32', type: 'bytes32' },
      { name: 'suffixData', internalType: 'bytes', type: 'bytes' },
    ],
    name: '_getEncoded',
    outputs: [{ name: '', internalType: 'bytes', type: 'bytes' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'domains',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'req',
        internalType: 'struct IForwarder.ForwardRequest',
        type: 'tuple',
        components: [
          { name: 'from', internalType: 'address', type: 'address' },
          { name: 'to', internalType: 'address', type: 'address' },
          { name: 'value', internalType: 'uint256', type: 'uint256' },
          { name: 'gas', internalType: 'uint256', type: 'uint256' },
          { name: 'nonce', internalType: 'uint256', type: 'uint256' },
          { name: 'data', internalType: 'bytes', type: 'bytes' },
          { name: 'validUntilTime', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'domainSeparator', internalType: 'bytes32', type: 'bytes32' },
      { name: 'requestTypeHash', internalType: 'bytes32', type: 'bytes32' },
      { name: 'suffixData', internalType: 'bytes', type: 'bytes' },
      { name: 'sig', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'execute',
    outputs: [
      { name: 'success', internalType: 'bool', type: 'bool' },
      { name: 'ret', internalType: 'bytes', type: 'bytes' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'from', internalType: 'address', type: 'address' }],
    name: 'getNonce',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'version', internalType: 'string', type: 'string' },
    ],
    name: 'registerDomainSeparator',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'typeName', internalType: 'string', type: 'string' },
      { name: 'typeSuffix', internalType: 'string', type: 'string' },
    ],
    name: 'registerRequestType',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'typeHashes',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'req',
        internalType: 'struct IForwarder.ForwardRequest',
        type: 'tuple',
        components: [
          { name: 'from', internalType: 'address', type: 'address' },
          { name: 'to', internalType: 'address', type: 'address' },
          { name: 'value', internalType: 'uint256', type: 'uint256' },
          { name: 'gas', internalType: 'uint256', type: 'uint256' },
          { name: 'nonce', internalType: 'uint256', type: 'uint256' },
          { name: 'data', internalType: 'bytes', type: 'bytes' },
          { name: 'validUntilTime', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'domainSeparator', internalType: 'bytes32', type: 'bytes32' },
      { name: 'requestTypeHash', internalType: 'bytes32', type: 'bytes32' },
      { name: 'suffixData', internalType: 'bytes', type: 'bytes' },
      { name: 'sig', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'verify',
    outputs: [],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'domainSeparator',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'domainValue',
        internalType: 'bytes',
        type: 'bytes',
        indexed: false,
      },
    ],
    name: 'DomainRegistered',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'typeHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'typeStr',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'RequestTypeRegistered',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IERC20Token
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const ierc20TokenAbi = [
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'spender', internalType: 'address', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'spender', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', internalType: 'uint8', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'amount', internalType: 'uint256', type: 'uint256' }],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'spender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Transfer',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IERC2771Recipient
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const ierc2771RecipientAbi = [
  {
    type: 'function',
    inputs: [{ name: 'forwarder', internalType: 'address', type: 'address' }],
    name: 'isTrustedForwarder',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IForwarder
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iForwarderAbi = [
  {
    type: 'function',
    inputs: [
      {
        name: 'forwardRequest',
        internalType: 'struct IForwarder.ForwardRequest',
        type: 'tuple',
        components: [
          { name: 'from', internalType: 'address', type: 'address' },
          { name: 'to', internalType: 'address', type: 'address' },
          { name: 'value', internalType: 'uint256', type: 'uint256' },
          { name: 'gas', internalType: 'uint256', type: 'uint256' },
          { name: 'nonce', internalType: 'uint256', type: 'uint256' },
          { name: 'data', internalType: 'bytes', type: 'bytes' },
          { name: 'validUntilTime', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'domainSeparator', internalType: 'bytes32', type: 'bytes32' },
      { name: 'requestTypeHash', internalType: 'bytes32', type: 'bytes32' },
      { name: 'suffixData', internalType: 'bytes', type: 'bytes' },
      { name: 'signature', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'execute',
    outputs: [
      { name: 'success', internalType: 'bool', type: 'bool' },
      { name: 'ret', internalType: 'bytes', type: 'bytes' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'from', internalType: 'address', type: 'address' }],
    name: 'getNonce',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'version', internalType: 'string', type: 'string' },
    ],
    name: 'registerDomainSeparator',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'typeName', internalType: 'string', type: 'string' },
      { name: 'typeSuffix', internalType: 'string', type: 'string' },
    ],
    name: 'registerRequestType',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'forwardRequest',
        internalType: 'struct IForwarder.ForwardRequest',
        type: 'tuple',
        components: [
          { name: 'from', internalType: 'address', type: 'address' },
          { name: 'to', internalType: 'address', type: 'address' },
          { name: 'value', internalType: 'uint256', type: 'uint256' },
          { name: 'gas', internalType: 'uint256', type: 'uint256' },
          { name: 'nonce', internalType: 'uint256', type: 'uint256' },
          { name: 'data', internalType: 'bytes', type: 'bytes' },
          { name: 'validUntilTime', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'domainSeparator', internalType: 'bytes32', type: 'bytes32' },
      { name: 'requestTypeHash', internalType: 'bytes32', type: 'bytes32' },
      { name: 'suffixData', internalType: 'bytes', type: 'bytes' },
      { name: 'signature', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'verify',
    outputs: [],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'domainSeparator',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'domainValue',
        internalType: 'bytes',
        type: 'bytes',
        indexed: false,
      },
    ],
    name: 'DomainRegistered',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'typeHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'typeStr',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'RequestTypeRegistered',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IPaymaster
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iPaymasterAbi = [
  {
    type: 'function',
    inputs: [],
    name: 'getGasAndDataLimits',
    outputs: [
      {
        name: 'limits',
        internalType: 'struct IPaymaster.GasAndDataLimits',
        type: 'tuple',
        components: [
          {
            name: 'acceptanceBudget',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'preRelayedCallGasLimit',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'postRelayedCallGasLimit',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'calldataSizeLimit',
            internalType: 'uint256',
            type: 'uint256',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getRelayHub',
    outputs: [{ name: 'relayHub', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTrustedForwarder',
    outputs: [
      { name: 'trustedForwarder', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'context', internalType: 'bytes', type: 'bytes' },
      { name: 'success', internalType: 'bool', type: 'bool' },
      { name: 'gasUseWithoutPost', internalType: 'uint256', type: 'uint256' },
      {
        name: 'relayData',
        internalType: 'struct GsnTypes.RelayData',
        type: 'tuple',
        components: [
          { name: 'maxFeePerGas', internalType: 'uint256', type: 'uint256' },
          {
            name: 'maxPriorityFeePerGas',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'transactionCalldataGasUsed',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'relayWorker', internalType: 'address', type: 'address' },
          { name: 'paymaster', internalType: 'address', type: 'address' },
          { name: 'forwarder', internalType: 'address', type: 'address' },
          { name: 'paymasterData', internalType: 'bytes', type: 'bytes' },
          { name: 'clientId', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'postRelayedCall',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'relayRequest',
        internalType: 'struct GsnTypes.RelayRequest',
        type: 'tuple',
        components: [
          {
            name: 'request',
            internalType: 'struct IForwarder.ForwardRequest',
            type: 'tuple',
            components: [
              { name: 'from', internalType: 'address', type: 'address' },
              { name: 'to', internalType: 'address', type: 'address' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'gas', internalType: 'uint256', type: 'uint256' },
              { name: 'nonce', internalType: 'uint256', type: 'uint256' },
              { name: 'data', internalType: 'bytes', type: 'bytes' },
              {
                name: 'validUntilTime',
                internalType: 'uint256',
                type: 'uint256',
              },
            ],
          },
          {
            name: 'relayData',
            internalType: 'struct GsnTypes.RelayData',
            type: 'tuple',
            components: [
              {
                name: 'maxFeePerGas',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'maxPriorityFeePerGas',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'transactionCalldataGasUsed',
                internalType: 'uint256',
                type: 'uint256',
              },
              { name: 'relayWorker', internalType: 'address', type: 'address' },
              { name: 'paymaster', internalType: 'address', type: 'address' },
              { name: 'forwarder', internalType: 'address', type: 'address' },
              { name: 'paymasterData', internalType: 'bytes', type: 'bytes' },
              { name: 'clientId', internalType: 'uint256', type: 'uint256' },
            ],
          },
        ],
      },
      { name: 'signature', internalType: 'bytes', type: 'bytes' },
      { name: 'approvalData', internalType: 'bytes', type: 'bytes' },
      { name: 'maxPossibleGas', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'preRelayedCall',
    outputs: [
      { name: 'context', internalType: 'bytes', type: 'bytes' },
      { name: 'rejectOnRecipientRevert', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'versionPaymaster',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IPenalizer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iPenalizerAbi = [
  {
    type: 'function',
    inputs: [{ name: 'commitHash', internalType: 'bytes32', type: 'bytes32' }],
    name: 'commit',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getPenalizeBlockDelay',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getPenalizeBlockExpiration',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'unsignedTx', internalType: 'bytes', type: 'bytes' },
      { name: 'signature', internalType: 'bytes', type: 'bytes' },
      { name: 'hub', internalType: 'contract IRelayHub', type: 'address' },
      { name: 'randomValue', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'penalizeIllegalTransaction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'unsignedTx1', internalType: 'bytes', type: 'bytes' },
      { name: 'signature1', internalType: 'bytes', type: 'bytes' },
      { name: 'unsignedTx2', internalType: 'bytes', type: 'bytes' },
      { name: 'signature2', internalType: 'bytes', type: 'bytes' },
      { name: 'hub', internalType: 'contract IRelayHub', type: 'address' },
      { name: 'randomValue', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'penalizeRepeatedNonce',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'versionPenalizer',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'commitHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'readyBlockNumber',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'CommitAdded',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IRelayHub
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iRelayHubAbi = [
  {
    type: 'function',
    inputs: [
      { name: 'newRelayWorkers', internalType: 'address[]', type: 'address[]' },
    ],
    name: 'addRelayWorkers',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'aggregateGasleft',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'target', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'gasUsed', internalType: 'uint256', type: 'uint256' },
      {
        name: 'relayData',
        internalType: 'struct GsnTypes.RelayData',
        type: 'tuple',
        components: [
          { name: 'maxFeePerGas', internalType: 'uint256', type: 'uint256' },
          {
            name: 'maxPriorityFeePerGas',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'transactionCalldataGasUsed',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'relayWorker', internalType: 'address', type: 'address' },
          { name: 'paymaster', internalType: 'address', type: 'address' },
          { name: 'forwarder', internalType: 'address', type: 'address' },
          { name: 'paymasterData', internalType: 'bytes', type: 'bytes' },
          { name: 'clientId', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'calculateCharge',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'charge', internalType: 'uint256', type: 'uint256' }],
    name: 'calculateDevCharge',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'target', internalType: 'address', type: 'address' }],
    name: 'depositFor',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_deprecationTime', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'deprecateHub',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'escheatAbandonedRelayBalance',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getBatchGateway',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getConfiguration',
    outputs: [
      {
        name: 'config',
        internalType: 'struct IRelayHub.RelayHubConfig',
        type: 'tuple',
        components: [
          { name: 'maxWorkerCount', internalType: 'uint256', type: 'uint256' },
          { name: 'gasReserve', internalType: 'uint256', type: 'uint256' },
          { name: 'postOverhead', internalType: 'uint256', type: 'uint256' },
          { name: 'gasOverhead', internalType: 'uint256', type: 'uint256' },
          {
            name: 'minimumUnstakeDelay',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'devAddress', internalType: 'address', type: 'address' },
          { name: 'devFee', internalType: 'uint8', type: 'uint8' },
          { name: 'baseRelayFee', internalType: 'uint80', type: 'uint80' },
          { name: 'pctRelayFee', internalType: 'uint16', type: 'uint16' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCreationBlock',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getDeprecationTime',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'contract IERC20', type: 'address' },
    ],
    name: 'getMinimumStakePerToken',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getPenalizer',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getRelayRegistrar',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getStakeManager',
    outputs: [
      { name: '', internalType: 'contract IStakeManager', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'manager', internalType: 'address', type: 'address' }],
    name: 'getWorkerCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'worker', internalType: 'address', type: 'address' }],
    name: 'getWorkerManager',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'isDeprecated',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'isRelayEscheatable',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'onRelayServerRegistered',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayWorker', internalType: 'address', type: 'address' },
      { name: 'beneficiary', internalType: 'address payable', type: 'address' },
    ],
    name: 'penalize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'domainSeparatorName', internalType: 'string', type: 'string' },
      { name: 'maxAcceptanceBudget', internalType: 'uint256', type: 'uint256' },
      {
        name: 'relayRequest',
        internalType: 'struct GsnTypes.RelayRequest',
        type: 'tuple',
        components: [
          {
            name: 'request',
            internalType: 'struct IForwarder.ForwardRequest',
            type: 'tuple',
            components: [
              { name: 'from', internalType: 'address', type: 'address' },
              { name: 'to', internalType: 'address', type: 'address' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'gas', internalType: 'uint256', type: 'uint256' },
              { name: 'nonce', internalType: 'uint256', type: 'uint256' },
              { name: 'data', internalType: 'bytes', type: 'bytes' },
              {
                name: 'validUntilTime',
                internalType: 'uint256',
                type: 'uint256',
              },
            ],
          },
          {
            name: 'relayData',
            internalType: 'struct GsnTypes.RelayData',
            type: 'tuple',
            components: [
              {
                name: 'maxFeePerGas',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'maxPriorityFeePerGas',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'transactionCalldataGasUsed',
                internalType: 'uint256',
                type: 'uint256',
              },
              { name: 'relayWorker', internalType: 'address', type: 'address' },
              { name: 'paymaster', internalType: 'address', type: 'address' },
              { name: 'forwarder', internalType: 'address', type: 'address' },
              { name: 'paymasterData', internalType: 'bytes', type: 'bytes' },
              { name: 'clientId', internalType: 'uint256', type: 'uint256' },
            ],
          },
        ],
      },
      { name: 'signature', internalType: 'bytes', type: 'bytes' },
      { name: 'approvalData', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'relayCall',
    outputs: [
      { name: 'paymasterAccepted', internalType: 'bool', type: 'bool' },
      { name: 'charge', internalType: 'uint256', type: 'uint256' },
      {
        name: 'status',
        internalType: 'enum IRelayHub.RelayCallStatus',
        type: 'uint8',
      },
      { name: 'returnValue', internalType: 'bytes', type: 'bytes' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_config',
        internalType: 'struct IRelayHub.RelayHubConfig',
        type: 'tuple',
        components: [
          { name: 'maxWorkerCount', internalType: 'uint256', type: 'uint256' },
          { name: 'gasReserve', internalType: 'uint256', type: 'uint256' },
          { name: 'postOverhead', internalType: 'uint256', type: 'uint256' },
          { name: 'gasOverhead', internalType: 'uint256', type: 'uint256' },
          {
            name: 'minimumUnstakeDelay',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'devAddress', internalType: 'address', type: 'address' },
          { name: 'devFee', internalType: 'uint8', type: 'uint8' },
          { name: 'baseRelayFee', internalType: 'uint80', type: 'uint80' },
          { name: 'pctRelayFee', internalType: 'uint16', type: 'uint16' },
        ],
      },
    ],
    name: 'setConfiguration',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'contract IERC20[]', type: 'address[]' },
      { name: 'minimumStake', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'setMinimumStakes',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'verifyRelayManagerStaked',
    outputs: [],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'versionHub',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'dest', internalType: 'address payable', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'dest', internalType: 'address payable[]', type: 'address[]' },
      { name: 'amount', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'withdrawMultiple',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'balance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'AbandonedRelayManagerBalanceEscheated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymaster',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Deposited',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'deprecationTime',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'HubDeprecated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'config',
        internalType: 'struct IRelayHub.RelayHubConfig',
        type: 'tuple',
        components: [
          { name: 'maxWorkerCount', internalType: 'uint256', type: 'uint256' },
          { name: 'gasReserve', internalType: 'uint256', type: 'uint256' },
          { name: 'postOverhead', internalType: 'uint256', type: 'uint256' },
          { name: 'gasOverhead', internalType: 'uint256', type: 'uint256' },
          {
            name: 'minimumUnstakeDelay',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'devAddress', internalType: 'address', type: 'address' },
          { name: 'devFee', internalType: 'uint8', type: 'uint8' },
          { name: 'baseRelayFee', internalType: 'uint80', type: 'uint80' },
          { name: 'pctRelayFee', internalType: 'uint16', type: 'uint16' },
        ],
        indexed: false,
      },
    ],
    name: 'RelayHubConfigured',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newRelayWorkers',
        internalType: 'address[]',
        type: 'address[]',
        indexed: false,
      },
      {
        name: 'workersCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'RelayWorkersAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'minimumStake',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'StakingTokenDataChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'paymaster',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'relayRequestID',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'from',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      { name: 'to', internalType: 'address', type: 'address', indexed: false },
      {
        name: 'relayWorker',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'selector',
        internalType: 'bytes4',
        type: 'bytes4',
        indexed: false,
      },
      {
        name: 'innerGasUsed',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'reason', internalType: 'bytes', type: 'bytes', indexed: false },
    ],
    name: 'TransactionRejectedByPaymaster',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'relayWorker',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'relayRequestID',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'from',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      { name: 'to', internalType: 'address', type: 'address', indexed: false },
      {
        name: 'paymaster',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'selector',
        internalType: 'bytes4',
        type: 'bytes4',
        indexed: false,
      },
      {
        name: 'status',
        internalType: 'enum IRelayHub.RelayCallStatus',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'charge',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'TransactionRelayed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'status',
        internalType: 'enum IRelayHub.RelayCallStatus',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'returnValue',
        internalType: 'bytes',
        type: 'bytes',
        indexed: false,
      },
    ],
    name: 'TransactionResult',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'dest', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Withdrawn',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IRelayRegistrar
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iRelayRegistrarAbi = [
  {
    type: 'function',
    inputs: [],
    name: 'getCreationBlock',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayHub', internalType: 'address', type: 'address' },
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'getRelayInfo',
    outputs: [
      {
        name: 'info',
        internalType: 'struct IRelayRegistrar.RelayInfo',
        type: 'tuple',
        components: [
          {
            name: 'lastSeenBlockNumber',
            internalType: 'uint32',
            type: 'uint32',
          },
          { name: 'lastSeenTimestamp', internalType: 'uint40', type: 'uint40' },
          {
            name: 'firstSeenBlockNumber',
            internalType: 'uint32',
            type: 'uint32',
          },
          {
            name: 'firstSeenTimestamp',
            internalType: 'uint40',
            type: 'uint40',
          },
          { name: 'urlParts', internalType: 'bytes32[3]', type: 'bytes32[3]' },
          { name: 'relayManager', internalType: 'address', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getRelayRegistrationMaxAge',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'relayHub', internalType: 'address', type: 'address' }],
    name: 'readRelayInfos',
    outputs: [
      {
        name: 'info',
        internalType: 'struct IRelayRegistrar.RelayInfo[]',
        type: 'tuple[]',
        components: [
          {
            name: 'lastSeenBlockNumber',
            internalType: 'uint32',
            type: 'uint32',
          },
          { name: 'lastSeenTimestamp', internalType: 'uint40', type: 'uint40' },
          {
            name: 'firstSeenBlockNumber',
            internalType: 'uint32',
            type: 'uint32',
          },
          {
            name: 'firstSeenTimestamp',
            internalType: 'uint40',
            type: 'uint40',
          },
          { name: 'urlParts', internalType: 'bytes32[3]', type: 'bytes32[3]' },
          { name: 'relayManager', internalType: 'address', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayHub', internalType: 'address', type: 'address' },
      { name: 'oldestBlockNumber', internalType: 'uint256', type: 'uint256' },
      {
        name: 'oldestBlockTimestamp',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'maxCount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'readRelayInfosInRange',
    outputs: [
      {
        name: 'info',
        internalType: 'struct IRelayRegistrar.RelayInfo[]',
        type: 'tuple[]',
        components: [
          {
            name: 'lastSeenBlockNumber',
            internalType: 'uint32',
            type: 'uint32',
          },
          { name: 'lastSeenTimestamp', internalType: 'uint40', type: 'uint40' },
          {
            name: 'firstSeenBlockNumber',
            internalType: 'uint32',
            type: 'uint32',
          },
          {
            name: 'firstSeenTimestamp',
            internalType: 'uint40',
            type: 'uint40',
          },
          { name: 'urlParts', internalType: 'bytes32[3]', type: 'bytes32[3]' },
          { name: 'relayManager', internalType: 'address', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayHub', internalType: 'address', type: 'address' },
      { name: 'url', internalType: 'bytes32[3]', type: 'bytes32[3]' },
    ],
    name: 'registerRelayServer',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'setRelayRegistrationMaxAge',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'relayHub',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'relayUrl',
        internalType: 'bytes32[3]',
        type: 'bytes32[3]',
        indexed: false,
      },
    ],
    name: 'RelayServerRegistered',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IStakeManager
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iStakeManagerAbi = [
  {
    type: 'function',
    inputs: [{ name: 'relayHub', internalType: 'address', type: 'address' }],
    name: 'authorizeHubByManager',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
      { name: 'relayHub', internalType: 'address', type: 'address' },
    ],
    name: 'authorizeHubByOwner',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'escheatAbandonedRelayStake',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getAbandonedRelayServerConfig',
    outputs: [
      {
        name: '',
        internalType: 'struct IStakeManager.AbandonedRelayServerConfig',
        type: 'tuple',
        components: [
          { name: 'devAddress', internalType: 'address', type: 'address' },
          {
            name: 'abandonmentDelay',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'escheatmentDelay',
            internalType: 'uint256',
            type: 'uint256',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getBurnAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCreationBlock',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getMaxUnstakeDelay',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'getStakeInfo',
    outputs: [
      {
        name: 'stakeInfo',
        internalType: 'struct IStakeManager.StakeInfo',
        type: 'tuple',
        components: [
          { name: 'stake', internalType: 'uint256', type: 'uint256' },
          { name: 'unstakeDelay', internalType: 'uint256', type: 'uint256' },
          { name: 'withdrawTime', internalType: 'uint256', type: 'uint256' },
          { name: 'abandonedTime', internalType: 'uint256', type: 'uint256' },
          { name: 'keepaliveTime', internalType: 'uint256', type: 'uint256' },
          { name: 'token', internalType: 'contract IERC20', type: 'address' },
          { name: 'owner', internalType: 'address', type: 'address' },
        ],
      },
      { name: 'isSenderAuthorizedHub', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'isRelayEscheatable',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'markRelayAbandoned',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'penalizeRelayManager',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_burnAddress', internalType: 'address', type: 'address' },
    ],
    name: 'setBurnAddress',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_burnAddress', internalType: 'address', type: 'address' },
    ],
    name: 'setDevAddress',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'setRelayManagerOwner',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'contract IERC20', type: 'address' },
      { name: 'relayManager', internalType: 'address', type: 'address' },
      { name: 'unstakeDelay', internalType: 'uint256', type: 'uint256' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'stakeForRelayManager',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'relayHub', internalType: 'address', type: 'address' }],
    name: 'unauthorizeHubByManager',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
      { name: 'relayHub', internalType: 'address', type: 'address' },
    ],
    name: 'unauthorizeHubByOwner',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'unlockStake',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'updateRelayKeepaliveTime',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'versionSM',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'withdrawStake',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'token',
        internalType: 'contract IERC20',
        type: 'address',
        indexed: false,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'AbandonedRelayManagerStakeEscheated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'burnAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'BurnAddressSet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'devAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'DevAddressSet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'relayHub',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'HubAuthorized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'relayHub',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'removalTime',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'HubUnauthorized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnerSet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'abandonedTime',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'RelayServerAbandoned',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'keepaliveTime',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'RelayServerKeepalive',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'token',
        internalType: 'contract IERC20',
        type: 'address',
        indexed: false,
      },
      {
        name: 'stake',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'unstakeDelay',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'StakeAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'beneficiary',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'token',
        internalType: 'contract IERC20',
        type: 'address',
        indexed: false,
      },
      {
        name: 'reward',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'StakePenalized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'withdrawTime',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'StakeUnlocked',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'token',
        internalType: 'contract IERC20',
        type: 'address',
        indexed: false,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'StakeWithdrawn',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Penalizer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const penalizerAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_penalizeBlockDelay', internalType: 'uint256', type: 'uint256' },
      {
        name: '_penalizeBlockExpiration',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'commitHash', internalType: 'bytes32', type: 'bytes32' }],
    name: 'commit',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'commits',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'rawTransaction', internalType: 'bytes', type: 'bytes' }],
    name: 'decodeTransaction',
    outputs: [
      {
        name: 'transaction',
        internalType: 'struct IPenalizer.Transaction',
        type: 'tuple',
        components: [
          { name: 'nonce', internalType: 'uint256', type: 'uint256' },
          { name: 'gasLimit', internalType: 'uint256', type: 'uint256' },
          { name: 'to', internalType: 'address', type: 'address' },
          { name: 'value', internalType: 'uint256', type: 'uint256' },
          { name: 'data', internalType: 'bytes', type: 'bytes' },
        ],
      },
    ],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getPenalizeBlockDelay',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getPenalizeBlockExpiration',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'rawTransaction', internalType: 'bytes', type: 'bytes' }],
    name: 'isTransactionTypeValid',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: 'unsignedTx', internalType: 'bytes', type: 'bytes' },
      { name: 'signature', internalType: 'bytes', type: 'bytes' },
      { name: 'hub', internalType: 'contract IRelayHub', type: 'address' },
      { name: 'randomValue', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'penalizeIllegalTransaction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'unsignedTx1', internalType: 'bytes', type: 'bytes' },
      { name: 'signature1', internalType: 'bytes', type: 'bytes' },
      { name: 'unsignedTx2', internalType: 'bytes', type: 'bytes' },
      { name: 'signature2', internalType: 'bytes', type: 'bytes' },
      { name: 'hub', internalType: 'contract IRelayHub', type: 'address' },
      { name: 'randomValue', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'penalizeRepeatedNonce',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'versionPenalizer',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'commitHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'readyBlockNumber',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'CommitAdded',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// RelayHub
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const relayHubAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_stakeManager',
        internalType: 'contract IStakeManager',
        type: 'address',
      },
      { name: '_penalizer', internalType: 'address', type: 'address' },
      { name: '_batchGateway', internalType: 'address', type: 'address' },
      { name: '_relayRegistrar', internalType: 'address', type: 'address' },
      {
        name: '_config',
        internalType: 'struct IRelayHub.RelayHubConfig',
        type: 'tuple',
        components: [
          { name: 'maxWorkerCount', internalType: 'uint256', type: 'uint256' },
          { name: 'gasReserve', internalType: 'uint256', type: 'uint256' },
          { name: 'postOverhead', internalType: 'uint256', type: 'uint256' },
          { name: 'gasOverhead', internalType: 'uint256', type: 'uint256' },
          {
            name: 'minimumUnstakeDelay',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'devAddress', internalType: 'address', type: 'address' },
          { name: 'devFee', internalType: 'uint8', type: 'uint8' },
          { name: 'baseRelayFee', internalType: 'uint80', type: 'uint80' },
          { name: 'pctRelayFee', internalType: 'uint16', type: 'uint16' },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newRelayWorkers', internalType: 'address[]', type: 'address[]' },
    ],
    name: 'addRelayWorkers',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'aggregateGasleft',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'target', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'gasUsed', internalType: 'uint256', type: 'uint256' },
      {
        name: 'relayData',
        internalType: 'struct GsnTypes.RelayData',
        type: 'tuple',
        components: [
          { name: 'maxFeePerGas', internalType: 'uint256', type: 'uint256' },
          {
            name: 'maxPriorityFeePerGas',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'transactionCalldataGasUsed',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'relayWorker', internalType: 'address', type: 'address' },
          { name: 'paymaster', internalType: 'address', type: 'address' },
          { name: 'forwarder', internalType: 'address', type: 'address' },
          { name: 'paymasterData', internalType: 'bytes', type: 'bytes' },
          { name: 'clientId', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'calculateCharge',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'charge', internalType: 'uint256', type: 'uint256' }],
    name: 'calculateDevCharge',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'target', internalType: 'address', type: 'address' }],
    name: 'depositFor',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_deprecationTime', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'deprecateHub',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'escheatAbandonedRelayBalance',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getBatchGateway',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getConfiguration',
    outputs: [
      {
        name: '',
        internalType: 'struct IRelayHub.RelayHubConfig',
        type: 'tuple',
        components: [
          { name: 'maxWorkerCount', internalType: 'uint256', type: 'uint256' },
          { name: 'gasReserve', internalType: 'uint256', type: 'uint256' },
          { name: 'postOverhead', internalType: 'uint256', type: 'uint256' },
          { name: 'gasOverhead', internalType: 'uint256', type: 'uint256' },
          {
            name: 'minimumUnstakeDelay',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'devAddress', internalType: 'address', type: 'address' },
          { name: 'devFee', internalType: 'uint8', type: 'uint8' },
          { name: 'baseRelayFee', internalType: 'uint80', type: 'uint80' },
          { name: 'pctRelayFee', internalType: 'uint16', type: 'uint16' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCreationBlock',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getDeprecationTime',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'contract IERC20', type: 'address' },
    ],
    name: 'getMinimumStakePerToken',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getPenalizer',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getRelayRegistrar',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getStakeManager',
    outputs: [
      { name: '', internalType: 'contract IStakeManager', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'manager', internalType: 'address', type: 'address' }],
    name: 'getWorkerCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'worker', internalType: 'address', type: 'address' }],
    name: 'getWorkerManager',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'domainSeparatorName', internalType: 'string', type: 'string' },
      {
        name: 'relayRequest',
        internalType: 'struct GsnTypes.RelayRequest',
        type: 'tuple',
        components: [
          {
            name: 'request',
            internalType: 'struct IForwarder.ForwardRequest',
            type: 'tuple',
            components: [
              { name: 'from', internalType: 'address', type: 'address' },
              { name: 'to', internalType: 'address', type: 'address' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'gas', internalType: 'uint256', type: 'uint256' },
              { name: 'nonce', internalType: 'uint256', type: 'uint256' },
              { name: 'data', internalType: 'bytes', type: 'bytes' },
              {
                name: 'validUntilTime',
                internalType: 'uint256',
                type: 'uint256',
              },
            ],
          },
          {
            name: 'relayData',
            internalType: 'struct GsnTypes.RelayData',
            type: 'tuple',
            components: [
              {
                name: 'maxFeePerGas',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'maxPriorityFeePerGas',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'transactionCalldataGasUsed',
                internalType: 'uint256',
                type: 'uint256',
              },
              { name: 'relayWorker', internalType: 'address', type: 'address' },
              { name: 'paymaster', internalType: 'address', type: 'address' },
              { name: 'forwarder', internalType: 'address', type: 'address' },
              { name: 'paymasterData', internalType: 'bytes', type: 'bytes' },
              { name: 'clientId', internalType: 'uint256', type: 'uint256' },
            ],
          },
        ],
      },
      { name: 'signature', internalType: 'bytes', type: 'bytes' },
      { name: 'approvalData', internalType: 'bytes', type: 'bytes' },
      {
        name: 'gasAndDataLimits',
        internalType: 'struct IPaymaster.GasAndDataLimits',
        type: 'tuple',
        components: [
          {
            name: 'acceptanceBudget',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'preRelayedCallGasLimit',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'postRelayedCallGasLimit',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'calldataSizeLimit',
            internalType: 'uint256',
            type: 'uint256',
          },
        ],
      },
      { name: 'totalInitialGas', internalType: 'uint256', type: 'uint256' },
      { name: 'maxPossibleGas', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'innerRelayCall',
    outputs: [
      {
        name: '',
        internalType: 'enum IRelayHub.RelayCallStatus',
        type: 'uint8',
      },
      { name: '', internalType: 'bytes', type: 'bytes' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'isDeprecated',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'isRelayEscheatable',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'onRelayServerRegistered',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayWorker', internalType: 'address', type: 'address' },
      { name: 'beneficiary', internalType: 'address payable', type: 'address' },
    ],
    name: 'penalize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'domainSeparatorName', internalType: 'string', type: 'string' },
      { name: 'maxAcceptanceBudget', internalType: 'uint256', type: 'uint256' },
      {
        name: 'relayRequest',
        internalType: 'struct GsnTypes.RelayRequest',
        type: 'tuple',
        components: [
          {
            name: 'request',
            internalType: 'struct IForwarder.ForwardRequest',
            type: 'tuple',
            components: [
              { name: 'from', internalType: 'address', type: 'address' },
              { name: 'to', internalType: 'address', type: 'address' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'gas', internalType: 'uint256', type: 'uint256' },
              { name: 'nonce', internalType: 'uint256', type: 'uint256' },
              { name: 'data', internalType: 'bytes', type: 'bytes' },
              {
                name: 'validUntilTime',
                internalType: 'uint256',
                type: 'uint256',
              },
            ],
          },
          {
            name: 'relayData',
            internalType: 'struct GsnTypes.RelayData',
            type: 'tuple',
            components: [
              {
                name: 'maxFeePerGas',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'maxPriorityFeePerGas',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'transactionCalldataGasUsed',
                internalType: 'uint256',
                type: 'uint256',
              },
              { name: 'relayWorker', internalType: 'address', type: 'address' },
              { name: 'paymaster', internalType: 'address', type: 'address' },
              { name: 'forwarder', internalType: 'address', type: 'address' },
              { name: 'paymasterData', internalType: 'bytes', type: 'bytes' },
              { name: 'clientId', internalType: 'uint256', type: 'uint256' },
            ],
          },
        ],
      },
      { name: 'signature', internalType: 'bytes', type: 'bytes' },
      { name: 'approvalData', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'relayCall',
    outputs: [
      { name: 'paymasterAccepted', internalType: 'bool', type: 'bool' },
      { name: 'charge', internalType: 'uint256', type: 'uint256' },
      {
        name: 'status',
        internalType: 'enum IRelayHub.RelayCallStatus',
        type: 'uint8',
      },
      { name: 'returnValue', internalType: 'bytes', type: 'bytes' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_config',
        internalType: 'struct IRelayHub.RelayHubConfig',
        type: 'tuple',
        components: [
          { name: 'maxWorkerCount', internalType: 'uint256', type: 'uint256' },
          { name: 'gasReserve', internalType: 'uint256', type: 'uint256' },
          { name: 'postOverhead', internalType: 'uint256', type: 'uint256' },
          { name: 'gasOverhead', internalType: 'uint256', type: 'uint256' },
          {
            name: 'minimumUnstakeDelay',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'devAddress', internalType: 'address', type: 'address' },
          { name: 'devFee', internalType: 'uint8', type: 'uint8' },
          { name: 'baseRelayFee', internalType: 'uint80', type: 'uint80' },
          { name: 'pctRelayFee', internalType: 'uint16', type: 'uint16' },
        ],
      },
    ],
    name: 'setConfiguration',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'contract IERC20[]', type: 'address[]' },
      { name: 'minimumStake', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'setMinimumStakes',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'verifyRelayManagerStaked',
    outputs: [],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'versionHub',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: 'dest', internalType: 'address payable', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'dest', internalType: 'address payable[]', type: 'address[]' },
      { name: 'amount', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'withdrawMultiple',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'balance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'AbandonedRelayManagerBalanceEscheated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'paymaster',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Deposited',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'deprecationTime',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'HubDeprecated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'config',
        internalType: 'struct IRelayHub.RelayHubConfig',
        type: 'tuple',
        components: [
          { name: 'maxWorkerCount', internalType: 'uint256', type: 'uint256' },
          { name: 'gasReserve', internalType: 'uint256', type: 'uint256' },
          { name: 'postOverhead', internalType: 'uint256', type: 'uint256' },
          { name: 'gasOverhead', internalType: 'uint256', type: 'uint256' },
          {
            name: 'minimumUnstakeDelay',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'devAddress', internalType: 'address', type: 'address' },
          { name: 'devFee', internalType: 'uint8', type: 'uint8' },
          { name: 'baseRelayFee', internalType: 'uint80', type: 'uint80' },
          { name: 'pctRelayFee', internalType: 'uint16', type: 'uint16' },
        ],
        indexed: false,
      },
    ],
    name: 'RelayHubConfigured',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newRelayWorkers',
        internalType: 'address[]',
        type: 'address[]',
        indexed: false,
      },
      {
        name: 'workersCount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'RelayWorkersAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'minimumStake',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'StakingTokenDataChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'paymaster',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'relayRequestID',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'from',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      { name: 'to', internalType: 'address', type: 'address', indexed: false },
      {
        name: 'relayWorker',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'selector',
        internalType: 'bytes4',
        type: 'bytes4',
        indexed: false,
      },
      {
        name: 'innerGasUsed',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'reason', internalType: 'bytes', type: 'bytes', indexed: false },
    ],
    name: 'TransactionRejectedByPaymaster',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'relayWorker',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'relayRequestID',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'from',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      { name: 'to', internalType: 'address', type: 'address', indexed: false },
      {
        name: 'paymaster',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'selector',
        internalType: 'bytes4',
        type: 'bytes4',
        indexed: false,
      },
      {
        name: 'status',
        internalType: 'enum IRelayHub.RelayCallStatus',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'charge',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'TransactionRelayed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'status',
        internalType: 'enum IRelayHub.RelayCallStatus',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'returnValue',
        internalType: 'bytes',
        type: 'bytes',
        indexed: false,
      },
    ],
    name: 'TransactionResult',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'dest', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Withdrawn',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// RelayRegistrar
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const relayRegistrarAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_relayRegistrationMaxAge',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCreationBlock',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayHub', internalType: 'address', type: 'address' },
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'getRelayInfo',
    outputs: [
      {
        name: '',
        internalType: 'struct IRelayRegistrar.RelayInfo',
        type: 'tuple',
        components: [
          {
            name: 'lastSeenBlockNumber',
            internalType: 'uint32',
            type: 'uint32',
          },
          { name: 'lastSeenTimestamp', internalType: 'uint40', type: 'uint40' },
          {
            name: 'firstSeenBlockNumber',
            internalType: 'uint32',
            type: 'uint32',
          },
          {
            name: 'firstSeenTimestamp',
            internalType: 'uint40',
            type: 'uint40',
          },
          { name: 'urlParts', internalType: 'bytes32[3]', type: 'bytes32[3]' },
          { name: 'relayManager', internalType: 'address', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getRelayRegistrationMaxAge',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'relayHub', internalType: 'address', type: 'address' }],
    name: 'readRelayInfos',
    outputs: [
      {
        name: 'info',
        internalType: 'struct IRelayRegistrar.RelayInfo[]',
        type: 'tuple[]',
        components: [
          {
            name: 'lastSeenBlockNumber',
            internalType: 'uint32',
            type: 'uint32',
          },
          { name: 'lastSeenTimestamp', internalType: 'uint40', type: 'uint40' },
          {
            name: 'firstSeenBlockNumber',
            internalType: 'uint32',
            type: 'uint32',
          },
          {
            name: 'firstSeenTimestamp',
            internalType: 'uint40',
            type: 'uint40',
          },
          { name: 'urlParts', internalType: 'bytes32[3]', type: 'bytes32[3]' },
          { name: 'relayManager', internalType: 'address', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayHub', internalType: 'address', type: 'address' },
      { name: 'oldestBlockNumber', internalType: 'uint256', type: 'uint256' },
      {
        name: 'oldestBlockTimestamp',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'maxCount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'readRelayInfosInRange',
    outputs: [
      {
        name: 'info',
        internalType: 'struct IRelayRegistrar.RelayInfo[]',
        type: 'tuple[]',
        components: [
          {
            name: 'lastSeenBlockNumber',
            internalType: 'uint32',
            type: 'uint32',
          },
          { name: 'lastSeenTimestamp', internalType: 'uint40', type: 'uint40' },
          {
            name: 'firstSeenBlockNumber',
            internalType: 'uint32',
            type: 'uint32',
          },
          {
            name: 'firstSeenTimestamp',
            internalType: 'uint40',
            type: 'uint40',
          },
          { name: 'urlParts', internalType: 'bytes32[3]', type: 'bytes32[3]' },
          { name: 'relayManager', internalType: 'address', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayHub', internalType: 'address', type: 'address' },
      { name: 'url', internalType: 'bytes32[3]', type: 'bytes32[3]' },
    ],
    name: 'registerRelayServer',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_relayRegistrationMaxAge',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    name: 'setRelayRegistrationMaxAge',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'relayHub',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'relayUrl',
        internalType: 'bytes32[3]',
        type: 'bytes32[3]',
        indexed: false,
      },
    ],
    name: 'RelayServerRegistered',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// StakeManager
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const stakeManagerAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_maxUnstakeDelay', internalType: 'uint256', type: 'uint256' },
      { name: '_abandonmentDelay', internalType: 'uint256', type: 'uint256' },
      { name: '_escheatmentDelay', internalType: 'uint256', type: 'uint256' },
      { name: '_burnAddress', internalType: 'address', type: 'address' },
      { name: '_devAddress', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'relayHub', internalType: 'address', type: 'address' }],
    name: 'authorizeHubByManager',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
      { name: 'relayHub', internalType: 'address', type: 'address' },
    ],
    name: 'authorizeHubByOwner',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'authorizedHubs',
    outputs: [
      { name: 'removalTime', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'escheatAbandonedRelayStake',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getAbandonedRelayServerConfig',
    outputs: [
      {
        name: '',
        internalType: 'struct IStakeManager.AbandonedRelayServerConfig',
        type: 'tuple',
        components: [
          { name: 'devAddress', internalType: 'address', type: 'address' },
          {
            name: 'abandonmentDelay',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'escheatmentDelay',
            internalType: 'uint256',
            type: 'uint256',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getBurnAddress',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCreationBlock',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getMaxUnstakeDelay',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'getStakeInfo',
    outputs: [
      {
        name: 'stakeInfo',
        internalType: 'struct IStakeManager.StakeInfo',
        type: 'tuple',
        components: [
          { name: 'stake', internalType: 'uint256', type: 'uint256' },
          { name: 'unstakeDelay', internalType: 'uint256', type: 'uint256' },
          { name: 'withdrawTime', internalType: 'uint256', type: 'uint256' },
          { name: 'abandonedTime', internalType: 'uint256', type: 'uint256' },
          { name: 'keepaliveTime', internalType: 'uint256', type: 'uint256' },
          { name: 'token', internalType: 'contract IERC20', type: 'address' },
          { name: 'owner', internalType: 'address', type: 'address' },
        ],
      },
      { name: 'isSenderAuthorizedHub', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'isRelayEscheatable',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'markRelayAbandoned',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
      { name: 'beneficiary', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'penalizeRelayManager',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_burnAddress', internalType: 'address', type: 'address' },
    ],
    name: 'setBurnAddress',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_devAddress', internalType: 'address', type: 'address' }],
    name: 'setDevAddress',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'setRelayManagerOwner',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'contract IERC20', type: 'address' },
      { name: 'relayManager', internalType: 'address', type: 'address' },
      { name: 'unstakeDelay', internalType: 'uint256', type: 'uint256' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'stakeForRelayManager',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'stakes',
    outputs: [
      { name: 'stake', internalType: 'uint256', type: 'uint256' },
      { name: 'unstakeDelay', internalType: 'uint256', type: 'uint256' },
      { name: 'withdrawTime', internalType: 'uint256', type: 'uint256' },
      { name: 'abandonedTime', internalType: 'uint256', type: 'uint256' },
      { name: 'keepaliveTime', internalType: 'uint256', type: 'uint256' },
      { name: 'token', internalType: 'contract IERC20', type: 'address' },
      { name: 'owner', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'relayHub', internalType: 'address', type: 'address' }],
    name: 'unauthorizeHubByManager',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
      { name: 'relayHub', internalType: 'address', type: 'address' },
    ],
    name: 'unauthorizeHubByOwner',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'unlockStake',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'updateRelayKeepaliveTime',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'versionSM',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'relayManager', internalType: 'address', type: 'address' },
    ],
    name: 'withdrawStake',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'token',
        internalType: 'contract IERC20',
        type: 'address',
        indexed: false,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'AbandonedRelayManagerStakeEscheated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'burnAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'BurnAddressSet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'devAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'DevAddressSet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'relayHub',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'HubAuthorized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'relayHub',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'removalTime',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'HubUnauthorized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnerSet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'abandonedTime',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'RelayServerAbandoned',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'keepaliveTime',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'RelayServerKeepalive',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'token',
        internalType: 'contract IERC20',
        type: 'address',
        indexed: false,
      },
      {
        name: 'stake',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'unstakeDelay',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'StakeAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'beneficiary',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'token',
        internalType: 'contract IERC20',
        type: 'address',
        indexed: false,
      },
      {
        name: 'reward',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'StakePenalized',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'withdrawTime',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'StakeUnlocked',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'relayManager',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'token',
        internalType: 'contract IERC20',
        type: 'address',
        indexed: false,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'StakeWithdrawn',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TestForwarder
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const testForwarderAbi = [
  {
    type: 'function',
    inputs: [
      {
        name: 'forwarder',
        internalType: 'contract Forwarder',
        type: 'address',
      },
      {
        name: 'req',
        internalType: 'struct IForwarder.ForwardRequest',
        type: 'tuple',
        components: [
          { name: 'from', internalType: 'address', type: 'address' },
          { name: 'to', internalType: 'address', type: 'address' },
          { name: 'value', internalType: 'uint256', type: 'uint256' },
          { name: 'gas', internalType: 'uint256', type: 'uint256' },
          { name: 'nonce', internalType: 'uint256', type: 'uint256' },
          { name: 'data', internalType: 'bytes', type: 'bytes' },
          { name: 'validUntilTime', internalType: 'uint256', type: 'uint256' },
        ],
      },
      { name: 'domainSeparator', internalType: 'bytes32', type: 'bytes32' },
      { name: 'requestTypeHash', internalType: 'bytes32', type: 'bytes32' },
      { name: 'suffixData', internalType: 'bytes', type: 'bytes' },
      { name: 'sig', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'callExecute',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'ret', internalType: 'bytes', type: 'bytes' }],
    name: 'decodeErrorMessage',
    outputs: [{ name: 'message', internalType: 'string', type: 'string' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getChainId',
    outputs: [{ name: 'id', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'success', internalType: 'bool', type: 'bool', indexed: false },
      { name: 'error', internalType: 'string', type: 'string', indexed: false },
    ],
    name: 'Result',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TestPaymasterConfigurableMisbehavior
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const testPaymasterConfigurableMisbehaviorAbi = [
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    inputs: [],
    name: 'CALLDATA_SIZE_LIMIT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'FORWARDER_HUB_OVERHEAD',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PAYMASTER_ACCEPTANCE_BUDGET',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'POST_RELAYED_CALL_GAS_LIMIT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PRE_RELAYED_CALL_GAS_LIMIT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'expensiveGasLimits',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getGasAndDataLimits',
    outputs: [
      {
        name: '',
        internalType: 'struct IPaymaster.GasAndDataLimits',
        type: 'tuple',
        components: [
          {
            name: 'acceptanceBudget',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'preRelayedCallGasLimit',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'postRelayedCallGasLimit',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'calldataSizeLimit',
            internalType: 'uint256',
            type: 'uint256',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getRelayHub',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTrustedForwarder',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'greedyAcceptanceBudget',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'outOfGasPre',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'context', internalType: 'bytes', type: 'bytes' },
      { name: 'success', internalType: 'bool', type: 'bool' },
      { name: 'gasUseWithoutPost', internalType: 'uint256', type: 'uint256' },
      {
        name: 'relayData',
        internalType: 'struct GsnTypes.RelayData',
        type: 'tuple',
        components: [
          { name: 'maxFeePerGas', internalType: 'uint256', type: 'uint256' },
          {
            name: 'maxPriorityFeePerGas',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'transactionCalldataGasUsed',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'relayWorker', internalType: 'address', type: 'address' },
          { name: 'paymaster', internalType: 'address', type: 'address' },
          { name: 'forwarder', internalType: 'address', type: 'address' },
          { name: 'paymasterData', internalType: 'bytes', type: 'bytes' },
          { name: 'clientId', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'postRelayedCall',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'relayRequest',
        internalType: 'struct GsnTypes.RelayRequest',
        type: 'tuple',
        components: [
          {
            name: 'request',
            internalType: 'struct IForwarder.ForwardRequest',
            type: 'tuple',
            components: [
              { name: 'from', internalType: 'address', type: 'address' },
              { name: 'to', internalType: 'address', type: 'address' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'gas', internalType: 'uint256', type: 'uint256' },
              { name: 'nonce', internalType: 'uint256', type: 'uint256' },
              { name: 'data', internalType: 'bytes', type: 'bytes' },
              {
                name: 'validUntilTime',
                internalType: 'uint256',
                type: 'uint256',
              },
            ],
          },
          {
            name: 'relayData',
            internalType: 'struct GsnTypes.RelayData',
            type: 'tuple',
            components: [
              {
                name: 'maxFeePerGas',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'maxPriorityFeePerGas',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'transactionCalldataGasUsed',
                internalType: 'uint256',
                type: 'uint256',
              },
              { name: 'relayWorker', internalType: 'address', type: 'address' },
              { name: 'paymaster', internalType: 'address', type: 'address' },
              { name: 'forwarder', internalType: 'address', type: 'address' },
              { name: 'paymasterData', internalType: 'bytes', type: 'bytes' },
              { name: 'clientId', internalType: 'uint256', type: 'uint256' },
            ],
          },
        ],
      },
      { name: 'signature', internalType: 'bytes', type: 'bytes' },
      { name: 'approvalData', internalType: 'bytes', type: 'bytes' },
      { name: 'maxPossibleGas', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'preRelayedCall',
    outputs: [
      { name: '', internalType: 'bytes', type: 'bytes' },
      { name: '', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'returnInvalidErrorCode',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'revertPostRelayCall',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'revertPreRelayCall',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'revertPreRelayCallOnEvenBlocks',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'val', internalType: 'bool', type: 'bool' }],
    name: 'setExpensiveGasLimits',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'acceptanceBudget', internalType: 'uint256', type: 'uint256' },
      {
        name: 'preRelayedCallGasLimit',
        internalType: 'uint256',
        type: 'uint256',
      },
      {
        name: 'postRelayedCallGasLimit',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    name: 'setGasLimits',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'val', internalType: 'bool', type: 'bool' }],
    name: 'setGreedyAcceptanceBudget',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'val', internalType: 'bool', type: 'bool' }],
    name: 'setOutOfGasPre',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'hub', internalType: 'contract IRelayHub', type: 'address' },
    ],
    name: 'setRelayHub',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'val', internalType: 'bool', type: 'bool' }],
    name: 'setReturnInvalidErrorCode',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'val', internalType: 'bool', type: 'bool' }],
    name: 'setRevertPostRelayCall',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'val', internalType: 'bool', type: 'bool' }],
    name: 'setRevertPreRelayCall',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'val', internalType: 'bool', type: 'bool' }],
    name: 'setRevertPreRelayCallOnEvenBlocks',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'on', internalType: 'bool', type: 'bool' }],
    name: 'setTrustRecipientRevert',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'forwarder', internalType: 'address', type: 'address' }],
    name: 'setTrustedForwarder',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'val', internalType: 'bool', type: 'bool' }],
    name: 'setWithdrawDuringPostRelayedCall',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'val', internalType: 'bool', type: 'bool' }],
    name: 'setWithdrawDuringPreRelayedCall',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'versionPaymaster',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'destination', internalType: 'address payable', type: 'address' },
    ],
    name: 'withdrawAll',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'withdrawAllBalance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'withdrawDuringPostRelayedCall',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'withdrawDuringPreRelayedCall',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'target', internalType: 'address payable', type: 'address' },
    ],
    name: 'withdrawRelayHubDepositTo',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'success', internalType: 'bool', type: 'bool', indexed: false },
      {
        name: 'actualCharge',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'SampleRecipientPostCall',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [],
    name: 'SampleRecipientPreCall',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TestPaymasterEverythingAccepted
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const testPaymasterEverythingAcceptedAbi = [
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    inputs: [],
    name: 'CALLDATA_SIZE_LIMIT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'FORWARDER_HUB_OVERHEAD',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PAYMASTER_ACCEPTANCE_BUDGET',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'POST_RELAYED_CALL_GAS_LIMIT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PRE_RELAYED_CALL_GAS_LIMIT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getGasAndDataLimits',
    outputs: [
      {
        name: 'limits',
        internalType: 'struct IPaymaster.GasAndDataLimits',
        type: 'tuple',
        components: [
          {
            name: 'acceptanceBudget',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'preRelayedCallGasLimit',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'postRelayedCallGasLimit',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'calldataSizeLimit',
            internalType: 'uint256',
            type: 'uint256',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getRelayHub',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTrustedForwarder',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'context', internalType: 'bytes', type: 'bytes' },
      { name: 'success', internalType: 'bool', type: 'bool' },
      { name: 'gasUseWithoutPost', internalType: 'uint256', type: 'uint256' },
      {
        name: 'relayData',
        internalType: 'struct GsnTypes.RelayData',
        type: 'tuple',
        components: [
          { name: 'maxFeePerGas', internalType: 'uint256', type: 'uint256' },
          {
            name: 'maxPriorityFeePerGas',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'transactionCalldataGasUsed',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'relayWorker', internalType: 'address', type: 'address' },
          { name: 'paymaster', internalType: 'address', type: 'address' },
          { name: 'forwarder', internalType: 'address', type: 'address' },
          { name: 'paymasterData', internalType: 'bytes', type: 'bytes' },
          { name: 'clientId', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'postRelayedCall',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'relayRequest',
        internalType: 'struct GsnTypes.RelayRequest',
        type: 'tuple',
        components: [
          {
            name: 'request',
            internalType: 'struct IForwarder.ForwardRequest',
            type: 'tuple',
            components: [
              { name: 'from', internalType: 'address', type: 'address' },
              { name: 'to', internalType: 'address', type: 'address' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'gas', internalType: 'uint256', type: 'uint256' },
              { name: 'nonce', internalType: 'uint256', type: 'uint256' },
              { name: 'data', internalType: 'bytes', type: 'bytes' },
              {
                name: 'validUntilTime',
                internalType: 'uint256',
                type: 'uint256',
              },
            ],
          },
          {
            name: 'relayData',
            internalType: 'struct GsnTypes.RelayData',
            type: 'tuple',
            components: [
              {
                name: 'maxFeePerGas',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'maxPriorityFeePerGas',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'transactionCalldataGasUsed',
                internalType: 'uint256',
                type: 'uint256',
              },
              { name: 'relayWorker', internalType: 'address', type: 'address' },
              { name: 'paymaster', internalType: 'address', type: 'address' },
              { name: 'forwarder', internalType: 'address', type: 'address' },
              { name: 'paymasterData', internalType: 'bytes', type: 'bytes' },
              { name: 'clientId', internalType: 'uint256', type: 'uint256' },
            ],
          },
        ],
      },
      { name: 'signature', internalType: 'bytes', type: 'bytes' },
      { name: 'approvalData', internalType: 'bytes', type: 'bytes' },
      { name: 'maxPossibleGas', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'preRelayedCall',
    outputs: [
      { name: '', internalType: 'bytes', type: 'bytes' },
      { name: '', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'hub', internalType: 'contract IRelayHub', type: 'address' },
    ],
    name: 'setRelayHub',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'forwarder', internalType: 'address', type: 'address' }],
    name: 'setTrustedForwarder',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'versionPaymaster',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'destination', internalType: 'address payable', type: 'address' },
    ],
    name: 'withdrawAll',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'target', internalType: 'address payable', type: 'address' },
    ],
    name: 'withdrawRelayHubDepositTo',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'success', internalType: 'bool', type: 'bool', indexed: false },
      {
        name: 'actualCharge',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'SampleRecipientPostCall',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [],
    name: 'SampleRecipientPreCall',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TestRelayWorkerContract
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const testRelayWorkerContractAbi = [
  {
    type: 'function',
    inputs: [
      { name: 'hub', internalType: 'contract IRelayHub', type: 'address' },
      { name: 'maxAcceptanceBudget', internalType: 'uint256', type: 'uint256' },
      {
        name: 'relayRequest',
        internalType: 'struct GsnTypes.RelayRequest',
        type: 'tuple',
        components: [
          {
            name: 'request',
            internalType: 'struct IForwarder.ForwardRequest',
            type: 'tuple',
            components: [
              { name: 'from', internalType: 'address', type: 'address' },
              { name: 'to', internalType: 'address', type: 'address' },
              { name: 'value', internalType: 'uint256', type: 'uint256' },
              { name: 'gas', internalType: 'uint256', type: 'uint256' },
              { name: 'nonce', internalType: 'uint256', type: 'uint256' },
              { name: 'data', internalType: 'bytes', type: 'bytes' },
              {
                name: 'validUntilTime',
                internalType: 'uint256',
                type: 'uint256',
              },
            ],
          },
          {
            name: 'relayData',
            internalType: 'struct GsnTypes.RelayData',
            type: 'tuple',
            components: [
              {
                name: 'maxFeePerGas',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'maxPriorityFeePerGas',
                internalType: 'uint256',
                type: 'uint256',
              },
              {
                name: 'transactionCalldataGasUsed',
                internalType: 'uint256',
                type: 'uint256',
              },
              { name: 'relayWorker', internalType: 'address', type: 'address' },
              { name: 'paymaster', internalType: 'address', type: 'address' },
              { name: 'forwarder', internalType: 'address', type: 'address' },
              { name: 'paymasterData', internalType: 'bytes', type: 'bytes' },
              { name: 'clientId', internalType: 'uint256', type: 'uint256' },
            ],
          },
        ],
      },
      { name: 'signature', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'relayCall',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const
