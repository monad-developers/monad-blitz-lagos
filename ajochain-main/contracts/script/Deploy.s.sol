// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AjoChain.sol";

contract DeployAjoChain is Script {
    // aPriori liquid staking on Monad testnet
    // https://docs.apriori.finance — verify this address before deploying
    address constant APRIORI_TESTNET = 0xb2f82D0f38dc453D596Ad40A37799446Cc89274A;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address agentWallet = vm.envAddress("AGENT_WALLET");

        vm.startBroadcast(deployerKey);

        AjoChain ajo = new AjoChain(APRIORI_TESTNET, agentWallet);
        console.log("AjoChain deployed at:", address(ajo));
        console.log("Agent wallet:", agentWallet);
        console.log("aPriori:", APRIORI_TESTNET);

        vm.stopBroadcast();
    }
}
