// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import "forge-std/Script.sol";

import "../packages/paymasters/contracts/SingletonWhitelistPaymaster.sol";
import "../packages/contracts/src/interfaces/IRelayHub.sol";

/**
 * @title DeployPaymasters
 * @notice Foundry script to deploy GSN Paymaster contracts.
 *
 * @dev Usage (SingletonWhitelistPaymaster):
 *   forge script script/DeployPaymasters.s.sol:DeployPaymasters \
 *     --rpc-url <RPC_URL> \
 *     --broadcast \
 *     --private-key <PRIVATE_KEY> \
 *     -vvvv
 *
 * @dev Environment variables:
 *   GSN_HUB_ADDRESS             - (required) Address of the deployed RelayHub
 *   GSN_FORWARDER_ADDRESS       - (required) Address of the deployed Forwarder
 *   GAS_USED_BY_POST            - (optional, default: 30000)
 *   PAYMASTER_FEE               - (optional, default: 15)
 */
contract DeployPaymasters is Script {
    function run() external {
        address hubAddress = vm.envAddress("GSN_HUB_ADDRESS");
        address forwarderAddress = vm.envAddress("GSN_FORWARDER_ADDRESS");

        uint256 gasUsedByPost = vm.envOr("GAS_USED_BY_POST", uint256(30_000));
        uint256 paymasterFee = vm.envOr("PAYMASTER_FEE", uint256(15));

        vm.startBroadcast();

        // Deploy SingletonWhitelistPaymaster
        SingletonWhitelistPaymaster paymaster = new SingletonWhitelistPaymaster();
        console.log(
            "SingletonWhitelistPaymaster deployed at:",
            address(paymaster)
        );

        // Configure paymaster
        paymaster.setSharedConfiguration(gasUsedByPost, paymasterFee);
        console.log(
            "SharedConfiguration set: gasUsedByPost=%d, paymasterFee=%d",
            gasUsedByPost,
            paymasterFee
        );

        paymaster.setRelayHub(IRelayHub(hubAddress));
        console.log("RelayHub set to:", hubAddress);

        paymaster.setTrustedForwarder(forwarderAddress);
        console.log("TrustedForwarder set to:", forwarderAddress);

        vm.stopBroadcast();

        // Summary
        console.log("\n=== Paymaster Deployment Summary ===");
        console.log("SingletonWhitelistPaymaster:", address(paymaster));
        console.log("RelayHub:                   ", hubAddress);
        console.log("Forwarder:                  ", forwarderAddress);
    }
}
