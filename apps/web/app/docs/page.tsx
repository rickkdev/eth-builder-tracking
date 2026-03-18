"use client";

import { useCallback, useMemo, useState } from "react";
import type { NextPage } from "next";
import { Attribution } from "ox/erc8021";

const SECTIONS = [
  { id: "what", label: "What are Builder Codes" },
  { id: "how", label: "How It Works" },
  { id: "erc8021", label: "ERC-8021 Standard" },
  { id: "registry", label: "Registry Contract" },
  { id: "integration", label: "Developer Integration" },
  { id: "wallets", label: "Wallet Compatibility" },
  { id: "analytics", label: "Analytics & Tracking" },
  { id: "faq", label: "FAQ" },
] as const;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button onClick={handleCopy} className="btn btn-xs btn-ghost absolute top-2 right-2 opacity-70 hover:opacity-100">
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <CopyButton text={code} />
      <pre className="bg-base-300 rounded-xl p-4 overflow-x-auto text-sm font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SuffixGenerator() {
  const [code, setCode] = useState("");

  const suffix = useMemo(() => {
    if (!code || !/^[a-z0-9_]+$/.test(code) || code.length > 32) return "";
    try {
      return Attribution.toDataSuffix({ codes: [code] });
    } catch {
      return "";
    }
  }, [code]);

  return (
    <div className="bg-base-200 rounded-xl p-6 mt-4">
      <h4 className="font-bold mb-3">Interactive Suffix Generator</h4>
      <div className="form-control w-full max-w-md">
        <input
          type="text"
          placeholder="Enter your builder code..."
          className="input input-bordered w-full font-mono"
          value={code}
          onChange={e => setCode(e.target.value.toLowerCase())}
          maxLength={32}
        />
      </div>
      {suffix && (
        <div className="mt-3">
          <p className="text-sm text-base-content/70 mb-1">Generated ERC-8021 suffix:</p>
          <div className="relative">
            <CopyButton text={suffix} />
            <div className="bg-base-300 rounded-lg p-3 pr-16 font-mono text-sm break-all">{suffix}</div>
          </div>
        </div>
      )}
      {code && !suffix && (
        <p className="text-sm text-error mt-2">
          Invalid code. Use lowercase letters, numbers, and underscores only (1-32 chars).
        </p>
      )}
    </div>
  );
}

const DocsPage: NextPage = () => {
  const [activeSection, setActiveSection] = useState("what");

  const scrollToSection = useCallback((id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="flex grow">
      {/* Sidebar - hidden on mobile, shown on lg+ */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-base-300 p-4 sticky top-[76px] h-[calc(100vh-76px)] overflow-y-auto">
        <h3 className="font-bold text-sm uppercase tracking-wider text-base-content/50 mb-4">Documentation</h3>
        <ul className="space-y-1">
          {SECTIONS.map(s => (
            <li key={s.id}>
              <button
                onClick={() => scrollToSection(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === s.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-base-200 text-base-content/70"
                }`}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Mobile section nav */}
      <div className="lg:hidden sticky top-[76px] z-10 bg-base-100 border-b border-base-300 w-full">
        <div className="overflow-x-auto">
          <div className="flex px-4 py-2 gap-2 min-w-max">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                  activeSection === s.id ? "bg-primary text-primary-content" : "bg-base-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 space-y-16">
        {/* Section 1: What are Builder Codes */}
        <section id="what">
          <h2 className="text-3xl font-bold mb-4">What are Builder Codes?</h2>
          <p className="mb-4">
            Builder Codes are unique identifiers that attribute on-chain transactions to the applications and developers
            that originated them. Think of them as referral codes for Ethereum &mdash; but fully on-chain,
            permissionless, and standardized.
          </p>
          <p className="mb-4">
            <strong>Base pioneered this concept</strong> with their Builder Codes system, using the ERC-8021 standard to
            track which apps drive transaction volume on their L2. Ethereum Builder Codes bring the same powerful
            attribution system to Ethereum mainnet.
          </p>
          <h3 className="text-xl font-semibold mt-8 mb-3">Why Attribution Matters</h3>
          <ul className="list-disc list-inside space-y-2 text-base-content/80">
            <li>
              <strong>Ecosystem visibility</strong> &mdash; Know which apps and builders are driving real on-chain
              activity
            </li>
            <li>
              <strong>Analytics</strong> &mdash; Track transaction volume, gas fees, and unique users per builder
            </li>
            <li>
              <strong>Identity</strong> &mdash; Builders get a verifiable on-chain identity tied to their work
            </li>
            <li>
              <strong>Composability</strong> &mdash; Any protocol can read attribution data and build on top of it
            </li>
          </ul>
        </section>

        {/* Section 2: How It Works */}
        <section id="how">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="mb-6">The entire system works in four simple steps:</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-base-200 rounded-xl p-5">
              <div className="text-2xl font-bold text-primary mb-2">1</div>
              <h4 className="font-bold mb-1">Claim a Code</h4>
              <p className="text-sm text-base-content/70">
                Mint a unique builder code as an ERC-721 NFT. You own it, you can transfer it, and it&apos;s verifiable
                on-chain.
              </p>
            </div>
            <div className="bg-base-200 rounded-xl p-5">
              <div className="text-2xl font-bold text-primary mb-2">2</div>
              <h4 className="font-bold mb-1">Add One Line of Config</h4>
              <p className="text-sm text-base-content/70">
                Configure your Wagmi/Viem app with a{" "}
                <code className="font-mono bg-base-300 px-1 rounded">dataSuffix</code>. Every transaction your app sends
                will be automatically tagged.
              </p>
            </div>
            <div className="bg-base-200 rounded-xl p-5">
              <div className="text-2xl font-bold text-primary mb-2">3</div>
              <h4 className="font-bold mb-1">Transactions Are Tagged</h4>
              <p className="text-sm text-base-content/70">
                The ERC-8021 suffix is appended to the end of transaction calldata. Smart contracts ignore trailing
                data, so it&apos;s completely transparent to the contract being called.
              </p>
            </div>
            <div className="bg-base-200 rounded-xl p-5">
              <div className="text-2xl font-bold text-primary mb-2">4</div>
              <h4 className="font-bold mb-1">Track Everything</h4>
              <p className="text-sm text-base-content/70">
                Dune Analytics parses suffixes from all Ethereum transactions. View leaderboards, volume metrics, and
                per-builder analytics.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: ERC-8021 Standard */}
        <section id="erc8021">
          <h2 className="text-3xl font-bold mb-4">ERC-8021 Standard</h2>
          <p className="mb-4">
            ERC-8021 defines a standard format for appending attribution data to the end of transaction calldata. The
            format is designed to be:
          </p>
          <ul className="list-disc list-inside space-y-1 text-base-content/80 mb-6">
            <li>Unambiguous &mdash; the trailing marker makes it easy to detect</li>
            <li>Non-interfering &mdash; smart contracts ignore trailing calldata</li>
            <li>Cheap &mdash; costs &lt; $0.001 in extra gas per transaction</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Byte Format</h3>
          <div className="bg-base-200 rounded-xl p-4 font-mono text-sm overflow-x-auto mb-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="bg-primary/20 text-primary px-2 py-1 rounded">0x00</span>
              <span className="text-base-content/50">&rarr;</span>
              <span className="bg-secondary/30 px-2 py-1 rounded">length</span>
              <span className="text-base-content/50">&rarr;</span>
              <span className="bg-accent/20 px-2 py-1 rounded">ASCII code bytes</span>
              <span className="text-base-content/50">&rarr;</span>
              <span className="bg-warning/20 px-2 py-1 rounded">0x8021 0x8021...</span>
            </div>
            <div className="mt-3 text-xs text-base-content/60 space-y-1">
              <p>
                <strong>Schema byte (0x00):</strong> Identifies this as an ERC-8021 attribution suffix
              </p>
              <p>
                <strong>Length byte:</strong> Number of bytes in the code (1-32)
              </p>
              <p>
                <strong>ASCII code bytes:</strong> Your builder code encoded as ASCII
              </p>
              <p>
                <strong>0x8021 marker:</strong> Repeating end marker for suffix detection
              </p>
            </div>
          </div>

          <p className="text-sm text-base-content/70 mb-4">
            Smart contracts process calldata using <code className="font-mono bg-base-300 px-1 rounded">msg.data</code>{" "}
            up to the expected length. Any extra bytes at the end are simply ignored by the EVM, making this completely
            safe for any contract interaction.
          </p>

          <h3 className="text-xl font-semibold mb-3">Gas Cost</h3>
          <p className="text-base-content/80">
            Each non-zero byte of calldata costs 16 gas, and each zero byte costs 4 gas. A typical builder code suffix
            adds 10-40 bytes, costing <strong>less than $0.001</strong> in extra gas per transaction at current mainnet
            rates.
          </p>
        </section>

        {/* Section 4: Registry Contract */}
        <section id="registry">
          <h2 className="text-3xl font-bold mb-4">Registry Contract</h2>
          <p className="mb-4">
            The CodesRegistry is an ERC-721 contract where each token represents a unique builder code. The NFT owner is
            the code owner &mdash; transfer the NFT to transfer code ownership.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">Key Functions</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Function</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code className="font-mono text-sm">mint(string code)</code>
                  </td>
                  <td>Claim a new code. Reverts if taken, invalid, or empty. Mints NFT to caller.</td>
                </tr>
                <tr>
                  <td>
                    <code className="font-mono text-sm">ownerOfCode(string code)</code>
                  </td>
                  <td>Get the current owner address for a code.</td>
                </tr>
                <tr>
                  <td>
                    <code className="font-mono text-sm">codeExists(string code)</code>
                  </td>
                  <td>Check if a code has been claimed (returns bool).</td>
                </tr>
                <tr>
                  <td>
                    <code className="font-mono text-sm">tokenIdForCode(string code)</code>
                  </td>
                  <td>Get the NFT token ID for a code.</td>
                </tr>
                <tr>
                  <td>
                    <code className="font-mono text-sm">getCode(uint256 tokenId)</code>
                  </td>
                  <td>Get the code string for a token ID.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-semibold mt-6 mb-3">Code Rules</h3>
          <ul className="list-disc list-inside space-y-1 text-base-content/80">
            <li>1-32 characters long</li>
            <li>Lowercase letters (a-z), numbers (0-9), and underscores (_) only</li>
            <li>Must be unique &mdash; first come, first served</li>
            <li>Transferable via standard ERC-721 transfers</li>
          </ul>

          <div className="bg-base-200 rounded-xl p-4 mt-4">
            <p className="text-sm text-base-content/70">
              <strong>Contract address:</strong>{" "}
              <span className="font-mono">
                Deployed on Ethereum mainnet. Check the contract page on Etherscan for the verified source code.
              </span>
            </p>
          </div>
        </section>

        {/* Section 5: Developer Integration */}
        <section id="integration">
          <h2 className="text-3xl font-bold mb-4">Developer Integration Guide</h2>
          <p className="mb-6">
            Adding builder code attribution to your dApp takes less than 5 minutes. Here&apos;s how:
          </p>

          <h3 className="text-xl font-semibold mb-3">Quick Start</h3>
          <p className="mb-2 text-base-content/80">Install the required packages:</p>
          <CodeBlock code={`npm install ox wagmi viem`} />

          <h3 className="text-xl font-semibold mt-8 mb-3">Wagmi Config (Recommended)</h3>
          <p className="mb-2 text-base-content/80">
            Set <code className="font-mono bg-base-300 px-1 rounded">dataSuffix</code> once in your Wagmi config. Every
            transaction your app sends will automatically include the attribution suffix:
          </p>
          <CodeBlock
            code={`import { createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { Attribution } from "ox/erc8021";

const dataSuffix = Attribution.toDataSuffix({
  codes: ["your_code_here"],
});

export const config = createConfig({
  chains: [mainnet],
  transports: { [mainnet.id]: http() },
  // One line — all transactions attributed
  dataSuffix,
});`}
          />

          <h3 className="text-xl font-semibold mt-8 mb-3">Viem Wallet Client</h3>
          <p className="mb-2 text-base-content/80">If you&apos;re using Viem directly:</p>
          <CodeBlock
            code={`import { createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";
import { Attribution } from "ox/erc8021";

const client = createWalletClient({
  chain: mainnet,
  transport: http(),
  dataSuffix: Attribution.toDataSuffix({
    codes: ["your_code_here"],
  }),
});

// All transactions sent via this client
// will include the builder code suffix`}
          />

          <h3 className="text-xl font-semibold mt-8 mb-3">Per-Transaction (Legacy)</h3>
          <p className="mb-2 text-base-content/80">For apps that need per-transaction control:</p>
          <CodeBlock
            code={`import { Attribution } from "ox/erc8021";

const suffix = Attribution.toDataSuffix({
  codes: ["your_code_here"],
});

// Append suffix to your transaction data
const txData = originalCalldata + suffix.slice(2);

await walletClient.sendTransaction({
  to: contractAddress,
  data: txData,
});`}
          />

          <SuffixGenerator />
        </section>

        {/* Section 6: Wallet Compatibility */}
        <section id="wallets">
          <h2 className="text-3xl font-bold mb-4">Wallet Compatibility</h2>

          <div className="space-y-4">
            <div className="bg-base-200 rounded-xl p-5">
              <h4 className="font-bold mb-2">EOA Wallets (MetaMask, Rainbow, etc.)</h4>
              <p className="text-sm text-base-content/80">
                Works natively. The <code className="font-mono bg-base-300 px-1 rounded">dataSuffix</code> is appended
                to calldata before the transaction is sent to the wallet for signing. No wallet changes needed.
              </p>
            </div>

            <div className="bg-base-200 rounded-xl p-5">
              <h4 className="font-bold mb-2">Smart Wallets (ERC-4337)</h4>
              <p className="text-sm text-base-content/80">
                Smart wallets that support <strong>ERC-5792</strong> can use the{" "}
                <code className="font-mono bg-base-300 px-1 rounded">DataSuffixCapability</code> to append attribution
                data. This is supported by wallets like Coinbase Smart Wallet.
              </p>
            </div>

            <div className="bg-base-200 rounded-xl p-5">
              <h4 className="font-bold mb-2">Embedded Wallets (Privy, Turnkey, Dynamic)</h4>
              <p className="text-sm text-base-content/80">
                Embedded wallet providers that use Viem under the hood support{" "}
                <code className="font-mono bg-base-300 px-1 rounded">dataSuffix</code> natively. Configure it at the
                Viem client level, and all transactions from embedded wallets will be attributed.
              </p>
            </div>
          </div>
        </section>

        {/* Section 7: Analytics & Tracking */}
        <section id="analytics">
          <h2 className="text-3xl font-bold mb-4">Analytics & Tracking</h2>
          <p className="mb-4">
            All attribution data is on-chain and publicly queryable. Dune Analytics provides the primary analytics layer
            for builder code tracking.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">How Dune Parses Suffixes</h3>
          <p className="mb-4 text-base-content/80">
            Dune queries scan the <code className="font-mono bg-base-300 px-1 rounded">data</code> column of{" "}
            <code className="font-mono bg-base-300 px-1 rounded">ethereum.transactions</code> for the repeating{" "}
            <code className="font-mono bg-base-300 px-1 rounded">0x8021</code> marker at the end of calldata. When
            found, the query extracts the builder code bytes and decodes them as ASCII.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">Available Metrics</h3>
          <ul className="list-disc list-inside space-y-1 text-base-content/80">
            <li>Transaction count per builder code</li>
            <li>ETH volume attributed per code</li>
            <li>Gas fees generated per code</li>
            <li>Unique users per code</li>
            <li>Daily/weekly/monthly trends</li>
            <li>Leaderboard rankings</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">Build Your Own Queries</h3>
          <p className="mb-2 text-base-content/80">
            The <code className="font-mono bg-base-300 px-1 rounded">analytics/dune/</code> directory in this repository
            contains ready-to-use DuneSQL queries for all attribution metrics. Fork them on Dune to create your own
            custom dashboards.
          </p>
          <p className="text-base-content/80">
            Use the <strong>Dune API</strong> (<code className="font-mono bg-base-300 px-1 rounded">api.dune.com</code>)
            to programmatically fetch query results and integrate analytics into your own applications.
          </p>
        </section>

        {/* Section 8: FAQ */}
        <section id="faq">
          <h2 className="text-3xl font-bold mb-4">FAQ</h2>

          <div className="space-y-4">
            <div className="collapse collapse-arrow bg-base-200">
              <input type="radio" name="faq" defaultChecked />
              <div className="collapse-title font-semibold">How much does it cost to mint a code?</div>
              <div className="collapse-content text-base-content/80">
                <p>
                  Minting costs approximately 150K gas, which is about <strong>$0.03</strong> at current mainnet rates
                  (0.1 gwei base fee). This is a one-time cost.
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-200">
              <input type="radio" name="faq" />
              <div className="collapse-title font-semibold">How much does each tagged transaction cost?</div>
              <div className="collapse-content text-base-content/80">
                <p>
                  The ERC-8021 suffix adds 10-40 bytes of calldata, costing <strong>less than $0.001</strong> in extra
                  gas per transaction. It&apos;s practically free.
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-200">
              <input type="radio" name="faq" />
              <div className="collapse-title font-semibold">Can codes be transferred?</div>
              <div className="collapse-content text-base-content/80">
                <p>
                  Yes! Builder codes are ERC-721 NFTs. You can transfer them using any NFT marketplace or wallet that
                  supports ERC-721 transfers. The new owner becomes the code owner.
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-200">
              <input type="radio" name="faq" />
              <div className="collapse-title font-semibold">
                What happens if the suffix is on an unsupported contract?
              </div>
              <div className="collapse-content text-base-content/80">
                <p>
                  Nothing bad. Smart contracts ignore trailing calldata that they don&apos;t expect. The suffix is
                  completely transparent to the contract being called. The attribution data is still recorded in the
                  transaction and can be parsed by analytics tools.
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-200">
              <input type="radio" name="faq" />
              <div className="collapse-title font-semibold">Does this work on L2s?</div>
              <div className="collapse-content text-base-content/80">
                <p>
                  The ERC-8021 standard works on any EVM chain. Base already uses it on their L2. You can deploy the
                  CodesRegistry contract on any EVM-compatible chain and use the same suffix format. The{" "}
                  <code className="font-mono bg-base-300 px-1 rounded">ox/erc8021</code> library generates identical
                  suffixes regardless of chain.
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-200">
              <input type="radio" name="faq" />
              <div className="collapse-title font-semibold">Is the contract verified on Etherscan?</div>
              <div className="collapse-content text-base-content/80">
                <p>
                  Yes. After mainnet deployment, the contract source code is verified on Etherscan using{" "}
                  <code className="font-mono bg-base-300 px-1 rounded">forge verify-contract</code>. You can read the
                  full source code and interact with it directly on Etherscan.
                </p>
              </div>
            </div>

            <div className="collapse collapse-arrow bg-base-200">
              <input type="radio" name="faq" />
              <div className="collapse-title font-semibold">Do I need to register a code to tag transactions?</div>
              <div className="collapse-content text-base-content/80">
                <p>
                  Technically, the ERC-8021 suffix works with any string. However, registering your code on the
                  CodesRegistry gives you verifiable ownership, prevents others from claiming your code, and enables
                  analytics dashboards to link transactions to your identity.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DocsPage;
