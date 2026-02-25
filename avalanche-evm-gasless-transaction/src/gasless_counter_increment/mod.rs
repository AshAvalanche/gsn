#![allow(deprecated)]

use std::io::{self, stdout};

use avalanche_types::{
    evm::abi,
    jsonrpc::client::evm as json_client_evm,
    key::secp256k1::private_key::Key,
    wallet::evm as wallet_evm,
};

use clap::{Arg, Command};
use crossterm::{
    execute,
    style::{Color, Print, ResetColor, SetForegroundColor},
};
use ethers::prelude::Eip1559TransactionRequest;
use ethers_core::{
    abi::{Function, Param, ParamType, StateMutability, Token},
    types::{transaction::eip2718::TypedTransaction, H160, H256, U256},
    utils::keccak256,
};
use ethers_providers::Middleware;
use tokio::time::Duration;
use serde_json::json;

pub const NAME: &str = "gasless-counter-increment";

// ─── GSN EIP-712 constants ───────────────────────────────────────────────────

const GENERIC_PARAMS: &str =
    "address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data,uint256 validUntilTime";

const RELAYDATA_TYPE: &str =
    "RelayData(uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,uint256 transactionCalldataGasUsed,address relayWorker,address paymaster,address forwarder,bytes paymasterData,uint256 clientId)";

// ─── RelayData struct (for signing) ──────────────────────────────────────────

struct RelayDataValues {
    max_fee_per_gas: U256,
    max_priority_fee_per_gas: U256,
    transaction_calldata_gas_used: U256,
    relay_worker: H160,
    paymaster: H160,
    forwarder: H160,
    paymaster_data: Vec<u8>,
    client_id: U256,
}

// ─── EIP-712 helpers ─────────────────────────────────────────────────────────

fn h160_to_bytes32(addr: H160) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[12..].copy_from_slice(&addr.to_fixed_bytes());
    out
}

fn u256_to_bytes32(v: U256) -> [u8; 32] {
    let mut out = [0u8; 32];
    v.to_big_endian(&mut out);
    out
}

/// keccak256(RELAYDATA_TYPE)
fn relaydata_typehash() -> [u8; 32] {
    keccak256(RELAYDATA_TYPE)
}

/// Mirrors GsnEip712Library.hashRelayData()
fn hash_relay_data(rd: &RelayDataValues) -> [u8; 32] {
    let encoded = [
        &relaydata_typehash()[..],
        &u256_to_bytes32(rd.max_fee_per_gas)[..],
        &u256_to_bytes32(rd.max_priority_fee_per_gas)[..],
        &u256_to_bytes32(rd.transaction_calldata_gas_used)[..],
        &h160_to_bytes32(rd.relay_worker)[..],
        &h160_to_bytes32(rd.paymaster)[..],
        &h160_to_bytes32(rd.forwarder)[..],
        &keccak256(&rd.paymaster_data)[..],   // bytes fields are keccak'd
        &u256_to_bytes32(rd.client_id)[..],
    ]
    .concat();
    keccak256(encoded)
}

/// keccak256(typeName + "(" + GENERIC_PARAMS + "," + type_suffix_str)
fn relay_request_typehash(type_name: &str, type_suffix_str: &str) -> [u8; 32] {
    let full = format!("{type_name}({GENERIC_PARAMS},{type_suffix_str}");
    keccak256(full)
}

/// Mirrors GsnEip712Library.domainSeparator() + hashDomain()
fn domain_separator(name: &str, version: &str, chain_id: U256, verifying_contract: H160) -> [u8; 32] {
    let type_hash = keccak256(b"EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    let encoded = [
        &type_hash[..],
        &keccak256(name)[..],
        &keccak256(version)[..],
        &u256_to_bytes32(chain_id)[..],
        &h160_to_bytes32(verifying_contract)[..],
    ]
    .concat();
    keccak256(encoded)
}

/// Full EIP-712 struct hash for RelayRequest (mirrors Forwarder._getEncoded).
/// suffixData = abi.encode(hashRelayData(rd)) = the 32-byte hash itself
/// (ABI encoding of a bytes32 value is just the 32 bytes, no offset needed)
fn relay_request_struct_hash(
    type_name: &str,
    type_suffix_str: &str,
    from: H160,
    to: H160,
    value: U256,
    gas: U256,
    nonce: U256,
    data: &[u8],
    valid_until_time: U256,
    rd: &RelayDataValues,
) -> [u8; 32] {
    let type_hash = relay_request_typehash(type_name, type_suffix_str);
    let relay_data_hash = hash_relay_data(rd); // 32 bytes = suffixData

    let encoded = [
        &type_hash[..],
        &h160_to_bytes32(from)[..],
        &h160_to_bytes32(to)[..],
        &u256_to_bytes32(value)[..],
        &u256_to_bytes32(gas)[..],
        &u256_to_bytes32(nonce)[..],
        &keccak256(data)[..],         // bytes data → keccak'd
        &u256_to_bytes32(valid_until_time)[..],
        &relay_data_hash[..],          // suffixData = hashRelayData
    ]
    .concat();
    keccak256(encoded)
}

/// Signs a GSN RelayRequest according to EIP-712.
/// Returns the 65-byte signature (r|s|v).
async fn sign_gsn_relay_request(
    signer: &ethers_signers::LocalWallet,
    domain_name: &str,
    domain_version: &str,
    chain_id: U256,
    forwarder: H160,
    from: H160,
    to: H160,
    value: U256,
    gas: U256,
    nonce: U256,
    data: &[u8],
    valid_until_time: U256,
    type_name: &str,
    type_suffix_str: &str,
    rd: &RelayDataValues,
) -> io::Result<Vec<u8>> {
    let dom_sep = domain_separator(domain_name, domain_version, chain_id, forwarder);
    let struct_hash = relay_request_struct_hash(
        type_name,
        type_suffix_str,
        from, to, value, gas, nonce, data, valid_until_time, rd,
    );

    // "\x19\x01" || domainSeparator || structHash
    let digest_input = [b"\x19\x01".as_ref(), &dom_sep, &struct_hash].concat();
    let digest = keccak256(digest_input);
    let digest_h256 = H256::from_slice(&digest);

    // sign_hash signs the 32-byte digest directly, without adding the Ethereum message prefix
    // (which would corrupt the EIP-712 digest we already computed)
    let sig = signer
        .sign_hash(digest_h256)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("sign_hash failed: {e}")))?;

    Ok(sig.to_vec())
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

pub fn command() -> Command {
    Command::new(NAME)
        .about("Increments the counter")
        .arg(
            Arg::new("LOG_LEVEL")
                .long("log-level")
                .short('l')
                .help("Sets the log level")
                .required(false)
                .num_args(1)
                .value_parser(["debug", "info"])
                .default_value("info"),
        )
        .arg(
            Arg::new("KEY")
                .long("key")
                .help("Hex-formatted key for signing")
                .required(false)
                .num_args(1),
        )
        .arg(
            Arg::new("GAS_RELAYER_SERVER_RPC_URL")
                .long("gas-relayer-server-rpc-url")
                .help("Gas relayer server RPC URL")
                .required(true)
                .num_args(1),
        )
        .arg(
            Arg::new("CHAIN_RPC_URL")
                .long("chain-rpc-url")
                .help("Chain RPC URL")
                .required(true)
                .num_args(1),
        )
        .arg(
            Arg::new("TRUSTED_FORWARDER_CONTRACT_ADDRESS")
                .long("trusted-forwarder-contract-address")
                .help("Sets the trusted forwarder contract address")
                .required(true)
                .num_args(1),
        )
        .arg(
            Arg::new("RECIPIENT_CONTRACT_ADDRESS")
                .long("recipient-contract-address")
                .help("Sets the recipient contract address")
                .required(true)
                .num_args(1),
        )
        .arg(
            Arg::new("DOMAIN_NAME")
                .long("domain-name")
                .help("Sets the domain name (must be registered before)")
                .required(true)
                .num_args(1),
        )
        .arg(
            Arg::new("DOMAIN_VERSION")
                .long("domain-version")
                .help("Sets the domain version (must be registered before)")
                .required(true)
                .num_args(1),
        )
        .arg(
            Arg::new("TYPE_NAME")
                .long("type-name")
                .help("Sets the type name (must be registered before)")
                .required(true)
                .num_args(1),
        )
        .arg(
            Arg::new("TYPE_SUFFIX_DATA")
                .long("type-suffix-data")
                .help("Sets the type suffix data (must be registered before)")
                .required(true)
                .num_args(1),
        )
        .arg(
            Arg::new("RELAY_WORKER_ADDRESS")
                .long("relay-worker-address")
                .help("Relay worker address (from the relay server's /getaddr endpoint)")
                .required(true)
                .num_args(1),
        )
        .arg(
            Arg::new("PAYMASTER_CONTRACT_ADDRESS")
                .long("paymaster-contract-address")
                .help("Paymaster contract address")
                .required(true)
                .num_args(1),
        )
        .arg(
            Arg::new("RELAY_HUB_CONTRACT_ADDRESS")
                .long("relay-hub-contract-address")
                .help("RelayHub contract address")
                .required(true)
                .num_args(1),
        )
        .arg(
            Arg::new("SKIP_PROMPT")
                .long("skip-prompt")
                .short('s')
                .help("Skips prompt mode")
                .required(false)
                .num_args(0),
        )
}

pub async fn execute(
    log_level: &str,
    key: &str,
    gas_relayer_server_rpc_url: &str,
    chain_rpc_url: &str,
    trusted_forwarder_contract_address: H160,
    recipient_contract_address: H160,
    domain_name: &str,
    domain_version: &str,
    type_name: &str,
    type_suffix_data: &str,
    relay_worker_address: &str,
    paymaster_contract_address: &str,
    relay_hub_contract_address: &str,
    skip_prompt: bool,
) -> io::Result<()> {
    env_logger::init_from_env(
        env_logger::Env::default().filter_or(env_logger::DEFAULT_FILTER_ENV, log_level),
    );

    let no_gas_key = if key.is_empty() {
        Key::generate()?
    } else {
        Key::from_hex(key)?
    };
    let no_gas_key_signer: ethers_signers::LocalWallet =
        no_gas_key.to_ethers_core_signing_key().into();

    execute!(
        stdout(),
        SetForegroundColor(Color::Green),
        Print(format!(
            "\nLoaded key: '{}'\n",
            no_gas_key.to_public_key().to_eth_address()
        )),
        ResetColor
    )?;

    let chain_id = json_client_evm::chain_id(chain_rpc_url).await.unwrap();
    log::info!(
        "running against {chain_rpc_url}, chain_id={chain_id}, forwarder={trusted_forwarder_contract_address}, recipient={recipient_contract_address}"
    );

    if !skip_prompt {
        use dialoguer::{theme::ColorfulTheme, Select};
        let options = &[
            format!("No, I am not ready to increment with the recipient contract {recipient_contract_address}."),
            format!("Yes, let's increment with the recipient contract {recipient_contract_address}."),
        ];
        let selected = Select::with_theme(&ColorfulTheme::default())
            .with_prompt("Select your 'gasless-counter-increment' option")
            .items(&options[..])
            .default(0)
            .interact()
            .unwrap();
        if selected == 0 {
            return Ok(());
        }
    } else {
        log::info!("skipping prompt...");
    }

    log::info!("incrementing");

    let chain_rpc_provider = wallet_evm::new_provider(
        chain_rpc_url,
        Duration::from_secs(15),
        Duration::from_secs(30),
        10,
        Duration::from_secs(3),
    )
    .unwrap();
    log::info!("created chain rpc provider for {chain_rpc_url}");

    // ─── Get forwarder nonce ──────────────────────────────────────────────────
    let tx = Eip1559TransactionRequest::new()
        .chain_id(chain_id.as_u64())
        .to(ethers::prelude::H160::from(
            trusted_forwarder_contract_address.as_fixed_bytes(),
        ))
        .data(get_nonce_calldata(no_gas_key.to_public_key().to_h160()));
    let tx: TypedTransaction = tx.into();
    let output = chain_rpc_provider.call(&tx, None).await.unwrap();
    let forwarder_nonce = U256::from_big_endian(&output);
    log::info!(
        "forwarder nonce for {}: {}",
        no_gas_key.to_public_key().to_h160(),
        forwarder_nonce
    );

    // ─── Build increment() calldata ───────────────────────────────────────────
    let func = Function {
        name: "increment".to_string(),
        inputs: vec![],
        outputs: Vec::new(),
        constant: None,
        state_mutability: StateMutability::NonPayable,
    };
    let calldata = abi::encode_calldata(func, &[]).unwrap();
    log::info!("increment calldata: 0x{}", hex::encode(&calldata));

    // ─── Estimate gas (direct call from user to recipient) ────────────────────
    let est_tx = Eip1559TransactionRequest::new()
        .chain_id(chain_id.as_u64())
        .from(ethers::prelude::H160::from(
            no_gas_key.to_public_key().to_h160().as_fixed_bytes(),
        ))
        .to(ethers::prelude::H160::from(
            recipient_contract_address.as_fixed_bytes(),
        ))
        .data(ethers::types::Bytes::from(calldata.clone()));
    let est_tx: TypedTransaction = est_tx.into();
    let estimated_gas = chain_rpc_provider
        .estimate_gas(&est_tx, None)
        .await
        .unwrap_or_else(|e| {
            log::warn!("gas estimation failed ({e}), using default 100_000");
            U256::from(100_000u64)
        });
    log::info!("estimated gas: {estimated_gas}");

    // ─── RelayData values ─────────────────────────────────────────────────────
    let max_fee_per_gas = U256::from(25_000_000_000u64);      // 25 gwei
    let max_priority_fee_per_gas = U256::from(2_500_000_000u64); // 2.5 gwei
    let transaction_calldata_gas_used = U256::from(12000u64);
    let relay_worker: H160 = relay_worker_address
        .parse()
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidInput, format!("bad relay_worker: {e}")))?;
    let paymaster: H160 = paymaster_contract_address
        .parse()
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidInput, format!("bad paymaster: {e}")))?;
    let forwarder = trusted_forwarder_contract_address;
    let client_id = U256::from(1u64);
    let paymaster_data: Vec<u8> = vec![];

    let relay_data = RelayDataValues {
        max_fee_per_gas,
        max_priority_fee_per_gas,
        transaction_calldata_gas_used,
        relay_worker,
        paymaster,
        forwarder,
        paymaster_data: paymaster_data.clone(),
        client_id,
    };

    // ─── EIP-712 signature over full RelayRequest (including relayData) ───────
    let chain_id_u256 = chain_id;
    let signature_bytes = sign_gsn_relay_request(
        &no_gas_key_signer,
        domain_name,
        domain_version,
        chain_id_u256,
        forwarder,
        no_gas_key.to_public_key().to_h160(),
        recipient_contract_address,
        U256::zero(),       // value
        estimated_gas,      // gas (from estimate)
        forwarder_nonce,
        &calldata,
        U256::MAX,          // validUntilTime
        type_name,
        type_suffix_data,
        &relay_data,
    )
    .await?;
    let sig_hex = format!("0x{}", hex::encode(&signature_bytes));
    log::info!("signature: {sig_hex}");

    // ─── Build GSN RelayTransactionRequest body ───────────────────────────────
    let body = json!({
        "relayRequest": {
            "request": {
                "from": format!("{:#x}", no_gas_key.to_public_key().to_h160()),
                "to": format!("{:#x}", recipient_contract_address),
                "data": format!("0x{}", hex::encode(&calldata)),
                "value": "0",
                "nonce": forwarder_nonce.to_string(),
                "gas": estimated_gas.to_string(),
                "validUntilTime": "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
            },
            "relayData": {
                "maxFeePerGas": max_fee_per_gas.to_string(),
                "maxPriorityFeePerGas": max_priority_fee_per_gas.to_string(),
                "transactionCalldataGasUsed": transaction_calldata_gas_used.to_string(),
                "relayWorker": relay_worker_address,
                "paymaster": paymaster_contract_address,
                "paymasterData": "0x",
                "clientId": "1",
                "forwarder": format!("{:#x}", trusted_forwarder_contract_address)
            }
        },
        "metadata": {
            "domainSeparatorName": domain_name,
            "relayLastKnownNonce": 0,
            "relayMaxNonce": 3,
            "approvalData": "0x",
            "relayHubAddress": relay_hub_contract_address,
            "relayRequestId": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "signature": sig_hex,
            "maxAcceptanceBudget": "285252"
        }
    });

    log::info!("posting relay body:\n{}", serde_json::to_string_pretty(&body).unwrap());

    let http_client = reqwest::Client::new();
    let response = http_client
        .post(gas_relayer_server_rpc_url)
        .json(&body)
        .send()
        .await
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .unwrap_or_else(|_| "<no body>".to_string());

    if status.is_success() {
        log::info!("relay server response ({}): {}", status, response_text);
        execute!(
            stdout(),
            SetForegroundColor(Color::Green),
            Print(format!("\nTransaction relayed successfully!\nResponse: {}\n", response_text)),
            ResetColor
        )?;
    } else {
        log::error!("relay server error ({}): {}", status, response_text);
        return Err(io::Error::new(
            io::ErrorKind::Other,
            format!("Relay server returned {}: {}", status, response_text),
        ));
    }

    Ok(())
}

fn get_nonce_calldata(addr: H160) -> Vec<u8> {
    let func = Function {
        name: "getNonce".to_string(),
        inputs: vec![Param {
            name: "from".to_string(),
            kind: ParamType::Address,
            internal_type: None,
        }],
        outputs: vec![Param {
            name: "nonce".to_string(),
            kind: ParamType::Uint(256),
            internal_type: None,
        }],
        constant: None,
        state_mutability: StateMutability::NonPayable,
    };
    abi::encode_calldata(func, &[Token::Address(addr)]).unwrap()
}
