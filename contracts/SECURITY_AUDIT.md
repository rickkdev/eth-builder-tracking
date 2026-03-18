# Security Audit Checklist - CodesRegistry

## Slither Static Analysis

**Tool:** Slither v0.11.5
**Date:** 2026-03-18
**Result:** Zero findings on CodesRegistry.sol

All 46 findings are from OpenZeppelin library code (Math.sol, Bytes.sol, etc.) and are known informational-level notes about the library's intentional implementation patterns (XOR in Newton's method, assembly in ERC721Utils, etc.). No high, medium, or low severity findings on our contract.

### Run Slither

```bash
cd contracts
python3 -m slither .
```

## Security Checklist

### Access Control
- [x] `mint()` is permissionless (anyone can mint) - by design
- [x] No admin/owner functions exist - contract is fully immutable after deployment
- [x] No `selfdestruct`, `delegatecall`, or proxy patterns
- [x] Token ownership is managed by ERC-721 standard (`ownerOf`, `transferFrom`, `approve`)

### Checks-Effects-Interactions (CEI) Pattern
- [x] `mint()` follows CEI: validates input → updates state (`_codeExists`, `_codeToTokenId`, `_codes`) → mints token → emits event
- [x] No external calls before state updates
- [x] No reentrancy risk (no ETH transfers, no external contract calls besides ERC-721 internals)

### Events
- [x] `CodeMinted(uint256 indexed tokenId, string code, address indexed owner)` emitted on every mint
- [x] Standard ERC-721 `Transfer` event emitted on mint and transfer (via OpenZeppelin)
- [x] `indexed` on `tokenId` and `owner` for efficient log filtering

### Input Validation
- [x] Code length: 1-32 characters enforced (`CodeEmpty`, `CodeTooLong` errors)
- [x] Character set: lowercase a-z, 0-9, underscore only (`CodeInvalidChar` error)
- [x] Duplicate prevention: `_codeExists` mapping checked before mint (`CodeAlreadyExists` error)
- [x] Byte-level validation loop with unchecked increment for gas efficiency

### No Hardcoded Addresses
- [x] No hardcoded addresses in contract
- [x] No constructor parameters needed (no external dependencies)
- [x] Contract name and symbol set via constructor: `ERC721("Ethereum Builder Codes", "ETHCODE")`

### Gas Efficiency
- [x] Custom errors used (not `require` strings) for gas savings
- [x] `bytes32` hash mapping for O(1) code lookups
- [x] Unchecked loop increment in validation (`unchecked { ++i; }`)
- [x] Sequential token IDs (`_nextTokenId++`)

### No Money Handling
- [x] No `payable` functions
- [x] No ETH/token transfers
- [x] No withdrawal patterns needed
- [x] Minimal attack surface

## Gas Report

| Function | Min | Avg | Median | Max | Notes |
|---|---|---|---|---|---|
| `mint` | 21,961 | 94,573 | 143,508 | 172,408 | ~$0.03 at 0.1 gwei |
| `codeExists` | 3,210 | 3,210 | 3,210 | 3,210 | View function |
| `getCode` | 2,928 | 4,481 | 4,481 | 6,034 | View function |
| `ownerOfCode` | 3,072 | 6,886 | 7,840 | 7,840 | View function |
| `tokenIdForCode` | 3,116 | 4,284 | 4,284 | 5,453 | View function |
| `ownerOf` | 3,093 | 3,093 | 3,093 | 3,093 | View function |
| `transferFrom` | 55,595 | 55,595 | 55,595 | 55,595 | ~$0.01 at 0.1 gwei |
| **Deploy** | **2,292,064** | - | - | - | **~$0.46 at 0.1 gwei** |

## Post-Deploy Checklist

1. **Verify on Etherscan:**
   ```bash
   forge verify-contract <ADDRESS> src/CodesRegistry.sol:CodesRegistry \
     --chain mainnet \
     --etherscan-api-key <KEY>
   ```

2. **Confirm deployment:**
   - Call `name()` → "Ethereum Builder Codes"
   - Call `symbol()` → "ETHCODE"
   - Mint a test code and verify `ownerOfCode()` returns deployer

3. **Update frontend:**
   - Set contract address in `apps/web/contracts/deployedContracts.ts`
   - Update Dune queries with actual contract address

4. **Monitor:**
   - Set up Etherscan alerts for contract events
   - Create Dune dashboard with query templates from `analytics/dune/`
