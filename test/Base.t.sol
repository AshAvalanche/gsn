// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import "forge-std/Test.sol";

import "../packages/contracts/src/forwarder/Forwarder.sol";
import "../packages/contracts/src/Penalizer.sol";
import "../packages/contracts/src/StakeManager.sol";
import "../packages/contracts/src/utils/RelayRegistrar.sol";
import "../packages/contracts/src/RelayHub.sol";
import "../packages/contracts/src/test/TestPaymasterEverythingAccepted.sol";
import "../packages/contracts/src/test/TestPaymasterConfigurableMisbehavior.sol";
import "../packages/contracts/src/test/TestPaymasterStoreContext.sol";
import "../packages/contracts/src/test/TestRecipient.sol";
import "../packages/contracts/src/test/TestToken.sol";
import "../packages/contracts/src/test/TestRelayHubForRegistrar.sol";
import "../packages/contracts/src/test/TestRelayHubValidator.sol";
import "../packages/contracts/src/test/TestRelayWorkerContract.sol";

/**
 * @title GsnTestBase
 * @notice Shared base for all GSN Foundry tests.
 *         Deploys the full GSN stack in setUp().
 */
abstract contract GsnTestBase is Test {
    // ── Contracts ──
    Forwarder public forwarder;
    Penalizer public penalizer;
    StakeManager public stakeManager;
    RelayRegistrar public relayRegistrar;
    RelayHub public relayHub;
    TestPaymasterEverythingAccepted public paymaster;
    TestRecipient public recipient;
    TestToken public testToken;

    // ── Actors ──
    address public deployer = address(this);
    address public relayOwner = makeAddr("relayOwner");
    address public relayManager = makeAddr("relayManager");
    address public relayWorker = makeAddr("relayWorker");
    address public sender = makeAddr("sender");
    address public paymasterOwner = makeAddr("paymasterOwner");
    address payable public dest = payable(makeAddr("dest"));
    address public other = makeAddr("other");

    // ── Constants ──
    address constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 constant MAX_UNSTAKE_DELAY = 2_592_000; // 30 days
    uint256 constant ABANDONMENT_DELAY = 7_776_000; // 90 days
    uint256 constant ESCHEATMENT_DELAY = 2_592_000; // 30 days
    uint256 constant REGISTRATION_MAX_AGE = 15_552_000; // 180 days
    uint256 constant PENALIZE_BLOCK_DELAY = 5;
    uint256 constant PENALIZE_BLOCK_EXPIRATION = 60_000;

    // GsnRequestType constants (must match @opengsn/common)
    string constant REQUEST_TYPE_NAME = "RelayRequest";
    string constant RELAY_DATA_TYPE =
        "RelayData(uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,uint256 transactionCalldataGasUsed,address relayWorker,address paymaster,address forwarder,bytes paymasterData,uint256 clientId)";
    string constant REQUEST_TYPE_SUFFIX =
        string(abi.encodePacked("RelayData relayData)", RELAY_DATA_TYPE));
    bytes32 constant RELAYDATA_TYPEHASH = keccak256(bytes(RELAY_DATA_TYPE));

    string constant DOMAIN_SEPARATOR_NAME = "GSN Relayed Transaction";
    string constant DOMAIN_SEPARATOR_VERSION = "3";

    // ── EIP-712 constants ──
    string constant GENERIC_PARAMS =
        "address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data,uint256 validUntilTime";

    bytes32 constant EIP712_DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

    function setUp() public virtual {
        // ── Labels for trace readability ──
        vm.label(relayOwner, "relayOwner");
        vm.label(relayManager, "relayManager");
        vm.label(relayWorker, "relayWorker");
        vm.label(sender, "sender");
        vm.label(paymasterOwner, "paymasterOwner");
        vm.label(dest, "dest");
        vm.label(other, "other");

        // ── Deploy TestToken ──
        testToken = new TestToken();
        vm.label(address(testToken), "TestToken");

        // ── Deploy Forwarder ──
        forwarder = new Forwarder();
        vm.label(address(forwarder), "Forwarder");
        forwarder.registerRequestType(REQUEST_TYPE_NAME, REQUEST_TYPE_SUFFIX);
        forwarder.registerDomainSeparator(
            DOMAIN_SEPARATOR_NAME,
            DOMAIN_SEPARATOR_VERSION
        );

        // ── Deploy Penalizer ──
        penalizer = new Penalizer(
            PENALIZE_BLOCK_DELAY,
            PENALIZE_BLOCK_EXPIRATION
        );
        vm.label(address(penalizer), "Penalizer");

        // ── Deploy StakeManager ──
        stakeManager = new StakeManager(
            MAX_UNSTAKE_DELAY,
            ABANDONMENT_DELAY,
            ESCHEATMENT_DELAY,
            BURN_ADDRESS,
            deployer
        );
        vm.label(address(stakeManager), "StakeManager");

        // ── Deploy RelayRegistrar ──
        relayRegistrar = new RelayRegistrar(REGISTRATION_MAX_AGE);
        vm.label(address(relayRegistrar), "RelayRegistrar");

        // ── Deploy RelayHub ──
        IRelayHub.RelayHubConfig memory hubConfig = IRelayHub.RelayHubConfig({
            maxWorkerCount: 10,
            gasReserve: 100_000,
            postOverhead: 50_000,
            gasOverhead: 30_000,
            minimumUnstakeDelay: 15_000,
            devAddress: deployer,
            devFee: 0,
            baseRelayFee: 0,
            pctRelayFee: 0
        });

        relayHub = new RelayHub(
            IStakeManager(address(stakeManager)),
            address(penalizer),
            address(0), // batchGateway
            address(relayRegistrar),
            hubConfig
        );
        vm.label(address(relayHub), "RelayHub");

        // Set minimum stake
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(address(testToken));
        uint256[] memory stakes = new uint256[](1);
        stakes[0] = 1 ether;
        relayHub.setMinimumStakes(tokens, stakes);

        // ── Deploy TestRecipient ──
        recipient = new TestRecipient(address(forwarder));
        vm.label(address(recipient), "TestRecipient");

        // ── Deploy Paymaster ──
        vm.startPrank(paymasterOwner);
        paymaster = new TestPaymasterEverythingAccepted();
        paymaster.setRelayHub(relayHub);
        paymaster.setTrustedForwarder(address(forwarder));
        vm.stopPrank();
        vm.label(address(paymaster), "Paymaster");

        // Fund paymaster with ETH deposit in RelayHub
        vm.deal(other, 10 ether);
        vm.prank(other);
        relayHub.depositFor{value: 1 ether}(address(paymaster));
    }

    // ═══════════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════════

    /// @dev Helper: mint tokens, approve StakeManager, set relay owner, stake
    function _mintApproveAndStake(
        address _relayOwner,
        address _relayManager,
        uint256 _stake,
        uint256 _unstakeDelay
    ) internal {
        vm.prank(_relayOwner);
        testToken.mint(_stake);

        vm.startPrank(_relayOwner);
        testToken.approve(address(stakeManager), _stake);
        vm.stopPrank();

        // Set relay manager owner
        vm.prank(_relayManager);
        stakeManager.setRelayManagerOwner(_relayOwner);

        // Stake
        vm.prank(_relayOwner);
        stakeManager.stakeForRelayManager(
            IERC20(address(testToken)),
            _relayManager,
            _unstakeDelay,
            _stake
        );
    }

    /// @dev Stake, authorize hub, and add a relay worker — full setup for relayCall
    function _setupRelayWorker(
        address _relayOwner,
        address _relayManager,
        address _relayWorker,
        uint256 _stake,
        uint256 _unstakeDelay
    ) internal {
        _mintApproveAndStake(_relayOwner, _relayManager, _stake, _unstakeDelay);

        vm.prank(_relayOwner);
        stakeManager.authorizeHubByOwner(_relayManager, address(relayHub));

        address[] memory workers = new address[](1);
        workers[0] = _relayWorker;
        vm.prank(_relayManager);
        relayHub.addRelayWorkers(workers);
    }

    /// @dev Build a GsnTypes.RelayRequest with standard defaults
    function _buildRelayRequest(
        address _from,
        address _to,
        bytes memory _data,
        uint256 _nonce,
        address _relayWorkerAddr,
        address _paymasterAddr
    ) internal view returns (GsnTypes.RelayRequest memory) {
        return
            GsnTypes.RelayRequest({
                request: IForwarder.ForwardRequest({
                    from: _from,
                    to: _to,
                    value: 0,
                    gas: 500_000,
                    nonce: _nonce,
                    data: _data,
                    validUntilTime: 0
                }),
                relayData: GsnTypes.RelayData({
                    maxFeePerGas: tx.gasprice,
                    maxPriorityFeePerGas: tx.gasprice,
                    transactionCalldataGasUsed: 0,
                    relayWorker: _relayWorkerAddr,
                    paymaster: _paymasterAddr,
                    forwarder: address(forwarder),
                    paymasterData: "",
                    clientId: 0
                })
            });
    }

    /// @dev Compute the Forwarder domain separator
    function _forwarderDomainSeparator() internal view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    EIP712_DOMAIN_TYPEHASH,
                    keccak256(bytes(DOMAIN_SEPARATOR_NAME)),
                    keccak256(bytes(DOMAIN_SEPARATOR_VERSION)),
                    block.chainid,
                    address(forwarder)
                )
            );
    }

    /// @dev Compute the relay request type hash (ForwardRequest + RelayData suffix)
    function _relayRequestTypeHash() internal pure returns (bytes32) {
        string memory fullType = string(
            abi.encodePacked(
                REQUEST_TYPE_NAME,
                "(",
                GENERIC_PARAMS,
                ",",
                REQUEST_TYPE_SUFFIX
            )
        );
        return keccak256(bytes(fullType));
    }

    /// @dev Sign a relay request for EIP-712 (ForwardRequest fields + RelayData suffix)
    function _signRelayRequest(
        GsnTypes.RelayRequest memory req,
        uint256 pk
    ) internal view returns (bytes memory) {
        bytes32 domainSep = _forwarderDomainSeparator();
        bytes32 typeHash = _relayRequestTypeHash();

        // Calculate hash of RelayData
        bytes32 relayDataHash = keccak256(
            abi.encode(
                RELAYDATA_TYPEHASH,
                req.relayData.maxFeePerGas,
                req.relayData.maxPriorityFeePerGas,
                req.relayData.transactionCalldataGasUsed,
                req.relayData.relayWorker,
                req.relayData.paymaster,
                req.relayData.forwarder,
                keccak256(req.relayData.paymasterData),
                req.relayData.clientId
            )
        );

        // Build the suffix data: abi.encode(hashRelayData)
        // GsnEip712Library.splitRequest -> abi.encode(hashRelayData(req.relayData))
        bytes memory suffixData = abi.encode(relayDataHash);

        // Build the struct hash: typeHash + encoded ForwardRequest fields + suffixData
        bytes32 structHash = keccak256(
            abi.encodePacked(
                typeHash,
                abi.encode(
                    req.request.from,
                    req.request.to,
                    req.request.value,
                    req.request.gas,
                    req.request.nonce,
                    keccak256(req.request.data),
                    req.request.validUntilTime
                ),
                suffixData
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSep, structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }
}
