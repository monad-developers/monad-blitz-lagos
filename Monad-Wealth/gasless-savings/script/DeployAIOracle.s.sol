// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/AIOracle.sol";
import "../src/ExecutionMiddleware.sol";
import "../src/SavingsVault.sol";

contract DeployAIOracle is Script {
    // Deployed on Monad testnet — these do NOT need redeployment
    address constant VAULT          = 0xFEB8C8e4B23892cf3b67876AD71fF69D1a91EFa4;
    address constant SMART_ACCOUNT  = 0xa6CC996A744357553a1eAAA41c308F29E6cad8C5;

    function run() external {
        uint256 deployerKey = uint256(vm.parseBytes32(
            string.concat("0x", vm.envString("PRIVATE_KEY"))
        ));
        address deployer    = vm.addr(deployerKey);
        address aiOracleKey = deployer; // testnet: same wallet acts as AI oracle

        console.log("Deployer:      ", deployer);
        console.log("Vault:         ", VAULT);

        vm.startBroadcast(deployerKey);

        // 1. Redeploy ExecutionMiddleware with setAIOracle / setRuleFor support
        ExecutionMiddleware middleware = new ExecutionMiddleware(VAULT);
        console.log("ExecutionMiddleware (new):", address(middleware));

        // 2. Deploy AIOracle pointing at the new middleware
        AIOracle oracle = new AIOracle(address(middleware), aiOracleKey);
        console.log("AIOracle:      ", address(oracle));

        // 3. Wire: middleware trusts the oracle
        middleware.setAIOracle(address(oracle));
        console.log("middleware.aiOracle set.");

        // 4. Update vault to use the new middleware
        SavingsVault(payable(VAULT)).setMiddleware(address(middleware));
        console.log("vault.middleware updated.");

        vm.stopBroadcast();

        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("ExecutionMiddleware:", address(middleware));
        console.log("AIOracle:          ", address(oracle));
        console.log("AI oracle key:     ", aiOracleKey);
        console.log("\nUpdate ai/addresses.js:");
        console.log("  EXECUTION_MIDDLEWARE:", address(middleware));
        console.log("  AI_ORACLE:           ", address(oracle));
    }
}
