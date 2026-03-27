// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import "./Base.t.sol";

/**
 * @title BaseRelayRecipientTest
 * @notice Tests the ERC2771Recipient (_msgSender / _msgData) behavior.
 */
contract BaseRelayRecipientTest is GsnTestBase {
    function setUp() public override {
        super.setUp();
    }

    // ═══════════════════════════════════════════════════════════════
    //  isTrustedForwarder
    // ═══════════════════════════════════════════════════════════════

    function test_isTrustedForwarder_true() public view {
        assertTrue(recipient.isTrustedForwarder(address(forwarder)));
    }

    function test_isTrustedForwarder_false() public view {
        assertFalse(recipient.isTrustedForwarder(address(1)));
    }

    // ═══════════════════════════════════════════════════════════════
    //  _msgSender — direct call (not from forwarder)
    // ═══════════════════════════════════════════════════════════════

    function test_msgSender_directCall() public {
        // When calling directly, _msgSender() == msg.sender
        vm.recordLogs();
        vm.prank(sender);
        recipient.emitMessage("hello");

        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertGt(logs.length, 0, "should emit at least one log");

        // SampleRecipientEmitted event topic
        bytes32 eventSig = keccak256(
            "SampleRecipientEmitted(string,address,address,address,uint256,uint256,uint256)"
        );
        bool found = false;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == eventSig) {
                (
                    , // message
                    address realSender,
                    address msgSender,
                    , // origin
                    , // msgValue
                    , // gasLeft

                ) = abi.decode( // balance
                        logs[i].data,
                        (
                            string,
                            address,
                            address,
                            address,
                            uint256,
                            uint256,
                            uint256
                        )
                    );
                assertEq(
                    realSender,
                    sender,
                    "realSender (_msgSender) should be direct caller"
                );
                assertEq(
                    msgSender,
                    sender,
                    "msg.sender should be direct caller"
                );
                found = true;
                break;
            }
        }
        assertTrue(found, "SampleRecipientEmitted event not found");
    }

    // ═══════════════════════════════════════════════════════════════
    //  _msgSender — via forwarder (extracts appended address)
    // ═══════════════════════════════════════════════════════════════

    function test_msgSender_viaForwarder() public {
        (address signer, uint256 pk) = makeAddrAndKey("recipientSender");

        // Scope to free stack variables
        {
            bytes32 domainSep = _forwarderDomainSeparator();
            string memory forwardType = string(
                abi.encodePacked("ForwardRequest(", GENERIC_PARAMS, ")")
            );
            bytes32 reqTypeHash = keccak256(bytes(forwardType));

            IForwarder.ForwardRequest memory req = IForwarder.ForwardRequest({
                from: signer,
                to: address(recipient),
                value: 0,
                gas: 500_000,
                nonce: 0,
                data: abi.encodeWithSelector(
                    TestRecipient.emitMessage.selector,
                    "from forwarder"
                ),
                validUntilTime: 0
            });

            bytes32 structHash = keccak256(
                abi.encode(
                    reqTypeHash,
                    req.from,
                    req.to,
                    req.value,
                    req.gas,
                    req.nonce,
                    keccak256(req.data),
                    req.validUntilTime
                )
            );
            bytes32 digest = keccak256(
                abi.encodePacked("\x19\x01", domainSep, structHash)
            );
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
            bytes memory sig = abi.encodePacked(r, s, v);

            vm.recordLogs();
            // execute returns (bool, bytes)
            (bool success, ) = forwarder.execute(
                req,
                domainSep,
                reqTypeHash,
                "",
                sig
            );
            assertTrue(success);
        }

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 eventSig = keccak256(
            "SampleRecipientEmitted(string,address,address,address,uint256,uint256,uint256)"
        );
        bool found = false;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == eventSig) {
                (, address realSender, address msgSender, , , , ) = abi.decode(
                    logs[i].data,
                    (
                        string,
                        address,
                        address,
                        address,
                        uint256,
                        uint256,
                        uint256
                    )
                );
                // _msgSender should extract the signer from appended bytes
                assertEq(
                    realSender,
                    signer,
                    "realSender should be signer, extracted from msg.data"
                );
                // msg.sender should be the forwarder
                assertEq(
                    msgSender,
                    address(forwarder),
                    "msg.sender should be forwarder"
                );
                found = true;
                break;
            }
        }
        assertTrue(found, "SampleRecipientEmitted event not found");
    }

    // ═══════════════════════════════════════════════════════════════
    //  getTrustedForwarder
    // ═══════════════════════════════════════════════════════════════

    function test_getTrustedForwarder() public view {
        assertEq(recipient.getTrustedForwarder(), address(forwarder));
    }
}
