// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import "forge-std/Script.sol";

import "../packages/contracts/src/forwarder/Forwarder.sol";
import "../packages/contracts/src/Penalizer.sol";
import "../packages/contracts/src/StakeManager.sol";
import "../packages/contracts/src/utils/RelayRegistrar.sol";
import "../packages/contracts/src/RelayHub.sol";

/**
 * @title DeployGSN
 * @notice Foundry script to deploy the core GSN contracts.
 *
 * @dev Usage:
 *   forge script script/DeployGSN.s.sol:DeployGSN \
 *     --rpc-url <RPC_URL> \
 *     --broadcast \
 *     --private-key <PRIVATE_KEY> \
 *     -vvvv
 *
 * @dev Environment variables (all optional – sensible defaults provided):
 *   PENALIZE_BLOCK_DELAY        - Penalizer block delay (default: 5)
 *   PENALIZE_BLOCK_EXPIRATION   - Penalizer block expiration (default: 60000)
 *   MAX_UNSTAKE_DELAY           - StakeManager max unstake delay in seconds (default: 2592000 = 30 days)
 *   ABANDONMENT_DELAY           - StakeManager abandonment delay in seconds (default: 7776000 = 90 days)
 *   ESCHEATMENT_DELAY           - StakeManager escheatment delay in seconds (default: 2592000 = 30 days)
 *   STAKE_BURN_ADDRESS          - Burn address for penalized stakes (default: 0x000...dEaD)
 *   DEV_ADDRESS                 - Developer address for fee collection (default: deployer)
 *   REGISTRATION_MAX_AGE        - RelayRegistrar max age in seconds (default: 15552000 = 180 days)
 *   MAX_WORKER_COUNT            - RelayHub max worker count (default: 10)
 *   GAS_RESERVE                 - RelayHub gas reserve (default: 100000)
 *   POST_OVERHEAD               - RelayHub post overhead (default: 50000)
 *   GAS_OVERHEAD                - RelayHub gas overhead (default: 30000)
 *   MINIMUM_UNSTAKE_DELAY       - RelayHub minimum unstake delay (default: 15000)
 *   DEV_FEE                     - RelayHub developer fee 0-99 (default: 0)
 *   BASE_RELAY_FEE              - RelayHub base relay fee in wei (default: 0)
 *   PCT_RELAY_FEE               - RelayHub percent relay fee (default: 0)
 */
contract DeployGSN is Script {
    function run() external {
        // ──────── Read env vars with defaults ────────

        uint256 penalizeBlockDelay = vm.envOr(
            "PENALIZE_BLOCK_DELAY",
            uint256(5)
        );
        uint256 penalizeBlockExpiration = vm.envOr(
            "PENALIZE_BLOCK_EXPIRATION",
            uint256(60_000)
        );

        uint256 maxUnstakeDelay = vm.envOr(
            "MAX_UNSTAKE_DELAY",
            uint256(2_592_000)
        ); // 30 days
        uint256 abandonmentDelay = vm.envOr(
            "ABANDONMENT_DELAY",
            uint256(7_776_000)
        ); // 90 days
        uint256 escheatmentDelay = vm.envOr(
            "ESCHEATMENT_DELAY",
            uint256(2_592_000)
        ); // 30 days
        address stakeBurnAddress = vm.envOr(
            "STAKE_BURN_ADDRESS",
            address(0x000000000000000000000000000000000000dEaD)
        );

        uint256 registrationMaxAge = vm.envOr(
            "REGISTRATION_MAX_AGE",
            uint256(15_552_000)
        ); // 180 days

        // ──────── Start broadcast ────────

        vm.startBroadcast();

        address deployer = msg.sender;
        address devAddress = vm.envOr("DEV_ADDRESS", deployer);

        // 1. Deploy Forwarder
        Forwarder forwarder = new Forwarder();
        console.log("Forwarder deployed at:", address(forwarder));

        // Register default request type & domain separator
        forwarder.registerRequestType(
            "RelayRequest",
            "RelayData relayData)RelayData(uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,uint256 transactionCalldataGasUsed,address relayWorker,address paymaster,address forwarder,bytes paymasterData,uint256 clientId)"
        );
        forwarder.registerDomainSeparator("GSN Relayed Transaction", "3");
        console.log("Forwarder: request type and domain separator registered");

        // 2. Deploy Penalizer
        Penalizer penalizer = new Penalizer(
            penalizeBlockDelay,
            penalizeBlockExpiration
        );
        console.log("Penalizer deployed at:", address(penalizer));

        // 3. Deploy StakeManager
        StakeManager stakeManager = new StakeManager(
            maxUnstakeDelay,
            abandonmentDelay,
            escheatmentDelay,
            stakeBurnAddress,
            devAddress
        );
        console.log("StakeManager deployed at:", address(stakeManager));

        // 4. Deploy RelayRegistrar
        RelayRegistrar relayRegistrar = new RelayRegistrar(registrationMaxAge);
        console.log("RelayRegistrar deployed at:", address(relayRegistrar));

        // 5. Deploy RelayHub
        IRelayHub.RelayHubConfig memory hubConfig = IRelayHub.RelayHubConfig({
            maxWorkerCount: vm.envOr("MAX_WORKER_COUNT", uint256(10)),
            gasReserve: vm.envOr("GAS_RESERVE", uint256(100_000)),
            postOverhead: vm.envOr("POST_OVERHEAD", uint256(50_000)),
            gasOverhead: vm.envOr("GAS_OVERHEAD", uint256(30_000)),
            minimumUnstakeDelay: vm.envOr(
                "MINIMUM_UNSTAKE_DELAY",
                uint256(15_000)
            ),
            devAddress: devAddress,
            devFee: uint8(vm.envOr("DEV_FEE", uint256(0))),
            baseRelayFee: uint80(vm.envOr("BASE_RELAY_FEE", uint256(0))),
            pctRelayFee: uint16(vm.envOr("PCT_RELAY_FEE", uint256(0)))
        });

        RelayHub relayHub = new RelayHub(
            IStakeManager(address(stakeManager)),
            address(penalizer),
            address(0), // batchGateway
            address(relayRegistrar),
            hubConfig
        );
        console.log("RelayHub deployed at:", address(relayHub));

        vm.stopBroadcast();

        // ──────── Summary ────────
        console.log("\n=== GSN Deployment Summary ===");
        console.log("Forwarder:       ", address(forwarder));
        console.log("Penalizer:       ", address(penalizer));
        console.log("StakeManager:    ", address(stakeManager));
        console.log("RelayRegistrar:  ", address(relayRegistrar));
        console.log("RelayHub:        ", address(relayHub));
        console.log("Deployer:        ", deployer);
        console.log("Dev Address:     ", devAddress);
    }
}
