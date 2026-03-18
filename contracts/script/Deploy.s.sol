// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TagRegistry.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        TagRegistry registry = new TagRegistry();
        console.log("TagRegistry deployed at:", address(registry));

        vm.stopBroadcast();
    }
}
