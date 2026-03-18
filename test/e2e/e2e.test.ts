/**
 * End-to-end integration test for Ethereum Builder Codes.
 *
 * Deploys CodesRegistry, mints codes, sends attributed transactions with
 * ox/erc8021 suffixes, and verifies the complete tracking flow.
 *
 * Requires a local Anvil instance running on http://127.0.0.1:8545.
 * Run: npx tsx test/e2e/e2e.test.ts
 */

import { execSync, spawn, type ChildProcess } from "child_process";
import { join } from "path";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  type Hex,
  type Address,
  encodeFunctionData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { Attribution } from "ox/erc8021";

// ── Config ───────────────────────────────────────────────────────────────────

const ANVIL_RPC = "http://127.0.0.1:8545";
const ANVIL_KEY_0 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;
const ANVIL_KEY_1 = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as Hex;
const ANVIL_KEY_2 = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" as Hex;

const TEST_CODES = ["alice_app", "bob_protocol", "charlie_dao"];

let anvilProcess: ChildProcess | null = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getContractArtifact() {
  const contractsDir = join(__dirname, "..", "..", "contracts");
  // Build first to ensure artifacts exist
  execSync("forge build", { cwd: contractsDir, stdio: "pipe" });
  const artifact = require(join(contractsDir, "out", "CodesRegistry.sol", "CodesRegistry.json"));
  return {
    abi: artifact.abi,
    bytecode: artifact.bytecode.object as Hex,
  };
}

async function startAnvil(): Promise<void> {
  // Check if Anvil is already running
  try {
    const client = createPublicClient({ chain: foundry, transport: http(ANVIL_RPC) });
    await client.getChainId();
    console.log("  Anvil already running on port 8545");
    return;
  } catch {
    // Not running, start it
  }

  console.log("  Starting Anvil...");
  anvilProcess = spawn("anvil", ["--silent"], {
    stdio: "pipe",
    detached: false,
  });

  // Wait for Anvil to be ready
  for (let i = 0; i < 30; i++) {
    try {
      const client = createPublicClient({ chain: foundry, transport: http(ANVIL_RPC) });
      await client.getChainId();
      console.log("  Anvil started");
      return;
    } catch {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  throw new Error("Anvil failed to start within 6 seconds");
}

function stopAnvil(): void {
  if (anvilProcess) {
    anvilProcess.kill();
    anvilProcess = null;
    console.log("  Anvil stopped");
  }
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
  passed++;
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  assert(
    actual === expected,
    `${message} (expected: ${String(expected)}, got: ${String(actual)})`,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n═══ Ethereum Builder Codes E2E Test ═══\n");

  try {
    // ── Setup ──
    console.log("Setup:");
    await startAnvil();

    const { abi, bytecode } = getContractArtifact();

    const account0 = privateKeyToAccount(ANVIL_KEY_0);
    const account1 = privateKeyToAccount(ANVIL_KEY_1);
    const account2 = privateKeyToAccount(ANVIL_KEY_2);

    const publicClient = createPublicClient({
      chain: foundry,
      transport: http(ANVIL_RPC),
    });

    const walletClient0 = createWalletClient({
      account: account0,
      chain: foundry,
      transport: http(ANVIL_RPC),
    });

    const walletClient1 = createWalletClient({
      account: account1,
      chain: foundry,
      transport: http(ANVIL_RPC),
    });

    const walletClient2 = createWalletClient({
      account: account2,
      chain: foundry,
      transport: http(ANVIL_RPC),
    });

    // ── Deploy ──
    console.log("\n1. Deploy CodesRegistry:");
    const deployHash = await walletClient0.deployContract({
      abi,
      bytecode,
    });
    const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
    const registryAddress = deployReceipt.contractAddress as Address;
    assert(!!registryAddress, `Contract deployed at ${registryAddress}`);

    // ── Mint 3 test codes ──
    console.log("\n2. Mint test codes:");
    const wallets = [walletClient0, walletClient1, walletClient2];
    const tokenIds: bigint[] = [];

    for (let i = 0; i < TEST_CODES.length; i++) {
      const code = TEST_CODES[i];
      const wallet = wallets[i];

      const mintHash = await wallet.writeContract({
        address: registryAddress,
        abi,
        functionName: "mint",
        args: [code],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: mintHash });
      assert(receipt.status === "success", `Minted "${code}" by ${wallet.account.address.slice(0, 8)}...`);

      // Read back token ID
      const tokenId = await publicClient.readContract({
        address: registryAddress,
        abi,
        functionName: "tokenIdForCode",
        args: [code],
      }) as bigint;
      tokenIds.push(tokenId);
    }

    // ── Verify ownership ──
    console.log("\n3. Verify ownerOfCode lookups:");
    for (let i = 0; i < TEST_CODES.length; i++) {
      const owner = await publicClient.readContract({
        address: registryAddress,
        abi,
        functionName: "ownerOfCode",
        args: [TEST_CODES[i]],
      }) as Address;
      assertEqual(
        owner.toLowerCase(),
        wallets[i].account.address.toLowerCase(),
        `ownerOfCode("${TEST_CODES[i]}") = ${owner.slice(0, 8)}...`,
      );
    }

    // ── Generate ERC-8021 suffixes and send attributed transactions ──
    console.log("\n4. Send attributed transactions with ERC-8021 suffixes:");
    const txHashes: Hex[] = [];

    for (let i = 0; i < TEST_CODES.length; i++) {
      const code = TEST_CODES[i];
      const suffix = Attribution.toDataSuffix({ codes: [code] });

      // Send a simple ETH transfer with the suffix appended
      const txHash = await wallets[i].sendTransaction({
        to: account0.address,
        value: parseEther("0.01"),
        data: suffix as Hex,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      assert(receipt.status === "success", `Sent attributed tx for "${code}" (${txHash.slice(0, 12)}...)`);
      txHashes.push(txHash);
    }

    // ── Verify suffix decoding ──
    console.log("\n5. Verify ERC-8021 suffix decoding from transaction calldata:");
    for (let i = 0; i < txHashes.length; i++) {
      const tx = await publicClient.getTransaction({ hash: txHashes[i] });
      const decoded = Attribution.fromData(tx.input);
      assert(decoded !== undefined, `Decoded suffix from tx ${txHashes[i].slice(0, 12)}...`);
      assert(
        decoded!.codes.length === 1 && decoded!.codes[0] === TEST_CODES[i],
        `Decoded code "${decoded!.codes[0]}" matches expected "${TEST_CODES[i]}"`,
      );
    }

    // ── Test ERC-721 transfer ──
    console.log("\n6. Test code transfer (ERC-721) and verify new owner:");
    const transferCode = TEST_CODES[0]; // alice_app owned by account0

    // Transfer from account0 to account1
    const transferHash = await walletClient0.writeContract({
      address: registryAddress,
      abi,
      functionName: "transferFrom",
      args: [account0.address, account1.address, tokenIds[0]],
    });
    const transferReceipt = await publicClient.waitForTransactionReceipt({ hash: transferHash });
    assert(transferReceipt.status === "success", `Transferred "${transferCode}" from account0 to account1`);

    // Verify new owner
    const newOwner = await publicClient.readContract({
      address: registryAddress,
      abi,
      functionName: "ownerOfCode",
      args: [transferCode],
    }) as Address;
    assertEqual(
      newOwner.toLowerCase(),
      account1.address.toLowerCase(),
      `ownerOfCode("${transferCode}") now returns account1`,
    );

    // ── Test multi-code attribution ──
    console.log("\n7. Test multi-code suffix (bonus):");
    const multiSuffix = Attribution.toDataSuffix({ codes: ["alice_app", "bob_protocol"] });
    const multiTxHash = await walletClient0.sendTransaction({
      to: account2.address,
      value: parseEther("0.005"),
      data: multiSuffix as Hex,
    });
    const multiReceipt = await publicClient.waitForTransactionReceipt({ hash: multiTxHash });
    assert(multiReceipt.status === "success", "Sent multi-code attributed transaction");

    const multiTx = await publicClient.getTransaction({ hash: multiTxHash });
    const multiDecoded = Attribution.fromData(multiTx.input);
    assert(multiDecoded !== undefined, "Decoded multi-code suffix");
    assertEqual(multiDecoded!.codes.length, 2, "Multi-code suffix has 2 codes");
    assertEqual(multiDecoded!.codes[0], "alice_app", 'First code is "alice_app"');
    assertEqual(multiDecoded!.codes[1], "bob_protocol", 'Second code is "bob_protocol"');

    // ── Summary ──
    console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (e: unknown) {
    console.error("\n✗ Test error:", e instanceof Error ? e.message : e);
    console.log(`\n═══ Results: ${passed} passed, ${failed + 1} failed ═══\n`);
    process.exit(1);
  } finally {
    stopAnvil();
  }
}

main();
