"use client";

import Link from "next/link";
import type { NextPage } from "next";

const Home: NextPage = () => {
  return (
    <div className="flex items-center flex-col grow">
      {/* Hero */}
      <div className="w-full bg-gradient-to-b from-base-300 to-base-100 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Track Every Transaction.</h1>
          <p className="text-xl md:text-2xl text-base-content/70 mb-2">Know who built what.</p>
          <p className="text-lg text-base-content/50 mb-8 max-w-xl mx-auto">
            Claim a unique builder tag, add one line of config, and every transaction from your dApp is tracked.
            Forever.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/claim" className="btn btn-primary btn-lg">
              Claim Your Tag
            </Link>
            <Link href="/docs" className="btn btn-outline btn-lg">
              Read the Docs
            </Link>
            <Link href="/analytics" className="btn btn-ghost btn-lg">
              View Leaderboard
            </Link>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="w-full py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-4">1</div>
              <h3 className="text-xl font-semibold mb-2">Claim a Tag</h3>
              <p className="text-base-content/60">
                Mint a unique builder tag as an ERC-721 NFT. Your tag identifies your dApp on-chain.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-4">2</div>
              <h3 className="text-xl font-semibold mb-2">Add One Line</h3>
              <p className="text-base-content/60">
                Configure your Wagmi/Viem app with a single{" "}
                <code className="font-mono text-sm bg-base-200 px-1 rounded">dataSuffix</code> option. Done.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-4">3</div>
              <h3 className="text-xl font-semibold mb-2">Track Everything</h3>
              <p className="text-base-content/60">
                Every transaction is tagged. View volume, fees, and users on the analytics dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* One line pitch */}
      <div className="w-full bg-base-200 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-2xl font-semibold mb-4">One line of code. Every transaction tracked.</p>
          <div className="mockup-code text-left max-w-xl mx-auto">
            <pre data-prefix="1">
              <code>{`import { Attribution } from "ox/erc8021";`}</code>
            </pre>
            <pre data-prefix="2">
              <code>{`// In your Wagmi config:`}</code>
            </pre>
            <pre data-prefix="3" className="text-primary">
              <code>{`dataSuffix: Attribution.toDataSuffix({ codes: ["yourcode"] })`}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="w-full py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why BuilderTag?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title text-lg">Analytics</h3>
                <p className="text-base-content/60">
                  Track transaction count, volume, gas fees, and unique users from your dApp.
                </p>
              </div>
            </div>
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title text-lg">Ecosystem Visibility</h3>
                <p className="text-base-content/60">
                  Appear on the public leaderboard. Show the community what you&apos;re building.
                </p>
              </div>
            </div>
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title text-lg">Zero Overhead</h3>
                <p className="text-base-content/60">
                  The suffix adds {"<"} $0.001 per transaction. No smart contract changes needed.
                </p>
              </div>
            </div>
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title text-lg">Battle-Tested Standard</h3>
                <p className="text-base-content/60">
                  Built on ERC-8021, the same standard used by Base. Audited and proven.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ERC-8021 Technical Section */}
      <div className="w-full bg-base-200 py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">ERC-8021 Suffix Format</h2>
          <p className="text-center text-base-content/60 mb-6">
            Smart contracts ignore trailing calldata. The suffix is invisible to your contract logic.
          </p>
          <div className="overflow-x-auto">
            <div className="flex gap-1 justify-center items-center font-mono text-sm flex-wrap">
              <span className="badge badge-primary badge-lg">0x00</span>
              <span className="text-base-content/40">schema</span>
              <span className="mx-1">|</span>
              <span className="badge badge-secondary badge-lg">len</span>
              <span className="text-base-content/40">byte</span>
              <span className="mx-1">|</span>
              <span className="badge badge-accent badge-lg">ASCII code bytes</span>
              <span className="mx-1">|</span>
              <span className="badge badge-warning badge-lg">0x8021...8021</span>
              <span className="text-base-content/40">marker</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-8 text-sm text-base-content/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Mint cost:</span> ~$0.03
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Per-tx cost:</span> {"<"} $0.001
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Gas overhead:</span> ~16 gas/byte
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="w-full py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">FAQ</h2>
          <div className="space-y-2">
            <div className="collapse collapse-arrow bg-base-200">
              <input type="radio" name="faq" defaultChecked />
              <div className="collapse-title font-medium">How much does it cost to mint a tag?</div>
              <div className="collapse-content text-base-content/60">
                <p>
                  About ~$0.03 at current gas prices (0.1 gwei base fee). The mint transaction uses approximately
                  150,000 gas.
                </p>
              </div>
            </div>
            <div className="collapse collapse-arrow bg-base-200">
              <input type="radio" name="faq" />
              <div className="collapse-title font-medium">Which wallets are compatible?</div>
              <div className="collapse-content text-base-content/60">
                <p>
                  All EOA wallets (MetaMask, Rainbow, Coinbase Wallet, etc.) work natively. Smart wallets support
                  attribution via ERC-5792 DataSuffixCapability.
                </p>
              </div>
            </div>
            <div className="collapse collapse-arrow bg-base-200">
              <input type="radio" name="faq" />
              <div className="collapse-title font-medium">Can tags be transferred?</div>
              <div className="collapse-content text-base-content/60">
                <p>
                  Yes. Builder tags are ERC-721 NFTs. You can transfer ownership using any NFT marketplace or directly
                  via the contract.
                </p>
              </div>
            </div>
            <div className="collapse collapse-arrow bg-base-200">
              <input type="radio" name="faq" />
              <div className="collapse-title font-medium">Does it work on L2s?</div>
              <div className="collapse-content text-base-content/60">
                <p>
                  The ERC-8021 suffix format works on any EVM chain. This registry is deployed on Ethereum mainnet, but
                  the attribution standard is chain-agnostic. Base already uses it.
                </p>
              </div>
            </div>
            <div className="collapse collapse-arrow bg-base-200">
              <input type="radio" name="faq" />
              <div className="collapse-title font-medium">Is the contract verified on Etherscan?</div>
              <div className="collapse-content text-base-content/60">
                <p>
                  Yes, the TagRegistry contract will be verified on Etherscan after mainnet deployment. The contract
                  pattern is already audited by Base.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="w-full bg-base-300 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-lg text-base-content/60 mb-6">Transaction tracking for all of Ethereum.</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a
              href="https://eips.ethereum.org/EIPS/eip-8021"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-hover"
            >
              ERC-8021 Spec
            </a>
            <span className="text-base-content/30">|</span>
            <Link href="/docs" className="link link-hover">
              Documentation
            </Link>
            <span className="text-base-content/30">|</span>
            <Link href="/analytics" className="link link-hover">
              Dune Dashboard
            </Link>
            <span className="text-base-content/30">|</span>
            <Link href="/explore" className="link link-hover">
              Registry Explorer
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
