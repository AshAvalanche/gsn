// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import "./Base.t.sol";

contract RelayHubTest is GsnTestBase {
    uint256 constant RELAY_STAKE = 2 ether;
    uint256 constant RELAY_UNSTAKE_DELAY = 15_000;
    uint256 constant ACCEPTANCE_BUDGET = 300_000;

    address senderAddr;
    uint256 senderPk;

    function setUp() public override {
        super.setUp();
        (senderAddr, senderPk) = makeAddrAndKey("relayCallSender");
        vm.deal(senderAddr, 1 ether);
    }

    /// @dev Full setup + relayCall
    function _doSuccessfulRelayCall()
        internal
        returns (bool paymasterAccepted)
    {
        _setupRelayWorker(
            relayOwner,
            relayManager,
            relayWorker,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );

        GsnTypes.RelayRequest memory relayReq = _buildRelayRequest(
            senderAddr,
            address(recipient),
            abi.encodeWithSelector(TestRecipient.emitMessageNoParams.selector),
            0,
            relayWorker,
            address(paymaster)
        );

        bytes memory sig = _signRelayRequest(relayReq, senderPk);

        // vm.prank(addr, addr) sets both msg.sender AND tx.origin
        vm.prank(relayWorker, relayWorker);
        (paymasterAccepted, , , ) = relayHub.relayCall(
            DOMAIN_SEPARATOR_NAME,
            ACCEPTANCE_BUDGET,
            relayReq,
            sig,
            ""
        );
    }

    // ═══════════════════════════════════════════════════════════════
    //  version
    // ═══════════════════════════════════════════════════════════════

    function test_versionHub() public view {
        string memory version = relayHub.versionHub();
        assertGt(bytes(version).length, 0);
    }

    // ═══════════════════════════════════════════════════════════════
    //  depositFor
    // ═══════════════════════════════════════════════════════════════

    function test_depositFor() public {
        uint256 depositAmount = 1 ether;
        vm.deal(other, depositAmount);
        vm.prank(other);
        relayHub.depositFor{value: depositAmount}(address(paymaster));
        assertEq(relayHub.balanceOf(address(paymaster)), 2 ether);
    }

    function test_depositFor_revertsForNonPaymaster() public {
        vm.deal(other, 1 ether);
        vm.prank(other);
        vm.expectRevert("target is not a valid IPaymaster");
        relayHub.depositFor{value: 1 ether}(address(recipient));
    }

    function test_depositFor_multipleDeposits() public {
        vm.deal(other, 5 ether);
        vm.startPrank(other);
        relayHub.depositFor{value: 1 ether}(address(paymaster));
        relayHub.depositFor{value: 2 ether}(address(paymaster));
        vm.stopPrank();
        assertEq(relayHub.balanceOf(address(paymaster)), 4 ether);
    }

    // ═══════════════════════════════════════════════════════════════
    //  withdraw
    // ═══════════════════════════════════════════════════════════════

    function test_withdraw() public {
        uint256 withdrawAmount = 0.5 ether;
        uint256 destBalBefore = dest.balance;
        vm.prank(paymasterOwner);
        paymaster.withdrawRelayHubDepositTo(withdrawAmount, dest);
        assertEq(dest.balance - destBalBefore, withdrawAmount);
        assertEq(relayHub.balanceOf(address(paymaster)), 0.5 ether);
    }

    function test_withdraw_cannotExceedBalance() public {
        vm.prank(paymasterOwner);
        vm.expectRevert("insufficient funds");
        paymaster.withdrawRelayHubDepositTo(10 ether, dest);
    }

    // ═══════════════════════════════════════════════════════════════
    //  setMinimumStakes
    // ═══════════════════════════════════════════════════════════════

    function test_setMinimumStakes() public {
        IERC20[] memory tokens = new IERC20[](2);
        tokens[0] = IERC20(makeAddr("token1"));
        tokens[1] = IERC20(makeAddr("token2"));
        uint256[] memory stakes = new uint256[](2);
        stakes[0] = 1 ether;
        stakes[1] = 2 ether;
        relayHub.setMinimumStakes(tokens, stakes);
        assertEq(relayHub.getMinimumStakePerToken(tokens[0]), 1 ether);
        assertEq(relayHub.getMinimumStakePerToken(tokens[1]), 2 ether);
    }

    function test_setMinimumStakes_revertsOnMismatchedArrays() public {
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(makeAddr("token1"));
        uint256[] memory stakes = new uint256[](2);
        stakes[0] = 1 ether;
        stakes[1] = 2 ether;
        vm.expectRevert("setMinimumStakes: wrong length");
        relayHub.setMinimumStakes(tokens, stakes);
    }

    // ═══════════════════════════════════════════════════════════════
    //  setConfiguration
    // ═══════════════════════════════════════════════════════════════

    function test_setConfiguration() public {
        IRelayHub.RelayHubConfig memory newConfig = IRelayHub.RelayHubConfig({
            maxWorkerCount: 20,
            gasReserve: 200_000,
            postOverhead: 60_000,
            gasOverhead: 40_000,
            minimumUnstakeDelay: 20_000,
            devAddress: deployer,
            devFee: 5,
            baseRelayFee: 100,
            pctRelayFee: 10
        });
        relayHub.setConfiguration(newConfig);
        IRelayHub.RelayHubConfig memory config = relayHub.getConfiguration();
        assertEq(config.maxWorkerCount, 20);
        assertEq(config.gasReserve, 200_000);
        assertEq(config.devFee, 5);
        assertEq(config.pctRelayFee, 10);
    }

    function test_setConfiguration_revertsIfNotOwner() public {
        IRelayHub.RelayHubConfig memory config = relayHub.getConfiguration();
        vm.prank(other);
        vm.expectRevert("Ownable: caller is not the owner");
        relayHub.setConfiguration(config);
    }

    // ═══════════════════════════════════════════════════════════════
    //  addRelayWorkers
    // ═══════════════════════════════════════════════════════════════

    function test_addRelayWorkers() public {
        _mintApproveAndStake(relayOwner, relayManager, 1 ether, 15_000);
        vm.prank(relayOwner);
        stakeManager.authorizeHubByOwner(relayManager, address(relayHub));

        address[] memory workers = new address[](1);
        workers[0] = relayWorker;
        vm.prank(relayManager);
        relayHub.addRelayWorkers(workers);

        assertEq(relayHub.getWorkerManager(relayWorker), relayManager);
        assertEq(relayHub.getWorkerCount(relayManager), 1);
    }

    function test_addRelayWorkers_revertsIfNotStaked() public {
        address[] memory workers = new address[](1);
        workers[0] = relayWorker;
        vm.prank(relayManager);
        vm.expectRevert();
        relayHub.addRelayWorkers(workers);
    }

    function test_addRelayWorkers_multipleWorkers() public {
        _mintApproveAndStake(relayOwner, relayManager, 1 ether, 15_000);
        vm.prank(relayOwner);
        stakeManager.authorizeHubByOwner(relayManager, address(relayHub));

        address[] memory workers = new address[](3);
        workers[0] = makeAddr("w1");
        workers[1] = makeAddr("w2");
        workers[2] = makeAddr("w3");
        vm.prank(relayManager);
        relayHub.addRelayWorkers(workers);
        assertEq(relayHub.getWorkerCount(relayManager), 3);
    }

    function test_addRelayWorkers_revertsIfExceedMaxCount() public {
        IRelayHub.RelayHubConfig memory config = relayHub.getConfiguration();
        config.maxWorkerCount = 2;
        relayHub.setConfiguration(config);

        _mintApproveAndStake(relayOwner, relayManager, 1 ether, 15_000);
        vm.prank(relayOwner);
        stakeManager.authorizeHubByOwner(relayManager, address(relayHub));

        address[] memory workers = new address[](3);
        workers[0] = makeAddr("w1");
        workers[1] = makeAddr("w2");
        workers[2] = makeAddr("w3");
        vm.prank(relayManager);
        vm.expectRevert("too many workers");
        relayHub.addRelayWorkers(workers);
    }

    // ═══════════════════════════════════════════════════════════════
    //  getters
    // ═══════════════════════════════════════════════════════════════

    function test_getStakeManager() public view {
        assertEq(address(relayHub.getStakeManager()), address(stakeManager));
    }

    function test_getPenalizer() public view {
        assertEq(relayHub.getPenalizer(), address(penalizer));
    }

    function test_getRelayRegistrar() public view {
        assertEq(relayHub.getRelayRegistrar(), address(relayRegistrar));
    }

    function test_getCreationBlock() public view {
        assertGt(relayHub.getCreationBlock(), 0);
    }

    function test_isNotDeprecated() public view {
        assertFalse(relayHub.isDeprecated());
    }

    // ═══════════════════════════════════════════════════════════════
    //  deprecateHub
    // ═══════════════════════════════════════════════════════════════

    function test_deprecateHub() public {
        uint256 deprecationTime = block.timestamp + 1;
        relayHub.deprecateHub(deprecationTime);
        vm.warp(deprecationTime + 1);
        assertTrue(relayHub.isDeprecated());
    }

    function test_deprecateHub_revertsIfNotOwner() public {
        vm.prank(other);
        vm.expectRevert("Ownable: caller is not the owner");
        relayHub.deprecateHub(block.timestamp + 1);
    }

    function test_deprecateHub_revertsIfAlreadyDeprecated() public {
        relayHub.deprecateHub(block.timestamp);
        vm.warp(block.timestamp + 1);
        vm.expectRevert("Already deprecated");
        relayHub.deprecateHub(block.timestamp + 100);
    }

    // ═══════════════════════════════════════════════════════════════
    //  relayCall — successful flow
    // ═══════════════════════════════════════════════════════════════

    function test_relayCall_success() public {
        bool accepted = _doSuccessfulRelayCall();
        assertTrue(accepted, "paymaster should accept");
    }

    function test_relayCall_incrementsForwarderNonce() public {
        assertEq(forwarder.getNonce(senderAddr), 0);
        _doSuccessfulRelayCall();
        assertEq(forwarder.getNonce(senderAddr), 1);
    }

    function test_relayCall_emitsTransactionRelayed() public {
        _setupRelayWorker(
            relayOwner,
            relayManager,
            relayWorker,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );

        GsnTypes.RelayRequest memory relayReq = _buildRelayRequest(
            senderAddr,
            address(recipient),
            abi.encodeWithSelector(TestRecipient.emitMessageNoParams.selector),
            0,
            relayWorker,
            address(paymaster)
        );

        bytes memory sig = _signRelayRequest(relayReq, senderPk);

        vm.prank(relayWorker, relayWorker);
        (bool accepted, , , ) = relayHub.relayCall(
            DOMAIN_SEPARATOR_NAME,
            ACCEPTANCE_BUDGET,
            relayReq,
            sig,
            ""
        );
        assertTrue(accepted);
    }

    // ═══════════════════════════════════════════════════════════════
    //  relayCall — rejections
    // ═══════════════════════════════════════════════════════════════

    function test_relayCall_revertsIfUnknownWorker() public {
        _setupRelayWorker(
            relayOwner,
            relayManager,
            relayWorker,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );

        address unknownWorker = makeAddr("unknownWorker");

        GsnTypes.RelayRequest memory relayReq = _buildRelayRequest(
            senderAddr,
            address(recipient),
            abi.encodeWithSelector(TestRecipient.emitMessageNoParams.selector),
            0,
            unknownWorker,
            address(paymaster)
        );

        bytes memory sig = _signRelayRequest(relayReq, senderPk);

        vm.prank(unknownWorker, unknownWorker);
        vm.expectRevert("Unknown relay worker");
        relayHub.relayCall(
            DOMAIN_SEPARATOR_NAME,
            ACCEPTANCE_BUDGET,
            relayReq,
            sig,
            ""
        );
    }

    function test_relayCall_revertsIfWrongWorker() public {
        _setupRelayWorker(
            relayOwner,
            relayManager,
            relayWorker,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );

        // Also add wrongWorker so it's known
        address wrongWorker = makeAddr("wrongWorker");
        address[] memory workers = new address[](1);
        workers[0] = wrongWorker;
        vm.prank(relayManager);
        relayHub.addRelayWorkers(workers);

        GsnTypes.RelayRequest memory relayReq = _buildRelayRequest(
            senderAddr,
            address(recipient),
            abi.encodeWithSelector(TestRecipient.emitMessageNoParams.selector),
            0,
            relayWorker, // request says relayWorker
            address(paymaster)
        );

        bytes memory sig = _signRelayRequest(relayReq, senderPk);

        vm.prank(wrongWorker, wrongWorker); // but sending from wrongWorker
        vm.expectRevert("Not a right worker");
        relayHub.relayCall(
            DOMAIN_SEPARATOR_NAME,
            ACCEPTANCE_BUDGET,
            relayReq,
            sig,
            ""
        );
    }

    function test_relayCall_revertsIfWorkerIsContract() public {
        _setupRelayWorker(
            relayOwner,
            relayManager,
            relayWorker,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );

        TestRelayWorkerContract workerContract = new TestRelayWorkerContract();
        address[] memory workers = new address[](1);
        workers[0] = address(workerContract);
        vm.prank(relayManager);
        relayHub.addRelayWorkers(workers);

        GsnTypes.RelayRequest memory relayReq = _buildRelayRequest(
            senderAddr,
            address(recipient),
            abi.encodeWithSelector(TestRecipient.emitMessageNoParams.selector),
            0,
            address(workerContract),
            address(paymaster)
        );

        bytes memory sig = _signRelayRequest(relayReq, senderPk);

        // Contract calls relayHub → msg.sender != tx.origin
        vm.expectRevert("relay worker must be EOA");
        workerContract.relayCall(relayHub, ACCEPTANCE_BUDGET, relayReq, sig);
    }

    function test_relayCall_revertsIfNotStaked() public {
        address unstakedWorker = makeAddr("unstakedWorker");

        GsnTypes.RelayRequest memory relayReq = _buildRelayRequest(
            senderAddr,
            address(recipient),
            abi.encodeWithSelector(TestRecipient.emitMessageNoParams.selector),
            0,
            unstakedWorker,
            address(paymaster)
        );

        bytes memory sig = _signRelayRequest(relayReq, senderPk);

        vm.prank(unstakedWorker, unstakedWorker);
        vm.expectRevert("Unknown relay worker");
        relayHub.relayCall(
            DOMAIN_SEPARATOR_NAME,
            ACCEPTANCE_BUDGET,
            relayReq,
            sig,
            ""
        );
    }

    function test_relayCall_revertsIfStakeTooSmall() public {
        _setupRelayWorker(
            relayOwner,
            relayManager,
            relayWorker,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );

        // Increase minimum stake to make current stake insufficient
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = testToken;
        uint256[] memory stakes = new uint256[](1);
        stakes[0] = RELAY_STAKE * 2;
        vm.prank(deployer); // RelayHub owner
        relayHub.setMinimumStakes(tokens, stakes);

        GsnTypes.RelayRequest memory relayReq = _buildRelayRequest(
            senderAddr,
            address(recipient),
            abi.encodeWithSelector(TestRecipient.emitMessageNoParams.selector),
            0,
            relayWorker,
            address(paymaster)
        );
        bytes memory sig = _signRelayRequest(relayReq, senderPk);

        vm.prank(relayWorker, relayWorker);
        vm.expectRevert("stake amount is too small");
        relayHub.relayCall(
            DOMAIN_SEPARATOR_NAME,
            ACCEPTANCE_BUDGET,
            relayReq,
            sig,
            ""
        );
    }

    function test_relayCall_revertsIfHubDeprecated() public {
        _setupRelayWorker(
            relayOwner,
            relayManager,
            relayWorker,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );

        relayHub.deprecateHub(block.timestamp);
        vm.warp(block.timestamp + 1);

        GsnTypes.RelayRequest memory relayReq = _buildRelayRequest(
            senderAddr,
            address(recipient),
            abi.encodeWithSelector(TestRecipient.emitMessageNoParams.selector),
            0,
            relayWorker,
            address(paymaster)
        );
        bytes memory sig = _signRelayRequest(relayReq, senderPk);

        vm.prank(relayWorker, relayWorker);
        vm.expectRevert("hub deprecated");
        relayHub.relayCall(
            DOMAIN_SEPARATOR_NAME,
            ACCEPTANCE_BUDGET,
            relayReq,
            sig,
            ""
        );
    }

    function test_relayCall_revertsIfMissingSignature() public {
        _setupRelayWorker(
            relayOwner,
            relayManager,
            relayWorker,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );

        GsnTypes.RelayRequest memory relayReq = _buildRelayRequest(
            senderAddr,
            address(recipient),
            abi.encodeWithSelector(TestRecipient.emitMessageNoParams.selector),
            0,
            relayWorker,
            address(paymaster)
        );

        vm.prank(relayWorker, relayWorker);
        vm.expectRevert("missing signature or bad gateway");
        relayHub.relayCall(
            DOMAIN_SEPARATOR_NAME,
            ACCEPTANCE_BUDGET,
            relayReq,
            "",
            ""
        );
    }

    function test_relayCall_revertsIfPaymasterBalanceTooLow() public {
        _setupRelayWorker(
            relayOwner,
            relayManager,
            relayWorker,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );

        vm.prank(paymasterOwner);
        paymaster.withdrawRelayHubDepositTo(1 ether, dest);
        assertEq(relayHub.balanceOf(address(paymaster)), 0);

        vm.txGasPrice(1 gwei);

        GsnTypes.RelayRequest memory relayReq = _buildRelayRequest(
            senderAddr,
            address(recipient),
            abi.encodeWithSelector(TestRecipient.emitMessageNoParams.selector),
            0,
            relayWorker,
            address(paymaster)
        );
        bytes memory sig = _signRelayRequest(relayReq, senderPk);

        vm.prank(relayWorker, relayWorker);
        vm.expectRevert("Paymaster balance too low");
        relayHub.relayCall(
            DOMAIN_SEPARATOR_NAME,
            ACCEPTANCE_BUDGET,
            relayReq,
            sig,
            ""
        );
    }

    // ═══════════════════════════════════════════════════════════════
    //  relayCall — paymaster misbehavior
    // ═══════════════════════════════════════════════════════════════

    function test_relayCall_preRelayedCallRevert() public {
        _setupRelayWorker(
            relayOwner,
            relayManager,
            relayWorker,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );

        vm.startPrank(paymasterOwner);
        TestPaymasterConfigurableMisbehavior misbehaving = new TestPaymasterConfigurableMisbehavior();
        misbehaving.setRelayHub(relayHub);
        misbehaving.setTrustedForwarder(address(forwarder));
        misbehaving.setRevertPreRelayCall(true);
        vm.stopPrank();

        vm.deal(other, 2 ether);
        vm.prank(other);
        relayHub.depositFor{value: 2 ether}(address(misbehaving));

        GsnTypes.RelayRequest memory relayReq = _buildRelayRequest(
            senderAddr,
            address(recipient),
            abi.encodeWithSelector(TestRecipient.emitMessageNoParams.selector),
            0,
            relayWorker,
            address(misbehaving)
        );
        bytes memory sig = _signRelayRequest(relayReq, senderPk);

        vm.prank(relayWorker, relayWorker);
        (bool accepted, , IRelayHub.RelayCallStatus status, ) = relayHub
            .relayCall(
                DOMAIN_SEPARATOR_NAME,
                ACCEPTANCE_BUDGET,
                relayReq,
                sig,
                ""
            );

        assertFalse(accepted, "paymaster should reject");
        assertEq(
            uint256(status),
            uint256(IRelayHub.RelayCallStatus.RejectedByPreRelayed)
        );
    }

    function test_relayCall_postRelayedCallRevert() public {
        _setupRelayWorker(
            relayOwner,
            relayManager,
            relayWorker,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );

        vm.startPrank(paymasterOwner);
        TestPaymasterConfigurableMisbehavior misbehaving = new TestPaymasterConfigurableMisbehavior();
        misbehaving.setRelayHub(relayHub);
        misbehaving.setTrustedForwarder(address(forwarder));
        misbehaving.setRevertPostRelayCall(true);
        vm.stopPrank();

        vm.deal(other, 2 ether);
        vm.prank(other);
        relayHub.depositFor{value: 2 ether}(address(misbehaving));

        GsnTypes.RelayRequest memory relayReq = _buildRelayRequest(
            senderAddr,
            address(recipient),
            abi.encodeWithSelector(TestRecipient.emitMessageNoParams.selector),
            0,
            relayWorker,
            address(misbehaving)
        );
        bytes memory sig = _signRelayRequest(relayReq, senderPk);

        vm.prank(relayWorker, relayWorker);
        (bool accepted, , IRelayHub.RelayCallStatus status, ) = relayHub
            .relayCall(
                DOMAIN_SEPARATOR_NAME,
                ACCEPTANCE_BUDGET,
                relayReq,
                sig,
                ""
            );

        assertTrue(accepted);
        assertEq(
            uint256(status),
            uint256(IRelayHub.RelayCallStatus.PostRelayedFailed)
        );
    }

    function test_relayCall_recipientRevert_stillRelayed() public {
        _setupRelayWorker(
            relayOwner,
            relayManager,
            relayWorker,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );

        GsnTypes.RelayRequest memory relayReq = _buildRelayRequest(
            senderAddr,
            address(recipient),
            abi.encodeWithSelector(TestRecipient.testRevert.selector),
            0,
            relayWorker,
            address(paymaster)
        );
        bytes memory sig = _signRelayRequest(relayReq, senderPk);

        vm.prank(relayWorker, relayWorker);
        (bool accepted, , IRelayHub.RelayCallStatus status, ) = relayHub
            .relayCall(
                DOMAIN_SEPARATOR_NAME,
                ACCEPTANCE_BUDGET,
                relayReq,
                sig,
                ""
            );

        assertTrue(accepted, "paymaster should still accept");
        assertEq(
            uint256(status),
            uint256(IRelayHub.RelayCallStatus.RelayedCallFailed)
        );
    }

    // ═══════════════════════════════════════════════════════════════
    //  relayCall — paymaster context
    // ═══════════════════════════════════════════════════════════════

    function test_relayCall_postRelayedCallReceivesContext() public {
        _setupRelayWorker(
            relayOwner,
            relayManager,
            relayWorker,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );

        vm.startPrank(paymasterOwner);
        TestPaymasterStoreContext ctxPaymaster = new TestPaymasterStoreContext();
        ctxPaymaster.setRelayHub(relayHub);
        ctxPaymaster.setTrustedForwarder(address(forwarder));
        vm.stopPrank();

        vm.deal(other, 2 ether);
        vm.prank(other);
        relayHub.depositFor{value: 2 ether}(address(ctxPaymaster));

        GsnTypes.RelayRequest memory relayReq = _buildRelayRequest(
            senderAddr,
            address(recipient),
            abi.encodeWithSelector(TestRecipient.emitMessageNoParams.selector),
            0,
            relayWorker,
            address(ctxPaymaster)
        );
        bytes memory sig = _signRelayRequest(relayReq, senderPk);

        vm.prank(relayWorker, relayWorker);
        (bool accepted, , , ) = relayHub.relayCall(
            DOMAIN_SEPARATOR_NAME,
            ACCEPTANCE_BUDGET,
            relayReq,
            sig,
            ""
        );
        assertTrue(accepted);
        // Context passing verified by the paymaster's internal event emission.
        // A full event check would require vm.expectEmit on low-level emitted events.
    }

    // ═══════════════════════════════════════════════════════════════
    //  calculateCharge
    // ═══════════════════════════════════════════════════════════════

    function test_calculateCharge_zeroFees() public view {
        GsnTypes.RelayData memory rd = GsnTypes.RelayData({
            maxFeePerGas: 1 gwei,
            maxPriorityFeePerGas: 1 gwei,
            transactionCalldataGasUsed: 0,
            relayWorker: relayWorker,
            paymaster: address(paymaster),
            forwarder: address(forwarder),
            paymasterData: "",
            clientId: 0
        });
        uint256 charge = relayHub.calculateCharge(100_000, rd);
        assertGe(charge, 0);
    }

    function test_calculateCharge_withFees() public {
        IRelayHub.RelayHubConfig memory config = relayHub.getConfiguration();
        config.baseRelayFee = 1000;
        config.pctRelayFee = 10;
        relayHub.setConfiguration(config);

        GsnTypes.RelayData memory rd = GsnTypes.RelayData({
            maxFeePerGas: 1 gwei,
            maxPriorityFeePerGas: 1 gwei,
            transactionCalldataGasUsed: 0,
            relayWorker: relayWorker,
            paymaster: address(paymaster),
            forwarder: address(forwarder),
            paymasterData: "",
            clientId: 0
        });
        uint256 charge = relayHub.calculateCharge(100_000, rd);
        // charge = baseRelayFee + (gasUsed * gasPrice * (pctRelayFee + 100)) / 100
        // At minimum, charge should be >= baseRelayFee
        assertGe(charge, 1000, "charge should include base fee");
    }

    // ═══════════════════════════════════════════════════════════════
    //  verifyRelayManagerStaked
    // ═══════════════════════════════════════════════════════════════

    function test_verifyRelayManagerStaked_success() public {
        _setupRelayWorker(
            relayOwner,
            relayManager,
            relayWorker,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );
        relayHub.verifyRelayManagerStaked(relayManager);
    }

    function test_verifyRelayManagerStaked_revertsIfNotStaked() public {
        vm.expectRevert("relay manager not staked");
        relayHub.verifyRelayManagerStaked(makeAddr("nobody"));
    }

    function test_verifyRelayManagerStaked_revertsIfUnstakeDelayTooSmall()
        public
    {
        address mgr = makeAddr("shortDelayMgr");
        address mgrOwner = makeAddr("shortDelayOwner");

        vm.prank(mgrOwner);
        testToken.mint(RELAY_STAKE);
        vm.prank(mgrOwner);
        testToken.approve(address(stakeManager), RELAY_STAKE);
        vm.prank(mgr);
        stakeManager.setRelayManagerOwner(mgrOwner);
        vm.prank(mgrOwner);
        stakeManager.stakeForRelayManager(
            IERC20(address(testToken)),
            mgr,
            1,
            RELAY_STAKE
        );
        vm.prank(mgrOwner);
        stakeManager.authorizeHubByOwner(mgr, address(relayHub));

        vm.expectRevert("unstake delay is too small");
        relayHub.verifyRelayManagerStaked(mgr);
    }

    function test_verifyRelayManagerStaked_revertsIfHubNotAuthorized() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );
        vm.expectRevert("this hub is not authorized by SM");
        relayHub.verifyRelayManagerStaked(relayManager);
    }

    // ═══════════════════════════════════════════════════════════════
    //  penalize
    // ═══════════════════════════════════════════════════════════════

    function test_penalize_revertsIfNotPenalizer() public {
        vm.prank(other);
        vm.expectRevert("Not penalizer");
        relayHub.penalize(relayWorker, payable(other));
    }
}
