// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/CodesRegistry.sol";

contract SmokeTest is Script {
    function run() external {
        // Deploy
        vm.startBroadcast();

        CodesRegistry registry = new CodesRegistry();
        console.log("CodesRegistry deployed at:", address(registry));

        // Mint a code
        uint256 tokenId = registry.mint("smoke_test");
        console.log("Minted code 'smoke_test' with tokenId:", tokenId);

        // Verify ownership
        address owner = registry.ownerOfCode("smoke_test");
        console.log("Owner of 'smoke_test':", owner);
        require(owner == msg.sender, "Owner mismatch");

        // Verify code lookup
        string memory code = registry.getCode(tokenId);
        require(keccak256(bytes(code)) == keccak256(bytes("smoke_test")), "Code mismatch");
        console.log("Code for tokenId 0:", code);

        // Verify existence check
        require(registry.codeExists("smoke_test"), "Code should exist");
        require(!registry.codeExists("nonexistent"), "Code should not exist");

        console.log("All smoke tests passed!");

        vm.stopBroadcast();
    }
}
