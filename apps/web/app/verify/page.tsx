"use client";

import { useCallback, useState } from "react";
import type { NextPage } from "next";
import { Attribution } from "ox/erc8021";
import { type Hex, isHash } from "viem";
import { usePublicClient } from "wagmi";
import { useScaffoldReadContract, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth/networks";

type VerifyResult = {
  found: boolean;
  codes?: string[];
  txHash: string;
};

const VerifyPage: NextPage = () => {
  const [txHashInput, setTxHashInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient();
  const { targetNetwork } = useTargetNetwork();

  // Look up owner for first found code
  const firstCode = result?.found && result.codes?.[0] ? result.codes[0] : undefined;

  const { data: codeOwner } = useScaffoldReadContract({
    contractName: "TagRegistry",
    functionName: "ownerOfCode",
    args: [firstCode],
    watch: false,
  });

  const { data: codeExistsOnChain } = useScaffoldReadContract({
    contractName: "TagRegistry",
    functionName: "codeExists",
    args: [firstCode],
    watch: false,
  });

  const isValidHash = txHashInput.length > 0 && isHash(txHashInput as Hex);

  const handleVerify = useCallback(async () => {
    if (!publicClient || !isValidHash) return;

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const tx = await publicClient.getTransaction({
        hash: txHashInput as Hex,
      });

      if (!tx.input || tx.input === "0x") {
        setResult({ found: false, txHash: txHashInput });
        setIsLoading(false);
        return;
      }

      const attribution = Attribution.fromData(tx.input);

      if (attribution && attribution.codes.length > 0) {
        setResult({
          found: true,
          codes: [...attribution.codes],
          txHash: txHashInput,
        });
      } else {
        setResult({ found: false, txHash: txHashInput });
      }
    } catch (e: any) {
      if (e?.message?.includes("could not be found") || e?.message?.includes("Transaction not found")) {
        setError("Transaction not found. Check the hash and make sure you're on the correct network.");
      } else if (e?.message?.includes("Invalid")) {
        setError("Invalid transaction hash format.");
      } else {
        setError(e?.shortMessage || e?.message || "Failed to fetch transaction. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, txHashInput, isValidHash]);

  const etherscanLink = result?.txHash ? getBlockExplorerTxLink(targetNetwork.id, result.txHash) : "";

  return (
    <div className="flex items-center flex-col grow pt-10 px-4">
      <div className="max-w-lg w-full">
        <h1 className="text-center text-3xl font-bold mb-2">Verify Transaction</h1>
        <p className="text-center text-base-content/70 mb-8">
          Check if an Ethereum transaction contains an ERC-8021 builder tag suffix.
        </p>

        {/* Tx Hash Input */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-medium">Transaction Hash</span>
          </label>
          <input
            type="text"
            placeholder="0x..."
            className={`input input-bordered w-full font-mono text-sm ${
              txHashInput.length > 0 && !isValidHash ? "input-error" : ""
            }`}
            value={txHashInput}
            onChange={e => {
              setTxHashInput(e.target.value.trim());
              setResult(null);
              setError(null);
            }}
          />
          {txHashInput.length > 0 && !isValidHash && (
            <label className="label">
              <span className="label-text-alt text-error">Enter a valid 66-character transaction hash (0x...)</span>
            </label>
          )}
        </div>

        {/* Verify Button */}
        <div className="mt-4">
          <button
            className="btn btn-primary w-full"
            onClick={handleVerify}
            disabled={!isValidHash || isLoading || !publicClient}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Checking...
              </>
            ) : (
              "Verify"
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 bg-error/10 border border-error/30 rounded-xl">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        {/* Result: Found */}
        {result?.found && result.codes && (
          <div className="mt-6 p-6 bg-success/10 border border-success/30 rounded-xl">
            <h3 className="text-lg font-bold text-success mb-3">Builder Tag Found!</h3>
            <div className="space-y-3 text-sm">
              {result.codes.map((code, i) => (
                <div key={i} className="p-3 bg-base-100 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-base-content/70">Code:</span>
                    <span className="font-mono font-bold text-lg">{code}</span>
                  </div>
                  {i === 0 && codeExistsOnChain && codeOwner && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-base-content/70">Owner:</span>
                      <span className="font-mono text-xs">{codeOwner}</span>
                    </div>
                  )}
                  {i === 0 && codeExistsOnChain === false && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-base-content/70">Registry:</span>
                      <span className="text-warning text-xs">Not registered in this registry</span>
                    </div>
                  )}
                </div>
              ))}
              {etherscanLink && (
                <div className="flex justify-between items-center pt-2">
                  <span className="text-base-content/70">Transaction:</span>
                  <a
                    href={etherscanLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary text-xs"
                  >
                    View on Etherscan
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Result: Not Found */}
        {result && !result.found && (
          <div className="mt-6 p-6 bg-base-200 rounded-xl">
            <h3 className="text-lg font-bold mb-2">No Builder Tag Found</h3>
            <p className="text-base-content/70 text-sm">
              This transaction does not contain an ERC-8021 builder tag suffix.
            </p>
            {etherscanLink && (
              <div className="mt-3">
                <a href={etherscanLink} target="_blank" rel="noopener noreferrer" className="link link-primary text-sm">
                  View on Etherscan
                </a>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="mt-8 text-sm text-base-content/50 space-y-1">
          <p>
            <strong>ERC-8021</strong> appends a builder tag suffix to transaction calldata for tracking.
          </p>
          <p>
            The suffix ends with a repeating <code className="font-mono text-xs">0x8021</code> marker that identifies
            the builder tag.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyPage;
