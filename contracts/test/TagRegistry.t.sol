// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TagRegistry.sol";

contract TagRegistryTest is Test {
    TagRegistry public registry;
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    function setUp() public {
        registry = new TagRegistry();
    }

    function test_mint() public {
        vm.prank(alice);
        uint256 tokenId = registry.mint("my_code");

        assertEq(tokenId, 0);
        assertEq(registry.getCode(0), "my_code");
        assertEq(registry.ownerOf(0), alice);
        assertEq(registry.ownerOfCode("my_code"), alice);
        assertTrue(registry.codeExists("my_code"));
        assertEq(registry.tokenIdForCode("my_code"), 0);
    }

    function test_mintEmitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit TagRegistry.TagMinted(0, "test_code", alice);
        registry.mint("test_code");
    }

    function test_mintMultiple() public {
        vm.prank(alice);
        uint256 id0 = registry.mint("code_a");
        vm.prank(bob);
        uint256 id1 = registry.mint("code_b");

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(registry.ownerOfCode("code_a"), alice);
        assertEq(registry.ownerOfCode("code_b"), bob);
    }

    function test_revertDuplicateCode() public {
        vm.prank(alice);
        registry.mint("unique");

        vm.prank(bob);
        vm.expectRevert(TagRegistry.CodeAlreadyExists.selector);
        registry.mint("unique");
    }

    function test_revertEmptyCode() public {
        vm.expectRevert(TagRegistry.CodeEmpty.selector);
        registry.mint("");
    }

    function test_revertCodeTooLong() public {
        // 33 chars
        vm.expectRevert(TagRegistry.CodeTooLong.selector);
        registry.mint("abcdefghijklmnopqrstuvwxyz1234567");
    }

    function test_maxLengthCode() public {
        // 32 chars - should succeed
        string memory code = "abcdefghijklmnopqrstuvwxyz123456";
        assertEq(bytes(code).length, 32);
        registry.mint(code);
        assertTrue(registry.codeExists(code));
    }

    function test_revertInvalidCharsUppercase() public {
        vm.expectRevert(TagRegistry.CodeInvalidChar.selector);
        registry.mint("Hello");
    }

    function test_revertInvalidCharsSpace() public {
        vm.expectRevert(TagRegistry.CodeInvalidChar.selector);
        registry.mint("has space");
    }

    function test_revertInvalidCharsDash() public {
        vm.expectRevert(TagRegistry.CodeInvalidChar.selector);
        registry.mint("has-dash");
    }

    function test_validCharsUnderscoreAndNumbers() public {
        registry.mint("code_123");
        assertTrue(registry.codeExists("code_123"));
    }

    function test_transferUpdatesOwnership() public {
        vm.prank(alice);
        registry.mint("transferable");

        vm.prank(alice);
        registry.transferFrom(alice, bob, 0);

        assertEq(registry.ownerOfCode("transferable"), bob);
        assertEq(registry.ownerOf(0), bob);
    }

    function test_codeExistsReturnsFalse() public view {
        assertFalse(registry.codeExists("nonexistent"));
    }

    function test_tokenIdForCodeRevertsNotFound() public {
        vm.expectRevert(TagRegistry.CodeNotFound.selector);
        registry.tokenIdForCode("nonexistent");
    }

    function test_ownerOfCodeRevertsNotFound() public {
        vm.expectRevert(TagRegistry.CodeNotFound.selector);
        registry.ownerOfCode("nonexistent");
    }

    function test_getCodeRevertsForNonexistentToken() public {
        vm.expectRevert();
        registry.getCode(999);
    }
}
