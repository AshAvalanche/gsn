// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import "./Base.t.sol";

/**
 * @title RelayHubValidatorTest
 * @notice Tests for the TestRelayHubValidator helper contract.
 */
contract RelayHubValidatorTest is GsnTestBase {
    TestRelayHubValidator public validator;

    function setUp() public override {
        super.setUp();
        validator = new TestRelayHubValidator();
    }

    // ═══════════════════════════════════════════════════════════════
    //  dynamicParamSize
    // ═══════════════════════════════════════════════════════════════

    function test_dynamicParamSize_emptyBytes() public view {
        uint256 size = validator.dynamicParamSize(hex"");
        assertEq(size, 32); // Empty dynamic param still takes one word (length = 0)
    }

    function test_dynamicParamSize_singleWord() public view {
        // 32 bytes of data → 1 word + 1 word for length = 64
        bytes memory data = new bytes(32);
        uint256 size = validator.dynamicParamSize(data);
        assertEq(size, 64);
    }

    function test_dynamicParamSize_lessThanWord() public view {
        // 10 bytes of data → still 1 word (padded) + 1 word for length = 64
        bytes memory data = new bytes(10);
        uint256 size = validator.dynamicParamSize(data);
        assertEq(size, 64);
    }

    function test_dynamicParamSize_multipleWords() public view {
        // 65 bytes → 3 words (padded to 96) + 1 word for length = 128
        bytes memory data = new bytes(65);
        uint256 size = validator.dynamicParamSize(data);
        assertEq(size, 128);
    }
}
