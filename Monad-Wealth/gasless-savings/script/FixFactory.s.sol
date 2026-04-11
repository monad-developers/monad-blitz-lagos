// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SmartAccountFactory.sol";
import "../src/GaslessSmartAccount.sol";

contract FixFactory is Script {
    address constant ENTRY_POINT     = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;
    address constant NEW_MIDDLEWARE  = 0x7Cd7C6B71453fEde67624f72044C52A4BCdcAC9a;

    function run() external {
        uint256 deployerKey = uint256(vm.parseBytes32(
            string.concat("0x", vm.envString("PRIVATE_KEY"))
        ));
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // Redeploy factory pointing to new middleware
        SmartAccountFactory factory = new SmartAccountFactory(ENTRY_POINT, NEW_MIDDLEWARE);
        console.log("SmartAccountFactory (new):", address(factory));

        // Deploy deployer's smart account from new factory (salt = empty bytes = 0)
        address account = factory.createAccount(deployer, bytes(""));
        console.log("GaslessSmartAccount (new):", account);

        vm.stopBroadcast();

        console.log("\n=== UPDATE THESE IN ALL ADDRESS FILES ===");
        console.log("SMART_ACCOUNT_FACTORY:", address(factory));
        console.log("GASLESS_SMART_ACCOUNT:", address(account));
    }
}
