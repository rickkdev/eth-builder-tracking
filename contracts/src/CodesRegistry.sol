// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract CodesRegistry is ERC721 {
    uint256 private _nextTokenId;

    mapping(uint256 tokenId => string code) private _codes;
    mapping(bytes32 codeHash => uint256 tokenId) private _codeToTokenId;
    mapping(bytes32 codeHash => bool exists) private _codeExists;

    event CodeMinted(uint256 indexed tokenId, string code, address indexed owner);

    error CodeEmpty();
    error CodeTooLong();
    error CodeInvalidChar();
    error CodeAlreadyExists();
    error CodeNotFound();

    constructor() ERC721("Ethereum Builder Codes", "ETHCODE") {}

    function mint(string calldata code) external returns (uint256) {
        uint256 len = bytes(code).length;
        if (len == 0) revert CodeEmpty();
        if (len > 32) revert CodeTooLong();

        bytes memory b = bytes(code);
        for (uint256 i; i < len; ) {
            uint8 c = uint8(b[i]);
            // lowercase a-z, 0-9, underscore
            bool valid = (c >= 0x61 && c <= 0x7A) // a-z
                || (c >= 0x30 && c <= 0x39) // 0-9
                || (c == 0x5F); // _
            if (!valid) revert CodeInvalidChar();
            unchecked { ++i; }
        }

        bytes32 hash = keccak256(b);
        if (_codeExists[hash]) revert CodeAlreadyExists();

        uint256 tokenId = _nextTokenId++;
        _codeExists[hash] = true;
        _codeToTokenId[hash] = tokenId;
        _codes[tokenId] = code;

        _mint(msg.sender, tokenId);

        emit CodeMinted(tokenId, code, msg.sender);

        return tokenId;
    }

    function getCode(uint256 tokenId) external view returns (string memory) {
        _requireOwned(tokenId);
        return _codes[tokenId];
    }

    function codeExists(string calldata code) external view returns (bool) {
        return _codeExists[keccak256(bytes(code))];
    }

    function tokenIdForCode(string calldata code) external view returns (uint256) {
        bytes32 hash = keccak256(bytes(code));
        if (!_codeExists[hash]) revert CodeNotFound();
        return _codeToTokenId[hash];
    }

    function ownerOfCode(string calldata code) external view returns (address) {
        bytes32 hash = keccak256(bytes(code));
        if (!_codeExists[hash]) revert CodeNotFound();
        return ownerOf(_codeToTokenId[hash]);
    }
}
