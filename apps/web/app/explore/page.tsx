"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { NextPage } from "next";
import { usePublicClient } from "wagmi";
import { useDeployedContractInfo, useTargetNetwork } from "~~/hooks/scaffold-eth";

type CodeEntry = {
  tokenId: bigint;
  code: string;
  owner: `0x${string}`;
  mintBlock: bigint;
  mintTimestamp: number | null;
  ensName: string | null;
  metadata: {
    displayName: string;
    website: string;
    logoUrl: string;
    description: string;
  } | null;
};

type SortOption = "newest" | "oldest";

// CodeMinted event ABI
const CODE_MINTED_EVENT_ABI = {
  type: "event",
  name: "CodeMinted",
  inputs: [
    { name: "tokenId", type: "uint256", indexed: true },
    { name: "code", type: "string", indexed: false },
    { name: "owner", type: "address", indexed: true },
  ],
} as const;

const ExploreContent = () => {
  const searchParams = useSearchParams();
  const highlightCode = searchParams.get("code");
  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  const { data: contractInfo } = useDeployedContractInfo({ contractName: "CodesRegistry" });

  const [codes, setCodes] = useState<CodeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(highlightCode ?? "");
  const [sort, setSort] = useState<SortOption>("newest");

  const fetchAllCodes = useCallback(async () => {
    if (!publicClient || !contractInfo?.address) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all CodeMinted events
      const logs = await publicClient.getLogs({
        address: contractInfo.address,
        event: CODE_MINTED_EVENT_ABI,
        fromBlock: 0n,
        toBlock: "latest",
      });

      if (logs.length === 0) {
        setCodes([]);
        setIsLoading(false);
        return;
      }

      // Get unique block numbers for timestamps
      const blockNumbers = [...new Set(logs.map(log => log.blockNumber))];
      const blockTimestamps: Map<string, number> = new Map();

      const blockPromises = blockNumbers.map(bn =>
        publicClient.getBlock({ blockNumber: bn }).then(block => ({
          blockNumber: bn.toString(),
          timestamp: Number(block.timestamp),
        })),
      );
      const blocks = await Promise.all(blockPromises);
      for (const b of blocks) {
        blockTimestamps.set(b.blockNumber, b.timestamp);
      }

      // Fetch metadata for all codes in parallel
      const metadataPromises = logs.map(async log => {
        const code = log.args.code as string;
        try {
          const res = await fetch(`/api/metadata/${code}`);
          if (!res.ok) return null;
          const data = await res.json();
          if (data.displayName || data.website || data.logoUrl || data.description) return data;
          return null;
        } catch {
          return null;
        }
      });
      const metadataResults = await Promise.all(metadataPromises);

      // Try ENS resolution for unique owners
      const uniqueOwners = [...new Set(logs.map(log => log.args.owner as `0x${string}`))];
      const ensMap: Map<string, string | null> = new Map();
      const ensPromises = uniqueOwners.map(async addr => {
        try {
          const name = await publicClient.getEnsName({ address: addr });
          ensMap.set(addr.toLowerCase(), name);
        } catch {
          ensMap.set(addr.toLowerCase(), null);
        }
      });
      await Promise.all(ensPromises);

      const entries: CodeEntry[] = logs.map((log, i) => {
        const owner = log.args.owner as `0x${string}`;
        return {
          tokenId: log.args.tokenId as bigint,
          code: log.args.code as string,
          owner,
          mintBlock: log.blockNumber,
          mintTimestamp: blockTimestamps.get(log.blockNumber.toString()) ?? null,
          ensName: ensMap.get(owner.toLowerCase()) ?? null,
          metadata: metadataResults[i],
        };
      });

      setCodes(entries);
    } catch (e: unknown) {
      console.error("Failed to fetch codes:", e);
      setError("Failed to load registry. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, contractInfo]);

  useEffect(() => {
    fetchAllCodes();
  }, [fetchAllCodes]);

  // Filter and sort
  const filteredCodes = codes
    .filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        c.code.toLowerCase().includes(q) ||
        c.owner.toLowerCase().includes(q) ||
        (c.ensName && c.ensName.toLowerCase().includes(q)) ||
        (c.metadata?.displayName && c.metadata.displayName.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sort === "newest") return Number(b.mintBlock - a.mintBlock);
      return Number(a.mintBlock - b.mintBlock);
    });

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="flex items-center flex-col grow pt-10 px-4">
      <div className="max-w-5xl w-full">
        <h1 className="text-center text-3xl font-bold mb-2">Registry Explorer</h1>
        <p className="text-center text-base-content/70 mb-8">Browse all minted builder codes on Ethereum.</p>

        {/* Search and Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            className="input input-bordered flex-1"
            placeholder="Search by code, address, or ENS name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="select select-bordered w-full sm:w-40"
            value={sort}
            onChange={e => setSort(e.target.value as SortOption)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
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

        {/* Error */}
        {error && (
          <div className="text-center p-8">
            <p className="text-error mb-4">{error}</p>
            <button className="btn btn-primary btn-sm" onClick={fetchAllCodes}>
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && codes.length === 0 && (
          <div className="text-center p-8 bg-base-200 rounded-xl">
            <p className="text-base-content/70 text-lg mb-4">No codes registered yet.</p>
            <Link href="/claim" className="btn btn-primary">
              Be the first to claim
            </Link>
          </div>
        )}

        {/* No search results */}
        {!isLoading && !error && codes.length > 0 && filteredCodes.length === 0 && (
          <div className="text-center p-8 bg-base-200 rounded-xl">
            <p className="text-base-content/70 text-lg">No codes matching &quot;{search}&quot;</p>
          </div>
        )}

        {/* Results count */}
        {!isLoading && !error && filteredCodes.length > 0 && (
          <p className="text-sm text-base-content/50 mb-4">
            {filteredCodes.length} code{filteredCodes.length !== 1 ? "s" : ""}
            {search ? ` matching "${search}"` : " registered"}
          </p>
        )}

        {/* Codes grid */}
        {!isLoading && !error && filteredCodes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCodes.map(entry => (
              <div
                key={entry.tokenId.toString()}
                className={`card bg-base-200 shadow-sm hover:shadow-md transition-shadow ${
                  highlightCode === entry.code ? "ring-2 ring-primary" : ""
                }`}
              >
                {entry.metadata?.logoUrl && (
                  <figure className="px-4 pt-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.metadata.logoUrl}
                      alt={entry.code}
                      className="rounded-lg w-full h-20 object-cover"
                    />
                  </figure>
                )}
                <div className="card-body p-5">
                  <h2 className="card-title font-mono text-primary text-lg">{entry.code}</h2>
                  {entry.metadata?.displayName && (
                    <p className="text-sm font-medium -mt-1">{entry.metadata.displayName}</p>
                  )}
                  {entry.metadata?.description && (
                    <p className="text-xs text-base-content/60 line-clamp-2">{entry.metadata.description}</p>
                  )}
                  <div className="text-sm text-base-content/60 space-y-1 mt-1">
                    <div className="flex justify-between">
                      <span>Owner:</span>
                      <span className="font-mono text-xs">{entry.ensName ?? truncateAddress(entry.owner)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Token ID:</span>
                      <span className="font-mono">{entry.tokenId.toString()}</span>
                    </div>
                    {entry.mintTimestamp && (
                      <div className="flex justify-between">
                        <span>Minted:</span>
                        <span>{new Date(entry.mintTimestamp * 1000).toLocaleDateString()}</span>
                      </div>
                    )}
                    {entry.metadata?.website && (
                      <div className="flex justify-between">
                        <span>Website:</span>
                        <a
                          href={entry.metadata.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate max-w-[140px]"
                        >
                          {entry.metadata.website.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ExplorePage: NextPage = () => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center grow pt-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
};

export default ExplorePage;
