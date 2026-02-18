// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import "forge-std/Script.sol";

import "../packages/paymasters/contracts/AcceptEverythingPaymaster.sol";
import "../packages/paymasters/contracts/HashcashPaymaster.sol";
import "../packages/paymasters/contracts/PermitERC20UniswapV3Paymaster.sol";
import "../packages/paymasters/contracts/SingleRecipientPaymaster.sol";
import "../packages/paymasters/contracts/SingletonWhitelistPaymaster.sol";
import "../packages/paymasters/contracts/TokenPaymaster.sol";
import "../packages/paymasters/contracts/VerifyingPaymaster.sol";
import "../packages/paymasters/contracts/WhitelistPaymaster.sol";

import "../packages/paymasters/contracts/interfaces/IChainlinkOracle.sol";
import "../packages/paymasters/contracts/interfaces/IERC725.sol";
import "../packages/paymasters/contracts/interfaces/IUniswapV3.sol";
import "../packages/paymasters/contracts/interfaces/PermitInterfaceDAI.sol";
import "../packages/paymasters/contracts/interfaces/PermitInterfaceEIP2612.sol";

contract CompilePaymasters is Script {
    function run() external {
        // Just importing them forces compilation
    }
}
