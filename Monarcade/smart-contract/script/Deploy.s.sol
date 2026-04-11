// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/Monarchade.sol";

contract Deploy is Script {
    function run() external {
        address serverSigner = vm.envAddress("SERVER_SIGNER_ADDRESS");

        vm.startBroadcast();
        Monarchade mm = new Monarchade(serverSigner, 500); 
        console.log("Monarchade deployed at:", address(mm));
        console.log("Server signer:", serverSigner);
        console.log("Chain ID:", block.chainid); 
        vm.stopBroadcast();
    }
}
