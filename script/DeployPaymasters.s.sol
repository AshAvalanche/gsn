// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import "forge-std/Script.sol";

import "../packages/paymasters/contracts/SingletonWhitelistPaymaster.sol";
import "../packages/contracts/src/test/TestPaymasterEverythingAccepted.sol";
import "../packages/contracts/src/interfaces/IRelayHub.sol";

/**
 * @title DeployPaymasters
 * @notice Foundry script to deploy GSN Paymaster contracts.
 *         Reads configuration and previously deployed addresses from conf.json,
 *         then writes new paymaster addresses back.
 *
 * @dev Usage:
 *   forge script script/DeployPaymasters.s.sol:DeployPaymasters \
 *     --rpc-url <RPC_URL> \
 *     --broadcast \
 *     --private-key <PRIVATE_KEY> \
 *     -vvvv
 */
contract DeployPaymasters is Script {
    string constant CONFIG_PATH = "./conf.json";

    function run() external {
        // ──────── Read conf.json ────────
        string memory json = vm.readFile(CONFIG_PATH);

        // Read previously deployed core addresses
        address hubAddress = vm.parseJsonAddress(
            json,
            ".deployedAddresses.relayHub"
        );
        address forwarderAddress = vm.parseJsonAddress(
            json,
            ".deployedAddresses.forwarder"
        );
        require(
            hubAddress != address(0),
            "DeployPaymasters: relayHub not deployed yet, run DeployGSN first"
        );
        require(
            forwarderAddress != address(0),
            "DeployPaymasters: forwarder not deployed yet, run DeployGSN first"
        );

        // Read paymaster config
        uint256 gasUsedByPost = vm.parseJsonUint(json, ".config.gasUsedByPost");
        uint256 paymasterFee = vm.parseJsonUint(json, ".config.paymasterFee");
        bool deployTestPaymaster = vm.parseJsonBool(
            json,
            ".config.deployTestPaymaster"
        );
        uint256 fundAmount = vm.parseJsonUint(
            json,
            ".config.fundPaymasterAmount"
        );

        // ──────── Start broadcast ────────

        vm.startBroadcast();

        // 1. Deploy SingletonWhitelistPaymaster
        SingletonWhitelistPaymaster paymaster = new SingletonWhitelistPaymaster();
        console.log(
            "SingletonWhitelistPaymaster deployed at:",
            address(paymaster)
        );

        // Configure paymaster
        paymaster.setSharedConfiguration(gasUsedByPost, paymasterFee);
        paymaster.setRelayHub(IRelayHub(hubAddress));
        paymaster.setTrustedForwarder(forwarderAddress);
        console.log("SingletonWhitelistPaymaster configured");

        // 2. Deploy TestPaymasterEverythingAccepted (optional)
        TestPaymasterEverythingAccepted testPaymaster;

        if (deployTestPaymaster) {
            testPaymaster = new TestPaymasterEverythingAccepted();
            console.log(
                "TestPaymasterEverythingAccepted deployed at:",
                address(testPaymaster)
            );
            testPaymaster.setRelayHub(IRelayHub(hubAddress));
            testPaymaster.setTrustedForwarder(forwarderAddress);
        }

        // 3. Fund Paymasters
        if (fundAmount > 0) {
            IRelayHub(hubAddress).depositFor{value: fundAmount}(
                address(paymaster)
            );
            console.log("Funded SingletonWhitelistPaymaster with", fundAmount);

            if (deployTestPaymaster) {
                IRelayHub(hubAddress).depositFor{value: fundAmount}(
                    address(testPaymaster)
                );
                console.log(
                    "Funded TestPaymasterEverythingAccepted with",
                    fundAmount
                );
            }
        }

        vm.stopBroadcast();

        // ──────── Write deployed addresses back to conf.json ────────
        vm.writeJson(
            vm.toString(address(paymaster)),
            CONFIG_PATH,
            ".deployedAddresses.singletonWhitelistPaymaster"
        );
        if (deployTestPaymaster) {
            vm.writeJson(
                vm.toString(address(testPaymaster)),
                CONFIG_PATH,
                ".deployedAddresses.testPaymasterEverythingAccepted"
            );
        }

        // ──────── Summary ────────
        console.log("\n=== Paymaster Deployment Summary ===");
        console.log("SingletonWhitelistPaymaster:", address(paymaster));
        if (deployTestPaymaster) {
            console.log(
                "TestPaymasterEverythingAccepted:",
                address(testPaymaster)
            );
        }
        console.log("RelayHub:                   ", hubAddress);
        console.log("Forwarder:                  ", forwarderAddress);
        console.log("Addresses saved to conf.json");
    }
}
