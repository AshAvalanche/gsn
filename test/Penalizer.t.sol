// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import "./Base.t.sol";

contract PenalizerTest is GsnTestBase {
    uint256 constant RELAY_STAKE = 2 ether;
    uint256 constant RELAY_UNSTAKE_DELAY = 15_000;

    function setUp() public override {
        super.setUp();
    }

    // ═══════════════════════════════════════════════════════════════
    //  Getters
    // ═══════════════════════════════════════════════════════════════

    function test_getPenalizeBlockDelay() public view {
        assertEq(penalizer.getPenalizeBlockDelay(), PENALIZE_BLOCK_DELAY);
    }

    function test_getPenalizeBlockExpiration() public view {
        assertEq(
            penalizer.getPenalizeBlockExpiration(),
            PENALIZE_BLOCK_EXPIRATION
        );
    }

    function test_versionPenalizer() public view {
        assertGt(bytes(penalizer.versionPenalizer()).length, 0);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Transaction type validation
    // ═══════════════════════════════════════════════════════════════

    function test_isTransactionTypeValid_legacy() public view {
        // Legacy transactions start with byte >= 0xc0
        bytes memory legacyTx = new bytes(10);
        legacyTx[0] = 0xc0;
        assertTrue(penalizer.isTransactionTypeValid(legacyTx));
    }

    function test_isTransactionTypeValid_type1() public view {
        bytes memory type1Tx = new bytes(10);
        type1Tx[0] = 0x01;
        assertTrue(penalizer.isTransactionTypeValid(type1Tx));
    }

    function test_isTransactionTypeValid_type2() public view {
        bytes memory type2Tx = new bytes(10);
        type2Tx[0] = 0x02;
        assertTrue(penalizer.isTransactionTypeValid(type2Tx));
    }

    function test_isTransactionTypeValid_invalid() public view {
        bytes memory invalidTx = new bytes(10);
        invalidTx[0] = 0x03; // Not legacy, type1, or type2
        assertFalse(penalizer.isTransactionTypeValid(invalidTx));
    }

    // ═══════════════════════════════════════════════════════════════
    //  commit
    // ═══════════════════════════════════════════════════════════════

    function test_commit_storesHash() public {
        bytes32 hash = keccak256("test");
        penalizer.commit(hash);

        uint256 readyBlock = penalizer.commits(hash);
        assertEq(readyBlock, block.number + PENALIZE_BLOCK_DELAY);
    }

    function test_commit_emitsCommitAdded() public {
        bytes32 hash = keccak256("test");
        vm.expectEmit(true, true, true, true);
        emit IPenalizer.CommitAdded(
            address(this),
            hash,
            block.number + PENALIZE_BLOCK_DELAY
        );
        penalizer.commit(hash);
    }

    // ═══════════════════════════════════════════════════════════════
    //  penalizeIllegalTransaction — commit-reveal checks
    // ═══════════════════════════════════════════════════════════════

    function test_penalizeIllegalTransaction_revertsWithoutCommit() public {
        bytes memory fakeTx = new bytes(10);
        bytes memory fakeSig = new bytes(65);

        vm.expectRevert("no commit");
        penalizer.penalizeIllegalTransaction(
            fakeTx,
            fakeSig,
            IRelayHub(address(relayHub)),
            0
        );
    }

    function test_penalizeIllegalTransaction_revertsIfRevealTooSoon() public {
        bytes memory fakeTx = new bytes(10);
        bytes memory fakeSig = new bytes(65);

        // Compute the commit hash the same way the modifier does
        bytes memory data = abi.encodeCall(
            penalizer.penalizeIllegalTransaction,
            (fakeTx, fakeSig, IRelayHub(address(relayHub)), 0)
        );
        bytes32 commitHash = keccak256(
            abi.encodePacked(keccak256(data), address(this))
        );
        penalizer.commit(commitHash);

        // Don't mine enough blocks
        vm.expectRevert("reveal penalize too soon");
        penalizer.penalizeIllegalTransaction(
            fakeTx,
            fakeSig,
            IRelayHub(address(relayHub)),
            0
        );
    }

    function test_penalizeRepeatedNonce_revertsWithoutCommit() public {
        bytes memory fakeTx1 = new bytes(10);
        bytes memory fakeSig1 = new bytes(65);
        bytes memory fakeTx2 = new bytes(10);
        bytes memory fakeSig2 = new bytes(65);

        vm.expectRevert("no commit");
        penalizer.penalizeRepeatedNonce(
            fakeTx1,
            fakeSig1,
            fakeTx2,
            fakeSig2,
            IRelayHub(address(relayHub)),
            0
        );
    }

    // ═══════════════════════════════════════════════════════════════
    //  supportsInterface
    // ═══════════════════════════════════════════════════════════════

    function test_supportsInterface_IPenalizer() public view {
        assertTrue(penalizer.supportsInterface(type(IPenalizer).interfaceId));
    }

    function test_supportsInterface_IERC165() public view {
        assertTrue(penalizer.supportsInterface(type(IERC165).interfaceId));
    }

    function test_supportsInterface_unknown() public view {
        assertFalse(penalizer.supportsInterface(bytes4(0xdeadbeef)));
    }
}
