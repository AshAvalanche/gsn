// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import "./Base.t.sol";

contract StakeManagerTest is GsnTestBase {
    uint256 constant INITIAL_STAKE = 1 ether;
    uint256 constant INITIAL_UNSTAKE_DELAY = 15_000;

    function setUp() public override {
        super.setUp();
    }

    // ═══════════════════════════════════════════════════════════════
    //  setRelayManagerOwner
    // ═══════════════════════════════════════════════════════════════

    function test_setRelayManagerOwner() public {
        address mgr = makeAddr("mgr");
        vm.prank(mgr);
        stakeManager.setRelayManagerOwner(relayOwner);

        (IStakeManager.StakeInfo memory info, ) = stakeManager.getStakeInfo(
            mgr
        );
        assertEq(info.owner, relayOwner);
    }

    function test_setRelayManagerOwner_emitsOwnerSet() public {
        address mgr = makeAddr("mgr2");
        vm.prank(mgr);
        vm.expectEmit(true, true, false, false);
        emit IStakeManager.OwnerSet(mgr, relayOwner);
        stakeManager.setRelayManagerOwner(relayOwner);
    }

    function test_setRelayManagerOwner_revertsIfAlreadySet() public {
        address mgr = makeAddr("mgr3");
        vm.prank(mgr);
        stakeManager.setRelayManagerOwner(relayOwner);

        vm.prank(mgr);
        vm.expectRevert("already owned");
        stakeManager.setRelayManagerOwner(other);
    }

    function test_setRelayManagerOwner_revertsIfZeroAddress() public {
        address mgr = makeAddr("mgr");
        vm.prank(mgr);
        vm.expectRevert("invalid owner");
        stakeManager.setRelayManagerOwner(address(0));
    }

    // ═══════════════════════════════════════════════════════════════
    //  stakeForRelayManager
    // ═══════════════════════════════════════════════════════════════

    function test_stakeForRelayManager() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        (IStakeManager.StakeInfo memory info, ) = stakeManager.getStakeInfo(
            relayManager
        );
        assertEq(info.stake, INITIAL_STAKE);
        assertEq(info.unstakeDelay, INITIAL_UNSTAKE_DELAY);
        assertEq(info.owner, relayOwner);
        assertEq(address(info.token), address(testToken));
    }

    function test_stakeForRelayManager_revertsIfNotOwner() public {
        vm.prank(relayManager);
        stakeManager.setRelayManagerOwner(relayOwner);

        vm.prank(other);
        testToken.mint(INITIAL_STAKE);
        vm.startPrank(other);
        testToken.approve(address(stakeManager), INITIAL_STAKE);
        vm.expectRevert("not owner");
        stakeManager.stakeForRelayManager(
            IERC20(address(testToken)),
            relayManager,
            INITIAL_UNSTAKE_DELAY,
            INITIAL_STAKE
        );
        vm.stopPrank();
    }

    function test_stakeForRelayManager_revertsIfOwnerNotSet() public {
        // Try to stake without setting owner first
        address newMgr = makeAddr("newMgr");
        vm.prank(other);
        testToken.mint(INITIAL_STAKE);
        vm.startPrank(other);
        testToken.approve(address(stakeManager), INITIAL_STAKE);
        vm.expectRevert("not owner");
        stakeManager.stakeForRelayManager(
            IERC20(address(testToken)),
            newMgr,
            INITIAL_UNSTAKE_DELAY,
            INITIAL_STAKE
        );
        vm.stopPrank();
    }

    function test_stakeForRelayManager_canAddStake() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        // Add more stake
        uint256 additionalStake = 0.5 ether;
        vm.prank(relayOwner);
        testToken.mint(additionalStake);
        vm.startPrank(relayOwner);
        testToken.approve(address(stakeManager), additionalStake);
        stakeManager.stakeForRelayManager(
            IERC20(address(testToken)),
            relayManager,
            INITIAL_UNSTAKE_DELAY,
            additionalStake
        );
        vm.stopPrank();

        (IStakeManager.StakeInfo memory info, ) = stakeManager.getStakeInfo(
            relayManager
        );
        assertEq(info.stake, INITIAL_STAKE + additionalStake);
    }

    function test_stakeForRelayManager_cannotDecreaseUnstakeDelay() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        // Try to decrease unstake delay
        vm.prank(relayOwner);
        testToken.mint(INITIAL_STAKE);
        vm.startPrank(relayOwner);
        testToken.approve(address(stakeManager), INITIAL_STAKE);
        vm.expectRevert("unstakeDelay cannot be decreased");
        stakeManager.stakeForRelayManager(
            IERC20(address(testToken)),
            relayManager,
            INITIAL_UNSTAKE_DELAY - 1,
            INITIAL_STAKE
        );
    }

    function test_stakeForRelayManager_canIncreaseUnstakeDelay() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        uint256 newDelay = INITIAL_UNSTAKE_DELAY + 1000;
        vm.prank(relayOwner);
        testToken.mint(INITIAL_STAKE);
        vm.startPrank(relayOwner);
        testToken.approve(address(stakeManager), INITIAL_STAKE);
        stakeManager.stakeForRelayManager(
            IERC20(address(testToken)),
            relayManager,
            newDelay,
            INITIAL_STAKE
        );
        vm.stopPrank();

        (IStakeManager.StakeInfo memory info, ) = stakeManager.getStakeInfo(
            relayManager
        );
        assertEq(info.unstakeDelay, newDelay);
    }

    function test_stakeForRelayManager_revertsIfTokenMismatch() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        // Try to stake with a different token
        TestToken otherToken = new TestToken();
        vm.prank(relayOwner);
        otherToken.mint(INITIAL_STAKE);
        vm.startPrank(relayOwner);
        otherToken.approve(address(stakeManager), INITIAL_STAKE);
        vm.expectRevert("stake token address is incorrect");
        stakeManager.stakeForRelayManager(
            IERC20(address(otherToken)),
            relayManager,
            INITIAL_UNSTAKE_DELAY,
            INITIAL_STAKE
        );
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════
    //  unlockStake / withdrawStake
    // ═══════════════════════════════════════════════════════════════

    function test_unlockAndWithdrawStake() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        // Unlock
        vm.prank(relayOwner);
        stakeManager.unlockStake(relayManager);

        // Warp past unstake delay
        vm.warp(block.timestamp + INITIAL_UNSTAKE_DELAY + 1);

        // Withdraw
        uint256 balBefore = testToken.balanceOf(relayOwner);
        vm.prank(relayOwner);
        stakeManager.withdrawStake(relayManager);
        assertEq(testToken.balanceOf(relayOwner) - balBefore, INITIAL_STAKE);
    }

    function test_unlockStake_revertsIfAlreadyPending() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        vm.prank(relayOwner);
        stakeManager.unlockStake(relayManager);

        vm.prank(relayOwner);
        vm.expectRevert("already pending");
        stakeManager.unlockStake(relayManager);
    }

    function test_unlockStake_revertsIfNotOwner() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        vm.prank(other);
        vm.expectRevert("not owner");
        stakeManager.unlockStake(relayManager);
    }

    function test_withdrawStake_revertsIfNotOwner() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        vm.prank(relayOwner);
        stakeManager.unlockStake(relayManager);
        vm.warp(block.timestamp + INITIAL_UNSTAKE_DELAY + 1);

        vm.prank(other);
        vm.expectRevert("not owner");
        stakeManager.withdrawStake(relayManager);
    }

    function test_withdrawStake_revertsIfNotUnlocked() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        vm.prank(relayOwner);
        vm.expectRevert("Withdrawal is not scheduled");
        stakeManager.withdrawStake(relayManager);
    }

    function test_withdrawStake_revertsIfDelayNotPassed() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        vm.prank(relayOwner);
        stakeManager.unlockStake(relayManager);

        // Don't warp far enough
        vm.warp(block.timestamp + INITIAL_UNSTAKE_DELAY - 1);

        vm.prank(relayOwner);
        vm.expectRevert("Withdrawal is not due");
        stakeManager.withdrawStake(relayManager);
    }

    function test_canReStakeAfterWithdrawal() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        vm.prank(relayOwner);
        stakeManager.unlockStake(relayManager);
        vm.warp(block.timestamp + INITIAL_UNSTAKE_DELAY + 1);
        vm.prank(relayOwner);
        stakeManager.withdrawStake(relayManager);

        // Re-stake
        vm.prank(relayOwner);
        testToken.mint(INITIAL_STAKE);
        vm.startPrank(relayOwner);
        testToken.approve(address(stakeManager), INITIAL_STAKE);
        stakeManager.stakeForRelayManager(
            IERC20(address(testToken)),
            relayManager,
            INITIAL_UNSTAKE_DELAY,
            INITIAL_STAKE
        );
        vm.stopPrank();

        (IStakeManager.StakeInfo memory info, ) = stakeManager.getStakeInfo(
            relayManager
        );
        assertEq(info.stake, INITIAL_STAKE);
    }

    // ═══════════════════════════════════════════════════════════════
    //  authorizeHub / unauthorizeHub
    // ═══════════════════════════════════════════════════════════════

    function test_authorizeAndUnauthorizeHub() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        vm.prank(relayOwner);
        stakeManager.authorizeHubByOwner(relayManager, address(relayHub));

        vm.prank(address(relayHub));
        (, bool afterAuthorize) = stakeManager.getStakeInfo(relayManager);
        assertTrue(afterAuthorize, "hub should be authorized");

        vm.prank(relayOwner);
        stakeManager.unauthorizeHubByOwner(relayManager, address(relayHub));

        vm.prank(address(relayHub));
        (, bool afterUnauthorize) = stakeManager.getStakeInfo(relayManager);
        assertFalse(
            afterUnauthorize,
            "hub should not be authorized after unauthorize"
        );
    }

    function test_authorizeHub_revertsIfNotOwnerOrManager() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        vm.prank(other);
        vm.expectRevert("not owner");
        stakeManager.authorizeHubByOwner(relayManager, address(relayHub));
    }

    function test_unauthorizeHub_revertsIfNotOwnerOrManager() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        vm.prank(relayOwner);
        stakeManager.authorizeHubByOwner(relayManager, address(relayHub));

        vm.prank(other);
        vm.expectRevert("not owner");
        stakeManager.unauthorizeHubByOwner(relayManager, address(relayHub));
    }

    function test_unauthorizeHub_revertsIfNotAuthorized() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        vm.prank(relayOwner);
        vm.expectRevert("hub not authorized");
        stakeManager.unauthorizeHubByOwner(relayManager, address(relayHub));
    }

    function test_authorizeHubByManager() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        // Manager can also authorize
        vm.prank(relayManager);
        stakeManager.authorizeHubByManager(address(relayHub));

        vm.prank(address(relayHub));
        (, bool authorized) = stakeManager.getStakeInfo(relayManager);
        assertTrue(authorized);
    }

    function test_unauthorizeHubByManager() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        vm.prank(relayOwner);
        stakeManager.authorizeHubByOwner(relayManager, address(relayHub));

        vm.prank(relayManager);
        stakeManager.unauthorizeHubByManager(address(relayHub));

        vm.prank(address(relayHub));
        (, bool authorized) = stakeManager.getStakeInfo(relayManager);
        assertFalse(authorized);
    }

    // ═══════════════════════════════════════════════════════════════
    //  penalizeRelayManager
    // ═══════════════════════════════════════════════════════════════

    function test_penalizeRelayManager() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        vm.prank(relayOwner);
        stakeManager.authorizeHubByOwner(relayManager, address(relayHub));

        uint256 penaltyAmount = INITIAL_STAKE / 2;
        address payable beneficiary = payable(makeAddr("beneficiary"));

        vm.prank(address(relayHub));
        stakeManager.penalizeRelayManager(
            relayManager,
            beneficiary,
            penaltyAmount
        );

        (IStakeManager.StakeInfo memory info, ) = stakeManager.getStakeInfo(
            relayManager
        );
        assertEq(info.stake, INITIAL_STAKE - penaltyAmount);
    }

    function test_penalizeRelayManager_revertsIfNotAuthorizedHub() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            INITIAL_STAKE,
            INITIAL_UNSTAKE_DELAY
        );

        vm.prank(other);
        vm.expectRevert(); // Not an authorized hub
        stakeManager.penalizeRelayManager(
            relayManager,
            payable(other),
            INITIAL_STAKE
        );
    }

    // ═══════════════════════════════════════════════════════════════
    //  setBurnAddress / setDevAddress
    // ═══════════════════════════════════════════════════════════════

    function test_setBurnAddress() public {
        address newBurn = makeAddr("newBurn");
        stakeManager.setBurnAddress(newBurn);
    }

    function test_setBurnAddress_revertsIfNotOwner() public {
        vm.prank(other);
        vm.expectRevert("Ownable: caller is not the owner");
        stakeManager.setBurnAddress(makeAddr("x"));
    }
}
