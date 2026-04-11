// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Test.sol";
import "../src/SavingsVault.sol";
import "../src/ExecutionMiddleware.sol";
import "../src/BatchExecutor.sol";
import "../src/StrategyRouter.sol";
contract SavingsSystemTest is Test {
SavingsVault      vault;
ExecutionMiddleware middleware;
BatchExecutor     batch;
StrategyRouter    router;
address owner   = address(this);
address user1   = address(0x1);
address user2   = address(0x2);

function setUp() public {
    // Deploy in dependency order
    vault      = new SavingsVault();
    middleware = new ExecutionMiddleware(address(vault));
    batch      = new BatchExecutor(address(vault));
    router     = new StrategyRouter();

    // Wire up
    vault.setMiddleware(address(middleware));
    vault.setBatchExecutor(address(batch));
    vault.setStrategyRouter(address(router));

    // Fund test users
    vm.deal(user1, 10 ether);
    vm.deal(user2, 10 ether);
    // Fund test contract so it can send ETH when pranking as middleware/batch
    vm.deal(address(this), 100 ether);
}

// ── Vault tests ──────────────────────────────────────────────
function test_deposit_creditsBalance() public {
    hoax(address(middleware), 10 ether);
    vault.deposit{value: 1 ether}(user1, 1 ether);
    assertEq(vault.balances(user1), 1 ether);
}

function test_withdraw_pullsCorrectly() public {
    hoax(address(middleware), 10 ether);
    vault.deposit{value: 1 ether}(user1, 1 ether);

    uint256 before = user1.balance;
    vm.prank(user1);
    vault.withdraw(0.5 ether);

    assertEq(user1.balance, before + 0.5 ether);
    assertEq(vault.balances(user1), 0.5 ether);
}

function test_invariant_holds_after_deposit() public {
    hoax(address(middleware), 10 ether);
    vault.deposit{value: 2 ether}(user1, 2 ether);
    assertTrue(vault.checkInvariant());
}

function test_unauthorised_deposit_reverts() public {
    vm.prank(user1);  // not middleware or batchExecutor
    vm.expectRevert("Vault: unauthorized");
    vault.deposit{value: 1 ether}(user1, 1 ether);
}

// ── Middleware tests ─────────────────────────────────────────
function test_roundup_rule() public {
    vm.prank(user1);
    middleware.setRule(
        ExecutionMiddleware.RuleType.ROUNDUP,
        1000,  // round to nearest 1000 wei
        0
    );

    uint256 savings = middleware.processTransaction(user1, 9700);
    assertEq(savings, 300);  // 10000 - 9700
}

function test_percentage_rule() public {
    vm.prank(user1);
    middleware.setRule(
        ExecutionMiddleware.RuleType.PERCENTAGE,
        300,   // 3% in bps
        0
    );

    uint256 savings = middleware.processTransaction(user1, 1 ether);
    assertEq(savings, 0.03 ether);
}

function test_inactive_rule_returns_zero() public {
    // No rule set → should return 0
    uint256 savings = middleware.processTransaction(user1, 1 ether);
    assertEq(savings, 0);
}

function test_below_minimum_returns_zero() public {
    vm.prank(user1);
    middleware.setRule(
        ExecutionMiddleware.RuleType.FIXED,
        50,    // below MIN_SAVINGS (100 wei)
        0
    );

    uint256 savings = middleware.processTransaction(user1, 1 ether);
    assertEq(savings, 0);
}

// ── Batch tests ──────────────────────────────────────────────
function test_batch_deposit() public {
    address[] memory users   = new address[](2);
    uint256[] memory amounts = new uint256[](2);
    users[0]   = user1;
    users[1]   = user2;
    amounts[0] = 0.5 ether;
    amounts[1] = 0.3 ether;

    batch.batchDeposit{value: 0.8 ether}(users, amounts);

    assertEq(vault.balances(user1), 0.5 ether);
    assertEq(vault.balances(user2), 0.3 ether);
    assertTrue(vault.checkInvariant());
}

function test_batch_length_mismatch_reverts() public {
    address[] memory users   = new address[](2);
    uint256[] memory amounts = new uint256[](1);
    vm.expectRevert("Batch: length mismatch");
    batch.batchDeposit{value: 0}(users, amounts);
}
}