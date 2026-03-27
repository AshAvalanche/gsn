// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import "./Base.t.sol";
import "../packages/contracts/src/forwarder/IForwarder.sol";

contract ForwarderTest is GsnTestBase {
    bytes32 public domainSeparator;
    bytes32 public requestTypeHash;

    function setUp() public override {
        super.setUp();
        domainSeparator = _forwarderDomainSeparator();

        string memory forwardRequestType = string(
            abi.encodePacked("ForwardRequest(", GENERIC_PARAMS, ")")
        );
        requestTypeHash = keccak256(bytes(forwardRequestType));
    }

    // ═══════════════════════════════════════════════════════════════
    //  registerRequestType
    // ═══════════════════════════════════════════════════════════════

    function test_registerRequestType_basic() public {
        string memory typeName = "TestType";
        string memory typeSuffix = "bool extra)Extra(uint256 val)";
        forwarder.registerRequestType(typeName, typeSuffix);

        string memory fullType = string(
            abi.encodePacked(typeName, "(", GENERIC_PARAMS, ",", typeSuffix)
        );
        bytes32 typeHash = keccak256(bytes(fullType));
        assertTrue(forwarder.typeHashes(typeHash));
    }

    function test_registerRequestType_allowsEmptyName() public {
        forwarder.registerRequestType("", "address extra)");
    }

    function test_registerRequestType_defaultTypeRegistered() public view {
        bytes32 relayTypeHash = _relayRequestTypeHash();
        assertTrue(
            forwarder.typeHashes(relayTypeHash),
            "RelayRequest type should be registered at deploy"
        );
    }

    function test_registerRequestType_allowsRepeatedRegistration() public {
        string memory typeName = "RepeatType";
        string memory typeSuffix = "uint256 extra)";
        forwarder.registerRequestType(typeName, typeSuffix);
        forwarder.registerRequestType(typeName, typeSuffix);
    }

    // ═══════════════════════════════════════════════════════════════
    //  registerDomainSeparator
    // ═══════════════════════════════════════════════════════════════

    function test_registerDomainSeparator() public view {
        assertTrue(forwarder.domains(domainSeparator));
    }

    function test_registerNewDomainSeparator() public {
        string memory newName = "MyDapp";
        string memory newVersion = "1";
        forwarder.registerDomainSeparator(newName, newVersion);

        bytes32 newDomainSep = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes(newName)),
                keccak256(bytes(newVersion)),
                block.chainid,
                address(forwarder)
            )
        );
        assertTrue(forwarder.domains(newDomainSep));
    }

    // ═══════════════════════════════════════════════════════════════
    //  verify
    // ═══════════════════════════════════════════════════════════════

    function test_verify_revertsWithEmptySignature() public {
        IForwarder.ForwardRequest memory req = IForwarder.ForwardRequest({
            from: sender,
            to: address(1),
            value: 0,
            gas: 123,
            nonce: 0,
            data: "",
            validUntilTime: 0
        });

        vm.expectRevert("ECDSA: invalid signature length");
        forwarder.verify(req, domainSeparator, requestTypeHash, "", hex"");
    }

    function test_verify_revertsWithWrongNonce() public {
        (address signer, uint256 pk) = makeAddrAndKey("signer");

        IForwarder.ForwardRequest memory req = IForwarder.ForwardRequest({
            from: signer,
            to: address(1),
            value: 0,
            gas: 100_000,
            nonce: 999,
            data: "",
            validUntilTime: 0
        });

        bytes memory sig = _signForwardRequest(req, pk);
        vm.expectRevert("FWD: nonce mismatch");
        forwarder.verify(req, domainSeparator, requestTypeHash, "", sig);
    }

    function test_verify_succeedsWithValidSignature() public {
        (address signer, uint256 pk) = makeAddrAndKey("signer");

        IForwarder.ForwardRequest memory req = IForwarder.ForwardRequest({
            from: signer,
            to: address(1),
            value: 0,
            gas: 100_000,
            nonce: 0,
            data: "",
            validUntilTime: 0
        });

        bytes memory sig = _signForwardRequest(req, pk);
        forwarder.verify(req, domainSeparator, requestTypeHash, "", sig);
    }

    function test_verify_revertsWithUnregisteredDomainSeparator() public {
        (address signer, uint256 pk) = makeAddrAndKey("signer");

        IForwarder.ForwardRequest memory req = IForwarder.ForwardRequest({
            from: signer,
            to: address(1),
            value: 0,
            gas: 100_000,
            nonce: 0,
            data: "",
            validUntilTime: 0
        });

        bytes memory sig = _signForwardRequest(req, pk);

        bytes32 bogusDomain = keccak256("bogus");
        vm.expectRevert("FWD: unregistered domain sep.");
        forwarder.verify(req, bogusDomain, requestTypeHash, "", sig);
    }

    // ═══════════════════════════════════════════════════════════════
    //  execute — basic
    // ═══════════════════════════════════════════════════════════════

    function test_execute_callsTarget() public {
        (address signer, uint256 pk) = makeAddrAndKey("fwdSigner");
        TestRecipient target = new TestRecipient(address(forwarder));
        vm.deal(signer, 1 ether);

        IForwarder.ForwardRequest memory req = IForwarder.ForwardRequest({
            from: signer,
            to: address(target),
            value: 0,
            gas: 500_000,
            nonce: 0,
            data: abi.encodeWithSelector(
                TestRecipient.emitMessageNoParams.selector
            ),
            validUntilTime: 0
        });

        bytes memory sig = _signForwardRequest(req, pk);
        (bool success, ) = forwarder.execute(
            req,
            domainSeparator,
            requestTypeHash,
            "",
            sig
        );
        assertTrue(success);
    }

    function test_execute_incrementsNonce() public {
        (address signer, uint256 pk) = makeAddrAndKey("nonceSigner");
        assertEq(forwarder.getNonce(signer), 0);

        IForwarder.ForwardRequest memory req = IForwarder.ForwardRequest({
            from: signer,
            to: address(recipient),
            value: 0,
            gas: 500_000,
            nonce: 0,
            data: abi.encodeWithSelector(
                TestRecipient.emitMessageNoParams.selector
            ),
            validUntilTime: 0
        });

        bytes memory sig = _signForwardRequest(req, pk);
        forwarder.execute(req, domainSeparator, requestTypeHash, "", sig);
        assertEq(forwarder.getNonce(signer), 1);
    }

    // ═══════════════════════════════════════════════════════════════
    //  execute — revert propagation
    // ═══════════════════════════════════════════════════════════════

    function test_execute_returnsRevertMessage() public {
        (address signer, uint256 pk) = makeAddrAndKey("revertSigner");

        IForwarder.ForwardRequest memory req = IForwarder.ForwardRequest({
            from: signer,
            to: address(recipient),
            value: 0,
            gas: 500_000,
            nonce: 0,
            data: abi.encodeWithSelector(TestRecipient.testRevert.selector),
            validUntilTime: 0
        });

        bytes memory sig = _signForwardRequest(req, pk);
        (bool success, bytes memory ret) = forwarder.execute(
            req,
            domainSeparator,
            requestTypeHash,
            "",
            sig
        );
        assertFalse(success, "should fail because testRevert always reverts");
        assertGt(ret.length, 0, "should return revert data");
    }

    function test_execute_nonceConsumedAfterRevert() public {
        (address signer, uint256 pk) = makeAddrAndKey("nonceRevertSigner");
        assertEq(forwarder.getNonce(signer), 0);

        IForwarder.ForwardRequest memory req = IForwarder.ForwardRequest({
            from: signer,
            to: address(recipient),
            value: 0,
            gas: 500_000,
            nonce: 0,
            data: abi.encodeWithSelector(TestRecipient.testRevert.selector),
            validUntilTime: 0
        });

        bytes memory sig = _signForwardRequest(req, pk);
        (bool success, ) = forwarder.execute(
            req,
            domainSeparator,
            requestTypeHash,
            "",
            sig
        );
        assertFalse(success);
        assertEq(
            forwarder.getNonce(signer),
            1,
            "nonce should be consumed even on revert"
        );
    }

    // ═══════════════════════════════════════════════════════════════
    //  execute — validUntilTime
    // ═══════════════════════════════════════════════════════════════

    function test_execute_revertsIfExpired() public {
        (address signer, uint256 pk) = makeAddrAndKey("expiredSigner");

        // Warp forward so block.timestamp > 1
        vm.warp(1000);

        IForwarder.ForwardRequest memory req = IForwarder.ForwardRequest({
            from: signer,
            to: address(recipient),
            value: 0,
            gas: 500_000,
            nonce: 0,
            data: abi.encodeWithSelector(
                TestRecipient.emitMessageNoParams.selector
            ),
            validUntilTime: 1 // in the past now
        });

        bytes memory sig = _signForwardRequest(req, pk);
        vm.expectRevert("FWD: request expired");
        forwarder.execute(req, domainSeparator, requestTypeHash, "", sig);
    }

    function test_execute_succeeds_validUntilTimeZeroMeansNoExpiry() public {
        (address signer, uint256 pk) = makeAddrAndKey("noExpirySigner");

        IForwarder.ForwardRequest memory req = IForwarder.ForwardRequest({
            from: signer,
            to: address(recipient),
            value: 0,
            gas: 500_000,
            nonce: 0,
            data: abi.encodeWithSelector(
                TestRecipient.emitMessageNoParams.selector
            ),
            validUntilTime: 0 // 0 means no expiry
        });

        bytes memory sig = _signForwardRequest(req, pk);
        (bool success, ) = forwarder.execute(
            req,
            domainSeparator,
            requestTypeHash,
            "",
            sig
        );
        assertTrue(success, "validUntilTime=0 should mean no expiry");
    }

    // ═══════════════════════════════════════════════════════════════
    //  execute — value transfer
    // ═══════════════════════════════════════════════════════════════

    function test_execute_valueTransfer_success() public {
        (address signer, uint256 pk) = makeAddrAndKey("valueSigner");
        address payable valueTarget = payable(makeAddr("valueTarget"));
        uint256 sendValue = 0.1 ether;

        IForwarder.ForwardRequest memory req = IForwarder.ForwardRequest({
            from: signer,
            to: valueTarget,
            value: sendValue,
            gas: 500_000,
            nonce: 0,
            data: "",
            validUntilTime: 0
        });

        bytes memory sig = _signForwardRequest(req, pk);
        (bool success, ) = forwarder.execute{value: sendValue}(
            req,
            domainSeparator,
            requestTypeHash,
            "",
            sig
        );
        assertTrue(success);
        assertEq(valueTarget.balance, sendValue);
    }

    function test_execute_valueTransfer_failsIfInsufficientGas() public {
        (address signer, uint256 pk) = makeAddrAndKey("insuffGasSigner");

        IForwarder.ForwardRequest memory req = IForwarder.ForwardRequest({
            from: signer,
            to: address(recipient),
            value: 0,
            gas: 10_000_000, // Very high gas request
            nonce: 0,
            data: abi.encodeWithSelector(
                TestRecipient.emitMessageNoParams.selector
            ),
            validUntilTime: 0
        });

        bytes memory sig = _signForwardRequest(req, pk);
        // Forward with very low gas to trigger "FWD: insufficient gas"
        vm.expectRevert("FWD: insufficient gas");
        forwarder.execute{gas: 100_000}(
            req,
            domainSeparator,
            requestTypeHash,
            "",
            sig
        );
    }

    // ═══════════════════════════════════════════════════════════════
    //  supportsInterface
    // ═══════════════════════════════════════════════════════════════

    function test_supportsInterface() public view {
        assertTrue(forwarder.supportsInterface(type(IForwarder).interfaceId));
        assertTrue(forwarder.supportsInterface(type(IERC165).interfaceId));
    }

    // ═══════════════════════════════════════════════════════════════
    //  Helper
    // ═══════════════════════════════════════════════════════════════

    function _signForwardRequest(
        IForwarder.ForwardRequest memory req,
        uint256 pk
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                requestTypeHash,
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
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }
}
