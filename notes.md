# Notes

This repo holds notes for an attempt at self-hosting the [AvaCloud Gas Relayer](https://docs.avacloud.io/portal/gasless-transactions/ava-cloud-gas-relayer-developer-guide) which seems to be using the [EIP-2771](https://eips.ethereum.org/EIPS/eip-2771) standard.

Through the AvaCloud Portal, a Gas Relayer deployment is:
- Forwarder Contract deployment and configuration
- Relayer funding
- Relayer deployment

The "Relayer deployment" is opaque but it could be a running a [GSN Relay Server](https://docs.opengsn.org/relay-server/tutorial.html).

## Setup

```bash
# Use our own fork of the GSN CLI
git clone -b foundry-migration git@github.com:AshAvalanche/gsn.git

# Follow the instructions in the README.md file to build the GSN CLI
```

## Deploy Relay Hub contract

```bash
export PK="0x..."

gsn deploy \
    --burnAddress 0x000000000000000000000000000000000000dead \
    --devAddress 0x92687d02e871D78f809bc2AFAC950bB39967E557 \
    --stakingToken 0x1111111111111111111111111111111111111111 \
    --skipConfirmation \
    --testPaymaster \
    -n $L1_RPC_URL \
    --privateKeyHex $PK
```

Output:

```bash
Deployed GSN to network: $L1_RPC_URL

  RelayHub: 0x0457d687553a2e904dc3a33e4f164c10e032dbc7
  RelayRegistrar: 0xf3552b2a6994f2c5b3ff3be9ea576676068b8b71
  StakeManager: 0x2b2ef0df274d6a45171977cc9044abaf7a2094e2
  Penalizer: 0xa38559a96b72900785d2b6d6367e29a0f343eaeb
  Forwarder: 0x0d447e6b755efab59091b00ac1dd4017eab29439
  TestToken (test only): 0x1111111111111111111111111111111111111111
  Paymaster (Default): 0xa94ef4de334965ded67944de5c9a4a6efd45ddad
```

## Run the relayer via Docker image

Edit the `gsn/dockers/config/gsn-relay-config.json` file to set the correct values, e.g.:

```json
{
  "url": "http://localhost",
  "workdir": "./app/data",
  "relayHubAddress": "0x0457d687553a2e904dc3a33e4f164c10e032dbc7",
  "managerStakeTokenAddress": "0x1111111111111111111111111111111111111111",
  "ownerAddress": "0x92687d02e871D78f809bc2AFAC950bB39967E557",
  "gasPriceFactor": 1,
  "ethereumNodeUrl": "$L1_RPC_URL"
}
```

Start the containers:

```bash
cd gsn/dockers
docker compose up -d
```

The relayer responds at `localhost:8080/getaddr` but we can see that it's not ready:

```json
{
  "relayWorkerAddress": "0xbfe2d11e86ffed5868d13b4a987b0b95136924fd",
  "relayManagerAddress": "0x49d562615542533d47e5d2553424503a2204f24f",
  "relayHubAddress": "0x0457d687553a2e904dc3a33e4f164c10e032dbc7",
  "ownerAddress": "0x92687d02e871D78f809bc2AFAC950bB39967E557",
  "minMaxPriorityFeePerGas": "1",
  "maxMaxFeePerGas": "500000000000",
  "minMaxFeePerGas": "1000000000",
  "maxAcceptanceBudget": "285252",
  "chainId": "40899",
  "networkId": "40899",
  "ready": false,
  "version": "3.0.0-beta.3"
}
```

Running `docker compose logs gsn`, we can see some pre-requisites are not met for the relayer to be ready:

```bash
gsn  | Not registered yet. Prerequisites:
gsn  | Balance        | wrong          | actual: 0 ETH (0x0000...000) | required: 0.1 ETH (0x0000...000)
gsn  | Stake          | wrong          | actual: 0 WSZKT (0x1111...111) | required: 0.000000000000000001 WSZKT (0x1111...111)
gsn  | Hub authorized | wrong
gsn  | Stake locked   | wrong
gsn  | Manager        | 0x49d562615542533d47e5d2553424503a2204f24f
gsn  | Worker         | 0xbfe2d11e86ffed5868d13b4a987b0b95136924fd
gsn  | Stake Owner    | not set yet
gsn  | Config Owner   | 0x92687d02e871D78f809bc2AFAC950bB39967E557
```

## Register the Relayer

We can manually fund the relayer's worker and manager address with ETH:

```bash
cast send 0xbfe2d11e86ffed5868d13b4a987b0b95136924fd --value 1ether --rpc-url $L1_RPC_URL --private-key $PK
cast send 0x49d562615542533d47e5d2553424503a2204f24f --value 1ether --rpc-url $L1_RPC_URL --private-key $PK
```

The relayer is happy in the logs:

```bash
gsn  | warn:    Worker Balance requirement is now satisfied
gsn  | Worker Balance | good           | actual: 1 ETH (0x0000...000) | required: 0.1 ETH (0x0000...000)
gsn  | warn:    Balance requirement is now satisfied
gsn  | Balance        | good           | actual: 1 ETH (0x0000...000) | required: 0.1 ETH (0x0000...000)
```

It attempts to register but can't because of staking requirements:

```bash
gsn  | debug:   will attempt registration: isRegistrationPending=false isRegistrationCorrect=false forceRegistration=true
gsn  | debug:   will not actually attempt registration - prerequisites not satisfied
```

Stake WETH with `relayer-register` command executor:

```bash
cast send 0x1111111111111111111111111111111111111111 "deposit()" --value 1ether --rpc-url $L1_RPC_URL --private-key $PK
```

Register the relayer:

```bash
gsn relayer-register \
    -n $L1_RPC_URL \
    --privateKeyHex $PK --relayUrl http://localhost:8080
```

Output:

```bash
Relay registered successfully! Transactions:
 [
  '0x90f7e225231ef2d21425dd136abd7298f3747d3abc7d8a6cb7ff7219b167f5a8',
  '0xee75cb9a831afb775c8aad21f6a48745039f40c2c29dee4967391b1c3c51849b'
]
```

We can see at `localhost:8080/getaddr` that the relayer is now ready:

```json
{
  "relayWorkerAddress": "0xbfe2d11e86ffed5868d13b4a987b0b95136924fd",
  "relayManagerAddress": "0x49d562615542533d47e5d2553424503a2204f24f",
  "relayHubAddress": "0x0457d687553a2e904dc3a33e4f164c10e032dbc7",
  "ownerAddress": "0x92687d02e871D78f809bc2AFAC950bB39967E557",
  "minMaxPriorityFeePerGas": "1",
  "maxMaxFeePerGas": "500000000000",
  "minMaxFeePerGas": "1000000000",
  "maxAcceptanceBudget": "285252",
  "chainId": "40899",
  "networkId": "40899",
  "ready": true,
  "version": "3.0.0-beta.3"
}
```

## Deploy trusted forwarder contract

Following the [AvaLabs docs](https://github.com/ava-labs/avalanche-evm-gasless-transaction) from this point.

```bash
export PK="0x..."

forge create \
    --private-key $PK \
    --rpc-url $L1_RPC_URL \
    --broadcast \
    src/Forwarder.sol:Forwarder
```

Output:

```bash
Deployer: 0x92687d02e871D78f809bc2AFAC950bB39967E557
Deployed to: 0xdF73152d17f311118c3a723B016B98be1a2E1446
Transaction hash: 0x4972fcef685f9ec22bd81840ceda9896932e4b8daf9d96a4be75f0143bdb00d2
```

## Register the domain separator and request type with the trusted forwarder

```bash
cast send \
    --private-key $PK \
    --rpc-url $L1_RPC_URL \
    0xdF73152d17f311118c3a723B016B98be1a2E1446 \
    "registerDomainSeparator(string name, string version)" \
    "my domain name" \
    "1"

cast send \
    --private-key $PK \
    --rpc-url $L1_RPC_URL \
    0xdF73152d17f311118c3a723B016B98be1a2E1446 \
    "registerRequestType(string typeName, string typeSuffix)" \
    "my type name" \
    "bytes8 typeSuffixDatadatadatada)"
```

## Deploy a simple test `GaslessCounter` contract that is EIP-2771 compliant

```bash
forge create \
    --private-key $PK \
    --rpc-url $L1_RPC_URL \
    --broadcast \
    src/GaslessCounter.sol:GaslessCounter \
    --constructor-args 0xdF73152d17f311118c3a723B016B98be1a2E1446
```

Output:

```bash
Deployer: 0x92687d02e871D78f809bc2AFAC950bB39967E557
Deployed to: 0x049B17E2E179a212e12713F9cC3df4563abE4345
Transaction hash: 0x77c09b8926548237b291c4c1e3c831cf8e2a14e6ea1e3862542c82e2592ad72d
```

## Test without gas

```bash
# THIS SHOULD FAIL
# account with no balance cannot send any transaction
# due to no gas
#
# private key "1af42b797a6bfbd3cf7554bed261e876db69190f5eb1b806acbd72046ee957c3"
# maps to "0xb513578fAb80487a7Af50e0b2feC381D0BD8fa9D"
cast send \
    --private-key=1af42b797a6bfbd3cf7554bed261e876db69190f5eb1b806acbd72046ee957c3 \
    --rpc-url $L1_RPC_URL \
    0x049B17E2E179a212e12713F9cC3df4563abE4345 \
    "increment()"
```

Output:

```bash
Error: Failed to estimate gas: server returned an error response: error code -32000: insufficient funds for transfer
```

Confirm that the transactions were NOT processed:

```bash
cast call \
    --rpc-url $L1_RPC_URL \
    0x049B17E2E179a212e12713F9cC3df4563abE4345 \
    "getNumber()" | sed -r '/^\s*$/d' | tail -1

cast call \
    --rpc-url $L1_RPC_URL \
    0x049B17E2E179a212e12713F9cC3df4563abE4345 \
    "getLast()"
```

## Test via Gas Relayer Server

```bash
./target/release/avalanche-evm-gasless-transaction \
    gasless-counter-increment \
    --gas-relayer-server-rpc-url http://localhost:8080/relay \
    --chain-rpc-url $L1_RPC_URL \
    --trusted-forwarder-contract-address 0xdF73152d17f311118c3a723B016B98be1a2E1446 \
    --recipient-contract-address 0x049B17E2E179a212e12713F9cC3df4563abE4345 \
    --domain-name "my domain name" \
    --domain-version "1" \
    --type-name "my type name" \
    --type-suffix-data "bytes8 typeSuffixDatadatadatada)" \
    --skip-prompt
```

This currently fails with:

```bash
called `Result::unwrap()` on an `Err` value: JsonRpcClientError(SerdeJson { err: Error("invalid type: string \"Expected property `relayRequest` to exist in object\", expected struct JsonRpcError", line: 1, column: 62), text: "{\"error\":\"Expected property `relayRequest` to exist in object\"}" })
```

**Note:** The AvaLabs [docs](https://github.com/ava-labs/avalanche-evm-gasless-transaction?tab=readme-ov-file#step-8-test-counter-contract-in-rust) mention that "http://127.0.0.1:9876/rpc-sync is the gas relayer server RPC URL". In our case, the GSN Relayer has a `/relay` endpoint but it does not seem capable of handling JSON-RPC requests.
