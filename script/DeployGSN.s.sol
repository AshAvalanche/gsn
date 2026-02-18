// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import "forge-std/Script.sol";

import "../packages/contracts/src/forwarder/Forwarder.sol";
import "../packages/contracts/src/Penalizer.sol";
import "../packages/contracts/src/StakeManager.sol";
import "../packages/contracts/src/utils/RelayRegistrar.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../packages/contracts/src/RelayHub.sol";
import "../packages/contracts/src/test/TestWrappedNativeToken.sol";

/**
 * @title DeployGSN
 * @notice Foundry script to deploy the core GSN contracts.
 *         Reads configuration from conf.json and writes deployed addresses back.
 *
 * @dev Usage:
 *   forge script script/DeployGSN.s.sol:DeployGSN \
 *     --rpc-url <RPC_URL> \
 *     --broadcast \
 *     --private-key <PRIVATE_KEY> \
 *     -vvvv
 */
contract DeployGSN is Script {
    string constant CONFIG_PATH = "./conf.json";

    struct GSNConfig {
        uint256 penalizeBlockDelay;
        uint256 penalizeBlockExpiration;
        uint256 maxUnstakeDelay;
        uint256 abandonmentDelay;
        uint256 escheatmentDelay;
        address stakeBurnAddress;
        address devAddress;
        uint256 registrationMaxAge;
        bool deployTestToken;
        address minimumStakeTokenAddress;
        uint256 minimumStakeAmount;
    }

    struct HubParams {
        uint256 maxWorkerCount;
        uint256 gasReserve;
        uint256 postOverhead;
        uint256 gasOverhead;
        uint256 minimumUnstakeDelay;
        uint256 devFee;
        uint256 baseRelayFee;
        uint256 pctRelayFee;
    }

    function _readConfig(
        string memory json
    ) internal pure returns (GSNConfig memory cfg) {
        cfg.penalizeBlockDelay = vm.parseJsonUint(
            json,
            ".config.penalizeBlockDelay"
        );
        cfg.penalizeBlockExpiration = vm.parseJsonUint(
            json,
            ".config.penalizeBlockExpiration"
        );
        cfg.maxUnstakeDelay = vm.parseJsonUint(json, ".config.maxUnstakeDelay");
        cfg.abandonmentDelay = vm.parseJsonUint(
            json,
            ".config.abandonmentDelay"
        );
        cfg.escheatmentDelay = vm.parseJsonUint(
            json,
            ".config.escheatmentDelay"
        );
        cfg.stakeBurnAddress = vm.parseJsonAddress(
            json,
            ".config.stakeBurnAddress"
        );
        cfg.devAddress = vm.parseJsonAddress(json, ".config.devAddress");
        cfg.registrationMaxAge = vm.parseJsonUint(
            json,
            ".config.registrationMaxAge"
        );
        cfg.deployTestToken = vm.parseJsonBool(json, ".config.deployTestToken");
        cfg.minimumStakeTokenAddress = vm.parseJsonAddress(
            json,
            ".config.minimumStakeTokenAddress"
        );
        cfg.minimumStakeAmount = vm.parseJsonUint(
            json,
            ".config.minimumStakeAmount"
        );
    }

    function _readHubParams(
        string memory json
    ) internal pure returns (HubParams memory hp) {
        hp.maxWorkerCount = vm.parseJsonUint(json, ".config.maxWorkerCount");
        hp.gasReserve = vm.parseJsonUint(json, ".config.gasReserve");
        hp.postOverhead = vm.parseJsonUint(json, ".config.postOverhead");
        hp.gasOverhead = vm.parseJsonUint(json, ".config.gasOverhead");
        hp.minimumUnstakeDelay = vm.parseJsonUint(
            json,
            ".config.minimumUnstakeDelay"
        );
        hp.devFee = vm.parseJsonUint(json, ".config.devFee");
        hp.baseRelayFee = vm.parseJsonUint(json, ".config.baseRelayFee");
        hp.pctRelayFee = vm.parseJsonUint(json, ".config.pctRelayFee");
    }

    function run() external {
        // ──────── Read conf.json ────────
        string memory json = vm.readFile(CONFIG_PATH);
        GSNConfig memory cfg = _readConfig(json);
        HubParams memory hp = _readHubParams(json);

        // devAddress: if zero in config, use deployer
        address deployer = msg.sender;
        if (cfg.devAddress == address(0)) {
            cfg.devAddress = deployer;
        }

        // ──────── Start broadcast ────────
        vm.startBroadcast();

        // 1. Deploy Forwarder
        Forwarder forwarder = new Forwarder();
        console.log("Forwarder deployed at:", address(forwarder));

        forwarder.registerRequestType(
            "RelayRequest",
            "RelayData relayData)RelayData(uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,uint256 transactionCalldataGasUsed,address relayWorker,address paymaster,address forwarder,bytes paymasterData,uint256 clientId)"
        );
        forwarder.registerDomainSeparator("GSN Relayed Transaction", "3");
        console.log("Forwarder: request type and domain separator registered");

        // 2. Deploy Penalizer
        Penalizer penalizer = new Penalizer(
            cfg.penalizeBlockDelay,
            cfg.penalizeBlockExpiration
        );
        console.log("Penalizer deployed at:", address(penalizer));

        // 3. Deploy StakeManager
        StakeManager stakeManager = new StakeManager(
            cfg.maxUnstakeDelay,
            cfg.abandonmentDelay,
            cfg.escheatmentDelay,
            cfg.stakeBurnAddress,
            cfg.devAddress
        );
        console.log("StakeManager deployed at:", address(stakeManager));

        // 4. Deploy RelayRegistrar
        RelayRegistrar relayRegistrar = new RelayRegistrar(
            cfg.registrationMaxAge
        );
        console.log("RelayRegistrar deployed at:", address(relayRegistrar));

        // 5. Deploy RelayHub
        RelayHub relayHub = _deployRelayHub(
            stakeManager,
            penalizer,
            relayRegistrar,
            cfg.devAddress,
            hp
        );

        // 6. Test Wrapped Native Token & Minimum Stakes
        address testTokenAddr = _setupStakes(relayHub, cfg);

        vm.stopBroadcast();

        // ──────── Write deployed addresses to conf.json ────────
        vm.writeJson(
            vm.toString(address(forwarder)),
            CONFIG_PATH,
            ".deployedAddresses.forwarder"
        );
        vm.writeJson(
            vm.toString(address(penalizer)),
            CONFIG_PATH,
            ".deployedAddresses.penalizer"
        );
        vm.writeJson(
            vm.toString(address(stakeManager)),
            CONFIG_PATH,
            ".deployedAddresses.stakeManager"
        );
        vm.writeJson(
            vm.toString(address(relayRegistrar)),
            CONFIG_PATH,
            ".deployedAddresses.relayRegistrar"
        );
        vm.writeJson(
            vm.toString(address(relayHub)),
            CONFIG_PATH,
            ".deployedAddresses.relayHub"
        );
        if (testTokenAddr != address(0)) {
            vm.writeJson(
                vm.toString(testTokenAddr),
                CONFIG_PATH,
                ".deployedAddresses.testWrappedNativeToken"
            );
        }

        // ──────── Summary ────────
        console.log("\n=== GSN Deployment Summary ===");
        console.log("Forwarder:       ", address(forwarder));
        console.log("Penalizer:       ", address(penalizer));
        console.log("StakeManager:    ", address(stakeManager));
        console.log("RelayRegistrar:  ", address(relayRegistrar));
        console.log("RelayHub:        ", address(relayHub));
        if (testTokenAddr != address(0)) {
            console.log("TestToken:       ", testTokenAddr);
        }
        console.log("Deployer:        ", deployer);
        console.log("Dev Address:     ", cfg.devAddress);
        console.log("Addresses saved to conf.json");
    }

    function _deployRelayHub(
        StakeManager stakeManager,
        Penalizer penalizer,
        RelayRegistrar relayRegistrar,
        address devAddress,
        HubParams memory hp
    ) internal returns (RelayHub) {
        IRelayHub.RelayHubConfig memory hubConfig = IRelayHub.RelayHubConfig({
            maxWorkerCount: hp.maxWorkerCount,
            gasReserve: hp.gasReserve,
            postOverhead: hp.postOverhead,
            gasOverhead: hp.gasOverhead,
            minimumUnstakeDelay: hp.minimumUnstakeDelay,
            devAddress: devAddress,
            devFee: uint8(hp.devFee),
            baseRelayFee: uint80(hp.baseRelayFee),
            pctRelayFee: uint16(hp.pctRelayFee)
        });

        RelayHub relayHub = new RelayHub(
            IStakeManager(address(stakeManager)),
            address(penalizer),
            address(0), // batchGateway
            address(relayRegistrar),
            hubConfig
        );
        console.log("RelayHub deployed at:", address(relayHub));
        return relayHub;
    }

    function _setupStakes(
        RelayHub relayHub,
        GSNConfig memory cfg
    ) internal returns (address testTokenAddr) {
        address stakeTokenAddr = cfg.minimumStakeTokenAddress;

        if (cfg.deployTestToken) {
            TestWrappedNativeToken testToken = new TestWrappedNativeToken();
            console.log(
                "TestWrappedNativeToken deployed at:",
                address(testToken)
            );
            stakeTokenAddr = address(testToken);
            testTokenAddr = address(testToken);
        }

        if (stakeTokenAddr != address(0)) {
            IERC20[] memory tokensIERC20 = new IERC20[](1);
            uint256[] memory stakes = new uint256[](1);
            tokensIERC20[0] = IERC20(stakeTokenAddr);
            stakes[0] = cfg.minimumStakeAmount;
            relayHub.setMinimumStakes(tokensIERC20, stakes);
            console.log(
                "Set minimum stake for token",
                stakeTokenAddr,
                "to",
                cfg.minimumStakeAmount
            );
        } else {
            console.log(
                "WARNING: No minimum stake set! RelayHub will not accept any registrations."
            );
        }
    }
}
