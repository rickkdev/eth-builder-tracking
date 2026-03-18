"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount, usePublicClient, useSignTypedData } from "wagmi";
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

type CodeMetadata = {
  displayName: string;
  website: string;
  logoUrl: string;
  description: string;
};

type CodeCard = {
  tokenId: bigint;
  code: string;
  mintTimestamp: number | null;
  metadata: CodeMetadata | null;
};

const EMPTY_METADATA: CodeMetadata = { displayName: "", website: "", logoUrl: "", description: "" };

const EIP712_DOMAIN = {
  name: "BuilderTag",
  version: "1",
  chainId: 1,
  verifyingContract: ZERO_ADDRESS,
} as const;

const EIP712_TYPES = {
  UpdateMetadata: [
    { name: "code", type: "string" },
    { name: "displayName", type: "string" },
    { name: "website", type: "string" },
    { name: "logoUrl", type: "string" },
    { name: "description", type: "string" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

const MyCodesPage: NextPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  const { data: contractInfo } = useDeployedContractInfo({ contractName: "TagRegistry" });
  const { signTypedDataAsync } = useSignTypedData();

  const [codes, setCodes] = useState<CodeCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CodeMetadata>(EMPTY_METADATA);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchMetadata = useCallback(async (code: string): Promise<CodeMetadata | null> => {
    try {
      const res = await fetch(`/api/metadata/${code}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.displayName || data.website || data.logoUrl || data.description) {
        return data as CodeMetadata;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

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

      // Build code cards with metadata
      const codeStrings = ownedTokenIds.map((tokenId, i) => {
        const result = codeResults[i];
        return result.status === "success" ? (result.result as string) : `Token #${tokenId}`;
      });

      // Fetch metadata for all codes in parallel
      const metadataResults = await Promise.all(codeStrings.map(code => fetchMetadata(code)));

      const cards: CodeCard[] = ownedTokenIds.map((tokenId, i) => {
        const mintBlock = mintBlockNumbers.get(tokenId.toString());
        const timestamp = mintBlock ? (blockTimestamps.get(mintBlock.toString()) ?? null) : null;

        return {
          tokenId,
          code: codeStrings[i],
          mintTimestamp: timestamp,
          metadata: metadataResults[i],
        };
      });

      setCodes(cards);
    } catch (e: unknown) {
      console.error("Failed to fetch codes:", e);
      setError("Failed to load your codes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, contractInfo, connectedAddress, fetchMetadata]);

  useEffect(() => {
    fetchMyCodes();
  }, [fetchMyCodes]);

  const openEditModal = (card: CodeCard) => {
    setEditingCode(card.code);
    setEditForm(card.metadata ?? EMPTY_METADATA);
    setSaveError(null);
    const modal = document.getElementById("metadata-modal") as HTMLDialogElement | null;
    modal?.showModal();
  };

  const handleSaveMetadata = async () => {
    if (!editingCode) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const nonce = BigInt(Date.now());

      const signature = await signTypedDataAsync({
        domain: EIP712_DOMAIN,
        types: EIP712_TYPES,
        primaryType: "UpdateMetadata",
        message: {
          code: editingCode,
          displayName: editForm.displayName,
          website: editForm.website,
          logoUrl: editForm.logoUrl,
          description: editForm.description,
          nonce,
        },
      });

      const res = await fetch(`/api/metadata/${editingCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editForm.displayName,
          website: editForm.website,
          logoUrl: editForm.logoUrl,
          description: editForm.description,
          signature,
          nonce: nonce.toString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save metadata");
      }

      // Update local state
      setCodes(prev => prev.map(c => (c.code === editingCode ? { ...c, metadata: { ...editForm } } : c)));

      const modal = document.getElementById("metadata-modal") as HTMLDialogElement | null;
      modal?.close();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save metadata";
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center flex-col grow pt-10 px-4">
      <div className="max-w-4xl w-full">
        <h1 className="text-center text-3xl font-bold mb-2">My Tags</h1>
        <p className="text-center text-base-content/70 mb-8">All builder tags owned by your connected wallet.</p>

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
                  {card.metadata?.logoUrl && (
                    <figure className="px-4 pt-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.metadata.logoUrl}
                        alt={card.code}
                        className="rounded-lg w-full h-24 object-cover"
                      />
                    </figure>
                  )}
                  <div className="card-body">
                    <h2 className="card-title font-mono text-primary">{card.code}</h2>
                    {card.metadata?.displayName && <p className="text-sm font-medium">{card.metadata.displayName}</p>}
                    {card.metadata?.description && (
                      <p className="text-xs text-base-content/60 line-clamp-2">{card.metadata.description}</p>
                    )}
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
                      {card.metadata?.website && (
                        <div className="flex justify-between">
                          <span>Website:</span>
                          <a
                            href={card.metadata.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate max-w-[150px]"
                          >
                            {card.metadata.website.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="card-actions justify-end mt-2">
                      <button className="btn btn-ghost btn-xs" onClick={() => openEditModal(card)}>
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Edit Metadata Modal */}
      <dialog id="metadata-modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">
            Edit Profile: <span className="font-mono text-primary">{editingCode}</span>
          </h3>

          <div className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Display Name</span>
                <span className="label-text-alt">{editForm.displayName.length}/64</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                maxLength={64}
                value={editForm.displayName}
                onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))}
                placeholder="My dApp"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Website</span>
              </label>
              <input
                type="url"
                className="input input-bordered w-full"
                maxLength={256}
                value={editForm.website}
                onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Logo URL</span>
              </label>
              <input
                type="url"
                className="input input-bordered w-full"
                maxLength={512}
                value={editForm.logoUrl}
                onChange={e => setEditForm(f => ({ ...f, logoUrl: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Description</span>
                <span className="label-text-alt">{editForm.description.length}/500</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full"
                maxLength={500}
                rows={3}
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What does your project do?"
              />
            </div>
          </div>

          {saveError && <p className="text-error text-sm mt-3">{saveError}</p>}

          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-ghost">Cancel</button>
            </form>
            <button className="btn btn-primary" onClick={handleSaveMetadata} disabled={isSaving}>
              {isSaving ? <span className="loading loading-spinner loading-sm"></span> : "Sign & Save"}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
};

export default MyCodesPage;
