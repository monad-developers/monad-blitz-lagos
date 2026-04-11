// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SavingsVault.sol";
import "../src/ExecutionMiddleware.sol";
import "../src/BatchExecutor.sol";
import "../src/StrategyRouter.sol";
import "../src/SavingsPaymaster.sol";
import "../src/GaslessSmartAccount.sol";
import "../src/SmartAccountFactory.sol";
import "../src/MockStrategy.sol";

contract Deploy is Script {
    // Canonical ERC-4337 EntryPoint (same address on all EVM chains via CREATE2)
    address constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;

    function run() external {
        // Support keys with or without 0x prefix
        uint256 deployerKey = uint256(vm.parseBytes32(
            string.concat("0x", vm.envString("PRIVATE_KEY"))
        ));
        address deployer    = vm.addr(deployerKey);

        console.log("Deploying from:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerKey);

        // ── Step 1: Core contracts ────────────────────────────────────────
        SavingsVault vault = new SavingsVault();
        console.log("SavingsVault:        ", address(vault));

        ExecutionMiddleware middleware = new ExecutionMiddleware(address(vault));
        console.log("ExecutionMiddleware: ", address(middleware));

        BatchExecutor batch = new BatchExecutor(address(vault));
        console.log("BatchExecutor:       ", address(batch));

        StrategyRouter router = new StrategyRouter();
        console.log("StrategyRouter:      ", address(router));

        // ── Step 2: Paymaster ─────────────────────────────────────────────
        SavingsPaymaster paymaster = new SavingsPaymaster(ENTRY_POINT);
        console.log("SavingsPaymaster:    ", address(paymaster));

        // ── Step 3: Factory (CREATE2 account deployment) ──────────────────
        SmartAccountFactory factory = new SmartAccountFactory(
            ENTRY_POINT,
            address(middleware)
        );
        console.log("SmartAccountFactory: ", address(factory));

        // Deploy one account for the deployer (empty bytes salt = 0) as a smoke test
        address smartAccount = factory.createAccount(deployer, bytes(""));
        console.log("GaslessSmartAccount: ", smartAccount);
        console.log("  (predicted == actual:", smartAccount == factory.getAddress(deployer, bytes("")), ")");

        // ── Step 4: Wire vault permissions ────────────────────────────────
        vault.setMiddleware(address(middleware));
        vault.setBatchExecutor(address(batch));
        vault.setStrategyRouter(address(router));
        console.log("Vault permissions set.");

        // ── Step 5: Mock yield strategy (testnet only) ────────────────────
        MockStrategy mockStrategy = new MockStrategy();
        console.log("MockStrategy:        ", address(mockStrategy));

        router.approveStrategy(address(mockStrategy));
        console.log("MockStrategy approved in StrategyRouter.");

        // ── Step 6: Fund paymaster ────────────────────────────────────────
        paymaster.depositToEntryPoint{value: 0.1 ether}();
        paymaster.addStake{value: 0.05 ether}(86400);
        console.log("Paymaster funded (0.1 MON) and staked (0.05 MON, 1d delay).");

        vm.stopBroadcast();

        // ── Summary ───────────────────────────────────────────────────────
        console.log("\n=== DEPLOYMENT COMPLETE (chain", block.chainid, ") ===");
        console.log("EntryPoint:          ", ENTRY_POINT);
        console.log("SavingsVault:        ", address(vault));
        console.log("ExecutionMiddleware: ", address(middleware));
        console.log("BatchExecutor:       ", address(batch));
        console.log("StrategyRouter:      ", address(router));
        console.log("MockStrategy:        ", address(mockStrategy));
        console.log("SavingsPaymaster:    ", address(paymaster));
        console.log("SmartAccountFactory: ", address(factory));
        console.log("GaslessSmartAccount: ", address(smartAccount));
    }
}
