"use client";

import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-4xl font-bold">Ethereum Builder Codes</span>
          </h1>
          <p className="text-center text-lg mt-4 max-w-xl mx-auto">
            Attribution for Ethereum. Claim a unique builder code, integrate it into your dApp with one line of config,
            and track every transaction.
          </p>
          {connectedAddress && (
            <div className="flex justify-center items-center space-x-2 flex-col mt-4">
              <p className="my-2 font-medium">Connected Address:</p>
              <Address address={connectedAddress} chain={targetNetwork} />
            </div>
          )}
        </div>

        <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col md:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <h3 className="text-xl font-bold mb-2">Claim a Code</h3>
              <p>
                Mint a unique builder code as an ERC-721 NFT.{" "}
                <Link href="/claim" passHref className="link">
                  Get started
                </Link>
              </p>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <h3 className="text-xl font-bold mb-2">View Analytics</h3>
              <p>
                See top builder codes and attribution metrics.{" "}
                <Link href="/analytics" passHref className="link">
                  Leaderboard
                </Link>
              </p>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <h3 className="text-xl font-bold mb-2">Read the Docs</h3>
              <p>
                Learn how ERC-8021 attribution works.{" "}
                <Link href="/docs" passHref className="link">
                  Documentation
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
