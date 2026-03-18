# BuilderTag - Contracts

ERC-721 registry contract for BuilderTag. Each unique ASCII code (1-32 lowercase alphanumeric + underscore) is minted as an NFT.

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)

## Build & Test

```shell
forge build
forge test
forge test --gas-report
```

## Local Anvil Deployment

### 1. Start Anvil

```shell
# Plain local node
anvil

# Or fork mainnet (useful for testing against real state)
anvil --fork-url https://eth.llamarpc.com
```

Anvil provides 10 test accounts pre-funded with 10,000 ETH each. Default account #0:
- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

### 2. Deploy

```shell
forge script script/Deploy.s.sol \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

### 3. Smoke Test

Deploys a fresh instance, mints a code, and verifies ownership:

```shell
forge script script/SmokeTest.s.sol \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

## Gas Report

| Function     | Min    | Avg    | Median  | Max     |
|-------------|--------|--------|---------|---------|
| mint        | 21,961 | 94,573 | 143,508 | 172,408 |
| codeExists  | 3,210  | 3,210  | 3,210   | 3,210   |
| getCode     | 2,928  | 4,481  | 4,481   | 6,034   |
| ownerOfCode | 3,072  | 6,886  | 7,840   | 7,840   |
| ownerOf     | 3,093  | 3,093  | 3,093   | 3,093   |
| transferFrom| 55,595 | 55,595 | 55,595  | 55,595  |

Deployment cost: ~2,292,064 gas (~$0.50 at 0.1 gwei base fee).
Mint cost: ~150K gas (~$0.03 at 0.1 gwei base fee).

## Production Deployment Guide

> **Note:** This section is documentation only. Do NOT run these commands without a funded wallet and proper key management.

### Environment Setup

Create a `.env` file (never commit this):

```shell
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY   # or https://eth.llamarpc.com
PRIVATE_KEY=0x...your_deployer_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Deploy to Sepolia (testnet)

```shell
source .env
forge script script/Deploy.s.sol \
  --rpc-url https://rpc.sepolia.org \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### Deploy to Mainnet

```shell
source .env
forge script script/Deploy.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --with-gas-price 2000000000
```

Gas settings: At current (2026) base fees of ~0.1 gwei, a `maxFeePerGas` of 1-2 gwei provides ample headroom. The `--with-gas-price 2000000000` flag sets 2 gwei.

### Verify on Etherscan (if not done during deploy)

```shell
forge verify-contract \
  --chain-id 1 \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  DEPLOYED_CONTRACT_ADDRESS \
  src/TagRegistry.sol:TagRegistry
```
