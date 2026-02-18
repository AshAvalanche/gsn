// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import "./Base.t.sol";

/**
 * @title RelayHubRegistrationsTest
 * @notice Tests for addRelayWorkers and verifyRelayManagerStaked integration.
 */
contract RelayHubRegistrationsTest is GsnTestBase {
    uint256 constant RELAY_STAKE = 2 ether;
    uint256 constant RELAY_UNSTAKE_DELAY = 15_000;

    function setUp() public override {
        super.setUp();
    }

    // ═══════════════════════════════════════════════════════════════
    //  addRelayWorkers — edge cases
    // ═══════════════════════════════════════════════════════════════

    function test_addWorkers_revertsIfNotStakedAndNotAuthorized() public {
        address mgr = makeAddr("noStakeMgr");
        address[] memory workers = new address[](1);
        workers[0] = makeAddr("someWorker");

        vm.prank(mgr);
        vm.expectRevert(); // Fails on verifyRelayManagerStaked
        relayHub.addRelayWorkers(workers);
    }

    function test_addWorkers_revertsIfStakedButNotAuthorized() public {
        address mgr = makeAddr("stakedButNotAuthMgr");
        address mgOwner = makeAddr("mgOwner2");

        _mintApproveAndStake(mgOwner, mgr, RELAY_STAKE, RELAY_UNSTAKE_DELAY);
        // Don't authorize hub

        address[] memory workers = new address[](1);
        workers[0] = makeAddr("someWorker");

        vm.prank(mgr);
        vm.expectRevert("this hub is not authorized by SM");
        relayHub.addRelayWorkers(workers);
    }

    function test_addWorkers_revertsIfSameWorkerTwice() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );
        vm.prank(relayOwner);
        stakeManager.authorizeHubByOwner(relayManager, address(relayHub));

        address w = makeAddr("worker");
        address[] memory workers = new address[](1);
        workers[0] = w;

        vm.prank(relayManager);
        relayHub.addRelayWorkers(workers);

        // Add the same worker again — should revert
        vm.prank(relayManager);
        vm.expectRevert("this worker has a manager");
        relayHub.addRelayWorkers(workers);
    }

    function test_addWorkers_multipleManagersDifferentWorkers() public {
        address mgr1 = makeAddr("mgr1");
        address owner1 = makeAddr("owner1");
        address w1 = makeAddr("w1");

        address mgr2 = makeAddr("mgr2");
        address owner2 = makeAddr("owner2");
        address w2 = makeAddr("w2");

        _mintApproveAndStake(owner1, mgr1, RELAY_STAKE, RELAY_UNSTAKE_DELAY);
        vm.prank(owner1);
        stakeManager.authorizeHubByOwner(mgr1, address(relayHub));

        _mintApproveAndStake(owner2, mgr2, RELAY_STAKE, RELAY_UNSTAKE_DELAY);
        vm.prank(owner2);
        stakeManager.authorizeHubByOwner(mgr2, address(relayHub));

        address[] memory workers1 = new address[](1);
        workers1[0] = w1;
        vm.prank(mgr1);
        relayHub.addRelayWorkers(workers1);

        address[] memory workers2 = new address[](1);
        workers2[0] = w2;
        vm.prank(mgr2);
        relayHub.addRelayWorkers(workers2);

        assertEq(relayHub.getWorkerManager(w1), mgr1);
        assertEq(relayHub.getWorkerManager(w2), mgr2);
    }

    function test_addWorkers_emptyArray() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );
        vm.prank(relayOwner);
        stakeManager.authorizeHubByOwner(relayManager, address(relayHub));

        address[] memory workers = new address[](0);
        vm.prank(relayManager);
        relayHub.addRelayWorkers(workers); // Should not revert
        assertEq(relayHub.getWorkerCount(relayManager), 0);
    }

    // ═══════════════════════════════════════════════════════════════
    //  verifyRelayManagerStaked — edge cases
    // ═══════════════════════════════════════════════════════════════

    function test_verifyStaked_forbiddenToken() public {
        // Stake with a token that has no minimum set
        TestToken otherToken = new TestToken();
        address mgr = makeAddr("forbiddenMgr");
        address mgOwner = makeAddr("forbiddenMgOwner");

        vm.prank(mgOwner);
        otherToken.mint(RELAY_STAKE);
        vm.prank(mgOwner);
        otherToken.approve(address(stakeManager), RELAY_STAKE);
        vm.prank(mgr);
        stakeManager.setRelayManagerOwner(mgOwner);
        vm.prank(mgOwner);
        stakeManager.stakeForRelayManager(
            IERC20(address(otherToken)),
            mgr,
            RELAY_UNSTAKE_DELAY,
            RELAY_STAKE
        );
        vm.prank(mgOwner);
        stakeManager.authorizeHubByOwner(mgr, address(relayHub));

        vm.expectRevert("staking this token is forbidden");
        relayHub.verifyRelayManagerStaked(mgr);
    }

    function test_verifyStaked_withdrawnStake() public {
        _mintApproveAndStake(
            relayOwner,
            relayManager,
            RELAY_STAKE,
            RELAY_UNSTAKE_DELAY
        );
        vm.prank(relayOwner);
        stakeManager.authorizeHubByOwner(relayManager, address(relayHub));

        // Unlock and withdraw
        vm.prank(relayOwner);
        stakeManager.unlockStake(relayManager);
        vm.warp(block.timestamp + RELAY_UNSTAKE_DELAY + 1);
        vm.prank(relayOwner);
        stakeManager.withdrawStake(relayManager);

        vm.expectRevert("stake amount is too small");
        relayHub.verifyRelayManagerStaked(relayManager);
    }
}
