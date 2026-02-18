// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.25;

import "./Base.t.sol";
import "../packages/contracts/src/test/TestRelayHubForRegistrar.sol";

contract RelayRegistrarTest is GsnTestBase {
    TestRelayHubForRegistrar public hubOne;
    TestRelayHubForRegistrar public hubTwo;
    RelayRegistrar public registrar;

    address public relay1 = makeAddr("relay1");
    address public relay2 = makeAddr("relay2");
    address public relay3 = makeAddr("relay3");

    function _urlParts1() internal pure returns (bytes32[3] memory) {
        return
            [
                bytes32("https://"),
                bytes32("relay1.example.com"),
                bytes32("/v3")
            ];
    }

    function _urlParts2() internal pure returns (bytes32[3] memory) {
        return
            [
                bytes32("https://"),
                bytes32("relay2.example.com"),
                bytes32("/v3")
            ];
    }

    function setUp() public override {
        super.setUp();

        registrar = new RelayRegistrar(365 days);
        hubOne = new TestRelayHubForRegistrar();
        hubTwo = new TestRelayHubForRegistrar();

        hubOne.setRelayManagerStaked(relay1, true);
        hubOne.setRelayManagerStaked(relay2, true);
        hubTwo.setRelayManagerStaked(relay3, true);

        vm.label(address(registrar), "RelayRegistrar");
        vm.label(address(hubOne), "HubOne");
        vm.label(address(hubTwo), "HubTwo");
    }

    // ───────────────────── registerRelayServer ─────────────────────

    function test_registerRelayServer() public {
        vm.prank(relay1);
        registrar.registerRelayServer(address(hubOne), _urlParts1());

        IRelayRegistrar.RelayInfo memory info = registrar.getRelayInfo(
            address(hubOne),
            relay1
        );
        assertEq(info.relayManager, relay1);
        assertEq(info.urlParts[0], bytes32("https://"));
        assertEq(info.urlParts[1], bytes32("relay1.example.com"));
        assertEq(info.urlParts[2], bytes32("/v3"));
    }

    function test_registerRelayServer_revertsIfNotStaked() public {
        address unstaked = makeAddr("unstaked");
        hubOne.setRelayManagerStaked(unstaked, false);

        vm.prank(unstaked);
        vm.expectRevert("onRelayServerRegistered no stake");
        registrar.registerRelayServer(address(hubOne), _urlParts1());
    }

    function test_registerRelayServer_updatesExisting() public {
        vm.prank(relay1);
        registrar.registerRelayServer(address(hubOne), _urlParts1());

        vm.prank(relay1);
        registrar.registerRelayServer(address(hubOne), _urlParts2());

        IRelayRegistrar.RelayInfo memory info = registrar.getRelayInfo(
            address(hubOne),
            relay1
        );
        assertEq(info.urlParts[1], bytes32("relay2.example.com"));
    }

    // ───────────────────── getRelayInfo ─────────────────────

    function test_getRelayInfo_revertsIfNotFound() public {
        vm.expectRevert("relayManager not found");
        registrar.getRelayInfo(address(hubOne), makeAddr("unknown"));
    }

    // ───────────────────── readRelayInfosInRange ─────────────────────

    function test_readRelayInfosInRange() public {
        vm.prank(relay1);
        registrar.registerRelayServer(address(hubOne), _urlParts1());

        vm.prank(relay2);
        registrar.registerRelayServer(address(hubOne), _urlParts2());

        IRelayRegistrar.RelayInfo[] memory infos = registrar
            .readRelayInfosInRange(address(hubOne), 0, 0, 10);

        assertEq(infos.length, 2);
        assertEq(infos[0].relayManager, relay1);
        assertEq(infos[1].relayManager, relay2);
    }

    function test_readRelayInfosInRange_separatesHubs() public {
        vm.prank(relay1);
        registrar.registerRelayServer(address(hubOne), _urlParts1());

        vm.prank(relay3);
        registrar.registerRelayServer(address(hubTwo), _urlParts2());

        IRelayRegistrar.RelayInfo[] memory hubOneInfos = registrar
            .readRelayInfosInRange(address(hubOne), 0, 0, 10);
        IRelayRegistrar.RelayInfo[] memory hubTwoInfos = registrar
            .readRelayInfosInRange(address(hubTwo), 0, 0, 10);

        assertEq(hubOneInfos.length, 1);
        assertEq(hubOneInfos[0].relayManager, relay1);
        assertEq(hubTwoInfos.length, 1);
        assertEq(hubTwoInfos[0].relayManager, relay3);
    }
}
