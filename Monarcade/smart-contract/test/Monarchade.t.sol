// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/Monarchade.sol";

contract MonarchadeTest is Test {
    Monarchade public mm;

    receive() external payable {}

    address owner = address(this);
    address serverSigner = address(0x1);
    address brand = address(0x2);
    address brand2 = address(0x5);
    address player1 = address(0x3);
    address player2 = address(0x4);

    bytes32 constant META_HASH = keccak256("TestBrand|/uploads/test.png|Best brand ever");

    function setUp() public {
        mm = new Monarchade(serverSigner, 500); 
    }

    function _createAndStart(address _brand, uint256 value, uint256 duration, uint256 winners)
        internal returns (uint256)
    {
        vm.prank(_brand);
        uint256 id = mm.createChallenge{value: value}(META_HASH, duration, winners);
        vm.prank(_brand);
        mm.startChallenge(id);
        return id;
    }

    function test_CreateChallenge() public {
        vm.deal(brand, 10 ether);
        vm.prank(brand);
        uint256 id = mm.createChallenge{value: 1 ether}(META_HASH, 1 hours, 3);

        assertEq(id, 1);
        Monarchade.Challenge memory c = mm.getChallenge(1);
        assertEq(c.brand, brand);
        assertEq(c.prizePool, 0.95 ether);
        assertEq(c.deadline, 1 hours);
        assertFalse(c.started);            
        assertEq(c.startTime, 0);
        assertEq(c.endTime, 0);
        assertTrue(c.exists);
    }

    function test_StartChallenge() public {
        vm.deal(brand, 10 ether);
        vm.prank(brand);
        uint256 id = mm.createChallenge{value: 1 ether}(META_HASH, 1 hours, 3);

        assertFalse(mm.isActive(id));

        vm.prank(brand);
        mm.startChallenge(id);

        Monarchade.Challenge memory c = mm.getChallenge(id);
        assertTrue(c.started);
        assertEq(c.startTime, block.timestamp);
        assertEq(c.endTime, block.timestamp + 1 hours);
        assertTrue(mm.isActive(id));
    }

    function test_CannotStartTwice() public {
        vm.deal(brand, 10 ether);
        vm.prank(brand);
        uint256 id = mm.createChallenge{value: 1 ether}(META_HASH, 1 hours, 3);

        vm.startPrank(brand);
        mm.startChallenge(id);
        vm.expectRevert("Already started");
        mm.startChallenge(id);
        vm.stopPrank();
    }

    function test_OnlyBrandCanStart() public {
        vm.deal(brand, 10 ether);
        vm.prank(brand);
        uint256 id = mm.createChallenge{value: 1 ether}(META_HASH, 1 hours, 3);

        vm.prank(player1);
        vm.expectRevert("Not the challenge brand");
        mm.startChallenge(id);
    }

    function test_SubmitScore() public {
        vm.deal(brand, 10 ether);
        uint256 id = _createAndStart(brand, 1 ether, 1 hours, 3);

        vm.prank(serverSigner);
        mm.submitScore(id, player1, 250);

        (uint256 score, bool played) = mm.getPlayerScore(id, player1);
        assertEq(score, 250);
        assertTrue(played);
    }

    function test_CannotSubmitBeforeStart() public {
        vm.deal(brand, 10 ether);
        vm.prank(brand);
        uint256 id = mm.createChallenge{value: 1 ether}(META_HASH, 1 hours, 3);
        
        vm.prank(serverSigner);
        vm.expectRevert("Challenge not started");
        mm.submitScore(id, player1, 250);
    }

    function test_CannotSubmitTwice() public {
        vm.deal(brand, 10 ether);
        uint256 id = _createAndStart(brand, 1 ether, 1 hours, 3);

        vm.startPrank(serverSigner);
        mm.submitScore(id, player1, 250);
        vm.expectRevert("Player already submitted");
        mm.submitScore(id, player1, 200);
        vm.stopPrank();
    }

    function test_ScoreCannotExceedMax() public {
        vm.deal(brand, 10 ether);
        uint256 id = _createAndStart(brand, 1 ether, 1 hours, 3);

        vm.prank(serverSigner);
        vm.expectRevert("Score exceeds maximum");
        mm.submitScore(id, player1, 301);
    }

    function test_OnlyServerSignerCanSubmit() public {
        vm.deal(brand, 10 ether);
        uint256 id = _createAndStart(brand, 1 ether, 1 hours, 3);

        vm.prank(player1);
        vm.expectRevert("Not authorized");
        mm.submitScore(id, player1, 100);
    }

    function test_DistributeRewards() public {
        vm.deal(brand, 10 ether);
        uint256 id = _createAndStart(brand, 1 ether, 1 hours, 3);

        vm.startPrank(serverSigner);
        mm.submitScore(id, player1, 280);
        mm.submitScore(id, player2, 200);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 hours + 5 minutes);

        address[] memory winners = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        winners[0] = player1;
        winners[1] = player2;
        amounts[0] = 0.475 ether;
        amounts[1] = 0.475 ether;

        uint256 p1Before = player1.balance;
        uint256 p2Before = player2.balance;

        vm.prank(serverSigner);
        mm.distributeRewards(id, winners, amounts);

        assertEq(player1.balance - p1Before, 0.475 ether);
        assertEq(player2.balance - p2Before, 0.475 ether);

        Monarchade.Challenge memory c = mm.getChallenge(id);
        assertTrue(c.distributed);
        assertEq(c.prizePool, 0);
    }

    function test_CannotDistributeTwice() public {
        vm.deal(brand, 10 ether);
        uint256 id = _createAndStart(brand, 1 ether, 1 hours, 3);

        vm.prank(serverSigner);
        mm.submitScore(id, player1, 280);

        vm.warp(block.timestamp + 2 hours + 5 minutes);

        address[] memory winners = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        winners[0] = player1;
        amounts[0] = 0.95 ether;

        vm.startPrank(serverSigner);
        mm.distributeRewards(id, winners, amounts);
        vm.expectRevert("Already distributed");
        mm.distributeRewards(id, winners, amounts);
        vm.stopPrank();
    }

    function test_WinnerMustHavePlayed() public {
        vm.deal(brand, 10 ether);
        uint256 id = _createAndStart(brand, 1 ether, 1 hours, 3);

        vm.prank(serverSigner);
        mm.submitScore(id, player1, 250);

        vm.warp(block.timestamp + 2 hours + 5 minutes);

        address[] memory winners = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        winners[0] = player2;
        amounts[0] = 0.95 ether;

        vm.prank(serverSigner);
        vm.expectRevert("Winner did not play");
        mm.distributeRewards(id, winners, amounts);
    }

    function test_RefundBrandNotStarted() public {
        vm.deal(brand, 10 ether);
        vm.prank(brand);
        uint256 id = mm.createChallenge{value: 1 ether}(META_HASH, 1 hours, 3);

        uint256 brandBalBefore = brand.balance;

        vm.prank(brand);
        mm.refundBrand(id);

        assertEq(brand.balance - brandBalBefore, 0.95 ether);
    }

    function test_RefundBrandAfterStartNoSubmissions() public {
        vm.deal(brand, 10 ether);
        uint256 id = _createAndStart(brand, 1 ether, 1 hours, 3);

        uint256 brandBalBefore = brand.balance;

        vm.warp(block.timestamp + 1 hours + 5 minutes + 48 hours + 1);

        vm.prank(brand);
        mm.refundBrand(id);

        assertEq(brand.balance - brandBalBefore, 0.95 ether);
    }

    function test_CannotRefundIfHasSubmissions() public {
        vm.deal(brand, 10 ether);
        uint256 id = _createAndStart(brand, 1 ether, 1 hours, 3);

        vm.prank(serverSigner);
        mm.submitScore(id, player1, 100);

        vm.warp(block.timestamp + 1 hours + 5 minutes + 48 hours + 1);

        vm.prank(brand);
        vm.expectRevert("Challenge has submissions");
        mm.refundBrand(id);
    }

    function test_MultiBrandFundIsolation() public {
        vm.deal(brand, 10 ether);
        vm.deal(brand2, 10 ether);

        uint256 id1 = _createAndStart(brand, 1 ether, 1 hours, 3);

        vm.prank(brand2);
        uint256 id2 = mm.createChallenge{value: 2 ether}(
            keccak256("Brand2|/uploads/logo2.png|Another tagline"), 1 hours, 3
        );
        vm.prank(brand2);
        mm.startChallenge(id2);

        assertEq(mm.totalEscrowed(), 2.85 ether);

        vm.startPrank(serverSigner);
        mm.submitScore(id1, player1, 250);
        mm.submitScore(id2, player2, 200);
        vm.stopPrank();

        vm.warp(block.timestamp + 2 hours + 5 minutes);

        address[] memory w1 = new address[](1);
        uint256[] memory a1 = new uint256[](1);
        w1[0] = player1;
        a1[0] = 0.95 ether;

        vm.prank(serverSigner);
        mm.distributeRewards(id1, w1, a1);
        assertEq(mm.totalEscrowed(), 1.90 ether);

        address[] memory w2 = new address[](1);
        uint256[] memory a2 = new uint256[](1);
        w2[0] = player2;
        a2[0] = 1.90 ether;

        vm.prank(serverSigner);
        mm.distributeRewards(id2, w2, a2);
        assertEq(mm.totalEscrowed(), 0);
        assertEq(address(mm).balance, 0);
    }

    function test_EmergencyWithdrawProtectsPrizePools() public {
        vm.deal(brand, 10 ether);
        vm.prank(brand);
        mm.createChallenge{value: 1 ether}(META_HASH, 1 hours, 3);

        assertEq(mm.totalEscrowed(), 0.95 ether);

        vm.expectRevert("No excess funds");
        mm.emergencyWithdraw();

        (bool ok,) = address(mm).call{value: 0.5 ether}("");
        assertTrue(ok);

        uint256 ownerBefore = address(this).balance;
        mm.emergencyWithdraw();
        assertEq(address(this).balance - ownerBefore, 0.5 ether);

        assertEq(address(mm).balance, 0.95 ether);
    }
}
