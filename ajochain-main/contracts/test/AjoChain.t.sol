// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AjoChain.sol";
import "../src/interfaces/IApriori.sol";

/// @notice Mock aPriori for local testing — 5% instant yield
contract MockApriori is IApriori {
    mapping(address => uint256) public balanceOf;

    function deposit(address receiver) external payable returns (uint256 shares) {
        shares = msg.value; // 1:1 for simplicity in tests
        balanceOf[receiver] += shares;
        return shares;
    }

    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        balanceOf[owner] -= shares;
        assets = shares + (shares / 20); // 5% yield
        payable(receiver).transfer(assets);
        return assets;
    }

    function previewRedeem(uint256 shares) external pure returns (uint256) {
        return shares + (shares / 20);
    }

    function previewDeposit(uint256 assets) external pure returns (uint256) {
        return assets;
    }

    function convertToAssets(uint256 shares) external pure returns (uint256) {
        return shares + (shares / 20);
    }

    receive() external payable {}
}

contract AjoChainTest is Test {
    AjoChain    public ajo;
    MockApriori public mock;

    address public agent   = makeAddr("agent");
    address public alice   = makeAddr("alice");
    address public bob     = makeAddr("bob");
    address public charlie = makeAddr("charlie");

    uint256 constant CONTRIBUTION = 0.05 ether;
    uint256 constant COLLATERAL   = 0.10 ether; // 2x contribution
    uint256 constant ROUND_DUR    = 1 days;

    function setUp() public {
        mock = new MockApriori();
        vm.deal(address(mock), 10 ether); // fund mock for yield payouts

        ajo = new AjoChain(address(mock), agent);

        vm.deal(alice,   10 ether);
        vm.deal(bob,     10 ether);
        vm.deal(charlie, 10 ether);
    }

    // ── helpers ──────────────────────────────────────

    function _createGroup() internal returns (uint256 groupId) {
        address[] memory members = new address[](3);
        members[0] = alice;
        members[1] = bob;
        members[2] = charlie;

        vm.prank(agent);
        groupId = ajo.createGroup(members, CONTRIBUTION, ROUND_DUR);
    }

    function _lockAllCollateral(uint256 groupId) internal {
        vm.prank(alice);   ajo.lockCollateral{value: COLLATERAL}(groupId);
        vm.prank(bob);     ajo.lockCollateral{value: COLLATERAL}(groupId);
        vm.prank(charlie); ajo.lockCollateral{value: COLLATERAL}(groupId);
    }

    function _payAll(uint256 groupId) internal {
        vm.prank(alice);   ajo.payContribution{value: CONTRIBUTION}(groupId);
        vm.prank(bob);     ajo.payContribution{value: CONTRIBUTION}(groupId);
        vm.prank(charlie); ajo.payContribution{value: CONTRIBUTION}(groupId);
    }

    // ── tests ─────────────────────────────────────────

    function test_RegisterIntent() public {
        vm.prank(alice);
        ajo.registerIntent(CONTRIBUTION, 3, ROUND_DUR);

        (, uint256 amt, uint8 size,, bool matched) = ajo.intents(1);
        assertEq(amt,     CONTRIBUTION);
        assertEq(size,    3);
        assertFalse(matched);
    }

    function test_CreateGroup() public {
        uint256 groupId = _createGroup();
        AjoChain.GroupView memory g = ajo.getGroup(groupId);

        assertEq(g.totalMembers,       3);
        assertEq(g.contributionAmount, CONTRIBUTION);
        assertEq(g.collateralAmount,   COLLATERAL);
        assertEq(uint8(g.status),      uint8(0)); // Forming
    }

    function test_LockCollateral_ActivatesGroup() public {
        uint256 groupId = _createGroup();
        _lockAllCollateral(groupId);

        AjoChain.GroupView memory g = ajo.getGroup(groupId);
        assertEq(uint8(g.status),       uint8(1)); // Active
        assertEq(g.currentRound,        1);
    }

    function test_PayContribution() public {
        uint256 groupId = _createGroup();
        _lockAllCollateral(groupId);
        _payAll(groupId);

        AjoChain.GroupView memory g = ajo.getGroup(groupId);
        assertEq(g.paidCount, 3);
    }

    function test_DeployAndWithdrawYield() public {
        uint256 groupId = _createGroup();
        _lockAllCollateral(groupId);
        _payAll(groupId);

        uint256 idleBefore = ajo.getIdleFunds(groupId);
        assertEq(idleBefore, CONTRIBUTION * 3);

        vm.prank(agent);
        ajo.deployToYield(groupId);

        AjoChain.GroupView memory g = ajo.getGroup(groupId);
        assertEq(uint8(g.fundStatus), uint8(1)); // Deployed
        assertEq(ajo.getIdleFunds(groupId), 0);

        vm.prank(agent);
        ajo.withdrawFromYield(groupId);

        g = ajo.getGroup(groupId);
        assertEq(uint8(g.fundStatus), uint8(0)); // Idle again
        assertGt(g.yieldEarned, 0);
    }

    function test_AdvanceRound_PaysWinner() public {
        uint256 groupId = _createGroup();
        _lockAllCollateral(groupId);
        _payAll(groupId);

        uint256 aliceBefore = alice.balance;

        vm.prank(agent);
        ajo.advanceRound(groupId, alice);

        uint256 gained = alice.balance - aliceBefore;
        assertEq(gained, CONTRIBUTION * 3); // 3 members * contribution
    }

    function test_HandleDefault_SlashesAndPaysWinner() public {
        uint256 groupId = _createGroup();
        _lockAllCollateral(groupId);

        // Only alice and bob pay; charlie defaults
        vm.prank(alice); ajo.payContribution{value: CONTRIBUTION}(groupId);
        vm.prank(bob);   ajo.payContribution{value: CONTRIBUTION}(groupId);

        uint256 aliceBefore = alice.balance;

        vm.prank(agent);
        ajo.handleDefault(groupId, charlie, alice, "Charlie failed to pay. First offense. Collateral slashed.");

        // Alice should receive: 2 contributions + charlie's collateral (0.1 ETH)
        uint256 gained = alice.balance - aliceBefore;
        assertEq(gained, CONTRIBUTION * 2 + COLLATERAL);

        AjoChain.MemberView memory charlie_view = ajo.getMember(groupId, charlie);
        assertEq(charlie_view.creditScore, 80); // -20 first offense
        assertEq(charlie_view.defaultCount, 1);
    }

    function test_FullGroupCycle() public {
        uint256 groupId = _createGroup();
        _lockAllCollateral(groupId);

        // Round 1 — alice wins
        _payAll(groupId);
        vm.prank(agent); ajo.advanceRound(groupId, alice);

        // Round 2 — bob wins
        _payAll(groupId);
        vm.prank(agent); ajo.advanceRound(groupId, bob);

        // Round 3 — charlie wins
        _payAll(groupId);
        vm.prank(agent); ajo.advanceRound(groupId, charlie);

        AjoChain.GroupView memory g = ajo.getGroup(groupId);
        assertEq(uint8(g.status), uint8(2)); // Completed
    }
}
