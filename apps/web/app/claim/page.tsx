"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { getParsedError } from "~~/utils/scaffold-eth/getParsedError";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth/networks";

const CODE_REGEX = /^[a-z0-9_]+$/;
const MAX_LENGTH = 32;

type ValidationResult = {
  valid: boolean;
  message: string;
};

function validateCode(code: string): ValidationResult {
  if (code.length === 0) {
    return { valid: false, message: "" };
  }
  if (code.length > MAX_LENGTH) {
    return { valid: false, message: `Code must be ${MAX_LENGTH} characters or less` };
  }
  if (!CODE_REGEX.test(code)) {
    return { valid: false, message: "Only lowercase letters, numbers, and underscores allowed" };
  }
  return { valid: true, message: "" };
}

const ClaimPage: NextPage = () => {
  const [code, setCode] = useState("");
  const [debouncedCode, setDebouncedCode] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [mintedTokenId, setMintedTokenId] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState(false);

  const { address: connectedAddress, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  const validation = useMemo(() => validateCode(code), [code]);

  // Debounce code input for on-chain check
  useEffect(() => {
    if (!validation.valid) {
      setDebouncedCode("");
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedCode(code);
    }, 500);
    return () => clearTimeout(timer);
  }, [code, validation.valid]);

  // On-chain availability check
  const { data: exists, isLoading: isCheckingAvailability } = useScaffoldReadContract({
    contractName: "CodesRegistry",
    functionName: "codeExists",
    args: [debouncedCode || undefined],
    watch: false,
  });

  const isAvailable = debouncedCode.length > 0 && exists === false;
  const isTaken = debouncedCode.length > 0 && exists === true;

  // Mint hook
  const { writeContractAsync, isMining } = useScaffoldWriteContract({
    contractName: "CodesRegistry",
  });

  const handleMint = useCallback(async () => {
    if (!isAvailable || !isConnected) return;

    setMintSuccess(false);
    setTxHash(null);
    setMintedTokenId(null);

    try {
      const hash = await writeContractAsync({
        functionName: "mint",
        args: [code],
      });

      if (hash) {
        setTxHash(hash);
        setMintSuccess(true);
        notification.success("Code minted successfully!");
      }
    } catch (e: any) {
      // Check for user rejection
      if (e?.message?.includes("User rejected") || e?.message?.includes("user rejected")) {
        notification.error("Transaction rejected by user");
        return;
      }
      // Check for code already taken (race condition)
      if (e?.message?.includes("CodeAlreadyExists") || e?.message?.includes("already exists")) {
        notification.error("This code was just claimed by someone else!");
        return;
      }
      const parsedError = getParsedError(e);
      notification.error(parsedError);
    }
  }, [isAvailable, isConnected, code, writeContractAsync]);

  // Read minted token ID after success
  const { data: tokenId } = useScaffoldReadContract({
    contractName: "CodesRegistry",
    functionName: "tokenIdForCode",
    args: [mintSuccess ? code : undefined],
    watch: false,
  });

  useEffect(() => {
    if (tokenId !== undefined && mintSuccess) {
      setMintedTokenId(tokenId.toString());
    }
  }, [tokenId, mintSuccess]);

  const etherscanTxLink = txHash ? getBlockExplorerTxLink(targetNetwork.id, txHash) : "";

  // Reset success state when code changes
  useEffect(() => {
    setMintSuccess(false);
    setTxHash(null);
    setMintedTokenId(null);
  }, [code]);

  return (
    <div className="flex items-center flex-col grow pt-10 px-4">
      <div className="max-w-lg w-full">
        <h1 className="text-center text-3xl font-bold mb-2">Claim a Builder Code</h1>
        <p className="text-center text-base-content/70 mb-8">
          Mint a unique code as an ERC-721 NFT. Your code will be used to attribute transactions to you.
        </p>

        {/* Code Input */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-medium">Builder Code</span>
            <span className="label-text-alt text-base-content/50">
              {code.length}/{MAX_LENGTH}
            </span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. myapp, cool_builder, web3dev"
              className={`input input-bordered w-full pr-10 font-mono ${
                code.length > 0
                  ? !validation.valid
                    ? "input-error"
                    : isTaken
                      ? "input-error"
                      : isAvailable
                        ? "input-success"
                        : ""
                  : ""
              }`}
              value={code}
              onChange={e => setCode(e.target.value.toLowerCase())}
              maxLength={MAX_LENGTH}
              disabled={isMining}
            />
            {/* Status indicator */}
            {code.length > 0 && validation.valid && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isCheckingAvailability || (debouncedCode !== code && validation.valid) ? (
                  <span className="loading loading-spinner loading-sm text-base-content/50"></span>
                ) : isAvailable ? (
                  <span className="text-success text-xl">&#10003;</span>
                ) : isTaken ? (
                  <span className="text-error text-xl">&#10007;</span>
                ) : null}
              </div>
            )}
          </div>

          {/* Validation / availability messages */}
          <label className="label">
            <span
              className={`label-text-alt ${
                !validation.valid && code.length > 0
                  ? "text-error"
                  : isTaken
                    ? "text-error"
                    : isAvailable
                      ? "text-success"
                      : ""
              }`}
            >
              {code.length > 0 && !validation.valid
                ? validation.message
                : isTaken
                  ? "This code is already taken"
                  : isAvailable
                    ? "Available!"
                    : code.length > 0 && validation.valid
                      ? "Checking availability..."
                      : "Lowercase letters, numbers, and underscores only"}
            </span>
          </label>
        </div>

        {/* Mint Button */}
        <div className="mt-4">
          {!isConnected ? (
            <div className="text-center p-4 bg-base-200 rounded-xl">
              <p className="text-base-content/70">Connect your wallet to claim a code</p>
            </div>
          ) : (
            <button
              className={`btn btn-primary w-full ${isMining ? "loading" : ""}`}
              onClick={handleMint}
              disabled={!isAvailable || isMining}
            >
              {isMining ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Minting...
                </>
              ) : (
                "Mint Code"
              )}
            </button>
          )}
        </div>

        {/* Success State */}
        {mintSuccess && txHash && (
          <div className="mt-6 p-6 bg-success/10 border border-success/30 rounded-xl">
            <h3 className="text-lg font-bold text-success mb-3">Code Minted!</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-base-content/70">Code:</span>
                <span className="font-mono font-bold">{code}</span>
              </div>
              {mintedTokenId && (
                <div className="flex justify-between">
                  <span className="text-base-content/70">Token ID:</span>
                  <span className="font-mono">{mintedTokenId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-base-content/70">Owner:</span>
                <span className="font-mono text-xs">{connectedAddress}</span>
              </div>
              {etherscanTxLink && (
                <div className="flex justify-between">
                  <span className="text-base-content/70">Transaction:</span>
                  <a
                    href={etherscanTxLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary text-xs"
                  >
                    View on Etherscan
                  </a>
                </div>
              )}
            </div>
            <div className="mt-4">
              <Link href="/my-codes" className="btn btn-outline btn-sm w-full">
                View My Codes
              </Link>
            </div>
          </div>
        )}

        {/* Info section */}
        <div className="mt-8 text-sm text-base-content/50 space-y-1">
          <p>
            <strong>Rules:</strong> 1-32 characters, lowercase letters (a-z), numbers (0-9), and underscores (_).
          </p>
          <p>
            <strong>Cost:</strong> Only gas fees (~$0.03 at current rates).
          </p>
          <p>
            <strong>Ownership:</strong> Your code is an ERC-721 NFT - transferable and verifiable on-chain.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClaimPage;
