"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount, usePublicClient } from "wagmi";
import { useDeployedContractInfo, useTargetNetwork } from "~~/hooks/scaffold-eth";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// Standard ERC-721 Transfer event signature
const TRANSFER_EVENT_ABI = {
  type: "event",
  name: "Transfer",
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "tokenId", type: "uint256", indexed: true },
  ],
} as const;

type CodeCard = {
  tokenId: bigint;
  code: string;
  mintTimestamp: number | null;
};

const MyCodesPage: NextPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  const { data: contractInfo } = useDeployedContractInfo({ contractName: "CodesRegistry" });

  const [codes, setCodes] = useState<CodeCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyCodes = useCallback(async () => {
    if (!publicClient || !contractInfo?.address || !connectedAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const contractAddress = contractInfo.address;

      // Fetch Transfer events TO the user (mints + incoming transfers)
      const incomingLogs = await publicClient.getLogs({
        address: contractAddress,
        event: TRANSFER_EVENT_ABI,
        args: { to: connectedAddress },
        fromBlock: 0n,
        toBlock: "latest",
      });

      // Fetch Transfer events FROM the user (outgoing transfers)
      const outgoingLogs = await publicClient.getLogs({
        address: contractAddress,
        event: TRANSFER_EVENT_ABI,
        args: { from: connectedAddress },
        fromBlock: 0n,
        toBlock: "latest",
      });

      // Compute currently owned token IDs
      const outgoingSet = new Set(outgoingLogs.map(log => (log.args.tokenId as bigint).toString()));
      const ownedTokenIds: bigint[] = [];
      const mintBlockNumbers: Map<string, bigint> = new Map();

      for (const log of incomingLogs) {
        const tokenId = log.args.tokenId as bigint;
        const tokenIdStr = tokenId.toString();
        if (!outgoingSet.has(tokenIdStr)) {
          ownedTokenIds.push(tokenId);
        }
        // Track the earliest block (mint) for each token
        if (!mintBlockNumbers.has(tokenIdStr) && log.args.from === ZERO_ADDRESS) {
          mintBlockNumbers.set(tokenIdStr, log.blockNumber);
        }
      }

      if (ownedTokenIds.length === 0) {
        setCodes([]);
        setIsLoading(false);
        return;
      }

      // Batch read code strings via Multicall3
      const getCodeCalls = ownedTokenIds.map(tokenId => ({
        address: contractAddress,
        abi: contractInfo.abi,
        functionName: "getCode" as const,
        args: [tokenId] as const,
      }));

      const codeResults = await publicClient.multicall({
        contracts: getCodeCalls,
      });

      // Fetch block timestamps for mint blocks
      const uniqueBlocks = [
        ...new Set(ownedTokenIds.map(id => mintBlockNumbers.get(id.toString())).filter(Boolean)),
      ] as bigint[];
      const blockTimestamps: Map<string, number> = new Map();

      if (uniqueBlocks.length > 0) {
        const blockPromises = uniqueBlocks.map(blockNumber =>
          publicClient.getBlock({ blockNumber }).then(block => ({
            blockNumber: blockNumber.toString(),
            timestamp: Number(block.timestamp),
          })),
        );
        const blocks = await Promise.all(blockPromises);
        for (const b of blocks) {
          blockTimestamps.set(b.blockNumber, b.timestamp);
        }
      }

      // Build code cards
      const cards: CodeCard[] = ownedTokenIds.map((tokenId, i) => {
        const result = codeResults[i];
        const mintBlock = mintBlockNumbers.get(tokenId.toString());
        const timestamp = mintBlock ? (blockTimestamps.get(mintBlock.toString()) ?? null) : null;

        return {
          tokenId,
          code: result.status === "success" ? (result.result as string) : `Token #${tokenId}`,
          mintTimestamp: timestamp,
        };
      });

      setCodes(cards);
    } catch (e: any) {
      console.error("Failed to fetch codes:", e);
      setError("Failed to load your codes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, contractInfo, connectedAddress]);

  useEffect(() => {
    fetchMyCodes();
  }, [fetchMyCodes]);

  return (
    <div className="flex items-center flex-col grow pt-10 px-4">
      <div className="max-w-4xl w-full">
        <h1 className="text-center text-3xl font-bold mb-2">My Builder Codes</h1>
        <p className="text-center text-base-content/70 mb-8">All builder codes owned by your connected wallet.</p>

        {/* Not connected */}
        {!isConnected && (
          <div className="text-center p-8 bg-base-200 rounded-xl">
            <p className="text-base-content/70 text-lg">Connect your wallet to view your codes</p>
          </div>
        )}

        {/* Loading state */}
        {isConnected && isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card bg-base-200 animate-pulse">
                <div className="card-body">
                  <div className="h-6 bg-base-300 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-base-300 rounded w-1/2 mb-1"></div>
                  <div className="h-4 bg-base-300 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {isConnected && error && (
          <div className="text-center p-8">
            <p className="text-error mb-4">{error}</p>
            <button className="btn btn-primary btn-sm" onClick={fetchMyCodes}>
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {isConnected && !isLoading && !error && codes.length === 0 && (
          <div className="text-center p-8 bg-base-200 rounded-xl">
            <p className="text-base-content/70 text-lg mb-4">No codes yet — claim your first!</p>
            <Link href="/claim" className="btn btn-primary">
              Claim a Code
            </Link>
          </div>
        )}

        {/* Codes grid */}
        {isConnected && !isLoading && !error && codes.length > 0 && (
          <>
            <p className="text-sm text-base-content/50 mb-4">
              {codes.length} code{codes.length !== 1 ? "s" : ""} owned
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {codes.map(card => (
                <div
                  key={card.tokenId.toString()}
                  className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="card-body">
                    <h2 className="card-title font-mono text-primary">{card.code}</h2>
                    <div className="text-sm text-base-content/60 space-y-1">
                      <div className="flex justify-between">
                        <span>Token ID:</span>
                        <span className="font-mono">{card.tokenId.toString()}</span>
                      </div>
                      {card.mintTimestamp && (
                        <div className="flex justify-between">
                          <span>Minted:</span>
                          <span>{new Date(card.mintTimestamp * 1000).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyCodesPage;
