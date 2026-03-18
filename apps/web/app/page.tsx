"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const Home: NextPage = () => {
  return (
    <div className="flex items-center flex-col grow">
      {/* Hero */}
      <div className="w-full relative overflow-hidden">
        <div className="absolute inset-0 hero-glow" />
        <div className="absolute inset-0 grid-bg" />
        <motion.div
          className="relative max-w-4xl mx-auto text-center py-28 px-4"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.p variants={fadeUp} className="text-sm font-mono tracking-widest uppercase text-primary mb-6">
            ERC-8021 Attribution Protocol
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-gradient"
          >
            Track Every
            <br />
            Transaction.
          </motion.h1>
          <motion.p variants={fadeUp} className="text-xl md:text-2xl text-base-content/50 mb-3 font-light">
            Know who built what.
          </motion.p>
          <motion.p variants={fadeUp} className="text-base text-base-content/30 mb-10 max-w-lg mx-auto leading-relaxed">
            Claim a unique builder tag, add one line of config, and every transaction from your dApp is attributed
            on-chain. Forever.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
            <Link
              href="/claim"
              className="btn btn-primary btn-lg glow-primary glow-primary-hover transition-all duration-300"
            >
              Claim Your Tag
            </Link>
            <Link href="/docs" className="btn btn-outline btn-lg border-base-content/20 hover:border-primary/50 transition-all duration-300">
              Read the Docs
            </Link>
            <Link href="/analytics" className="btn btn-ghost btn-lg text-base-content/50 hover:text-base-content transition-all duration-300">
              View Leaderboard
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* How it works */}
      <div className="w-full py-24 px-4">
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-center mb-16 tracking-tight">
            How It Works
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { step: "01", title: "Claim a Tag", desc: "Mint a unique builder tag as an ERC-721 NFT. Your tag identifies your dApp on-chain." },
              { step: "02", title: "Add One Line", desc: "Configure your Wagmi/Viem app with a single dataSuffix option. That's it." },
              { step: "03", title: "Track Everything", desc: "Every transaction is tagged. View volume, fees, and users on the analytics dashboard." },
            ].map((item) => (
              <motion.div key={item.step} variants={fadeUp} className="text-center group">
                <div className="text-5xl font-bold text-primary/20 mb-4 font-mono group-hover:text-primary/40 transition-colors duration-500">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
                <p className="text-base-content/40 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Code example */}
      <motion.div
        className="w-full py-16 px-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={stagger}
      >
        <div className="max-w-2xl mx-auto">
          <motion.p variants={fadeUp} className="text-center text-xl font-semibold mb-2 tracking-tight">
            One line of code.
          </motion.p>
          <motion.p variants={fadeUp} className="text-center text-base-content/30 text-sm mb-8">
            Every transaction tracked.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="glass-card rounded-xl p-6 font-mono text-sm overflow-x-auto"
          >
            <div className="text-base-content/30 mb-1">
              <span className="text-base-content/20 mr-3 select-none">1</span>
              <span className="text-info">import</span>{" "}
              {"{ Attribution }"}{" "}
              <span className="text-info">from</span>{" "}
              <span className="text-success">{'"ox/erc8021"'}</span>;
            </div>
            <div className="text-base-content/20 mb-1">
              <span className="text-base-content/20 mr-3 select-none">2</span>
              <span>{"// In your Wagmi config:"}</span>
            </div>
            <div className="text-primary">
              <span className="text-base-content/20 mr-3 select-none">3</span>
              dataSuffix: Attribution.toDataSuffix({"{ "}codes: [<span className="text-success">{'"yourcode"'}</span>] {" }"})
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Benefits */}
      <div className="w-full py-24 px-4">
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-center mb-16 tracking-tight">
            Why BuilderTag?
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Analytics", desc: "Track transaction count, volume, gas fees, and unique users from your dApp.", icon: "chart" },
              { title: "Ecosystem Visibility", desc: "Appear on the public leaderboard. Show the community what you're building.", icon: "eye" },
              { title: "Zero Overhead", desc: "The suffix adds < $0.001 per transaction. No smart contract changes needed.", icon: "bolt" },
              { title: "Battle-Tested Standard", desc: "Built on ERC-8021, the same standard used by Base. Audited and proven.", icon: "shield" },
            ].map((item) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                className="glass-card rounded-xl p-6 transition-all duration-300 group cursor-default"
              >
                <h3 className="text-base font-semibold mb-2 group-hover:text-primary transition-colors duration-300">
                  {item.title}
                </h3>
                <p className="text-base-content/40 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ERC-8021 Technical Section */}
      <motion.div
        className="w-full py-20 px-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={stagger}
      >
        <div className="max-w-3xl mx-auto">
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-center mb-4 tracking-tight">
            ERC-8021 Suffix Format
          </motion.h2>
          <motion.p variants={fadeUp} className="text-center text-base-content/30 text-sm mb-10">
            Smart contracts ignore trailing calldata. The suffix is invisible to your contract logic.
          </motion.p>
          <motion.div variants={fadeUp} className="glass-card rounded-xl p-6">
            <div className="flex gap-2 justify-center items-center font-mono text-sm flex-wrap">
              <span className="px-3 py-1.5 rounded-lg bg-primary/15 text-primary font-medium">0x00</span>
              <span className="text-base-content/25 text-xs">schema</span>
              <span className="text-base-content/15">|</span>
              <span className="px-3 py-1.5 rounded-lg bg-info/15 text-info font-medium">len</span>
              <span className="text-base-content/25 text-xs">byte</span>
              <span className="text-base-content/15">|</span>
              <span className="px-3 py-1.5 rounded-lg bg-success/15 text-success font-medium">ASCII code bytes</span>
              <span className="text-base-content/15">|</span>
              <span className="px-3 py-1.5 rounded-lg bg-warning/15 text-warning font-medium">0x8021...8021</span>
              <span className="text-base-content/25 text-xs">marker</span>
            </div>
          </motion.div>
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-8 mt-8 text-xs text-base-content/30 font-mono">
            <div className="flex items-center gap-2">
              <span className="text-base-content/50">Mint cost</span> ~$0.03
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base-content/50">Per-tx cost</span> {"<"} $0.001
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base-content/50">Gas overhead</span> ~16 gas/byte
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* FAQ */}
      <div className="w-full py-24 px-4">
        <motion.div
          className="max-w-2xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-center mb-12 tracking-tight">
            FAQ
          </motion.h2>
          <div className="space-y-3">
            {[
              { q: "How much does it cost to mint a tag?", a: "About ~$0.03 at current gas prices (0.1 gwei base fee). The mint transaction uses approximately 150,000 gas." },
              { q: "Which wallets are compatible?", a: "All EOA wallets (MetaMask, Rainbow, Coinbase Wallet, etc.) work natively. Smart wallets support attribution via ERC-5792 DataSuffixCapability." },
              { q: "Can tags be transferred?", a: "Yes. Builder tags are ERC-721 NFTs. You can transfer ownership using any NFT marketplace or directly via the contract." },
              { q: "Does it work on L2s?", a: "The ERC-8021 suffix format works on any EVM chain. This registry is deployed on Ethereum mainnet, but the attribution standard is chain-agnostic. Base already uses it." },
              { q: "Is the contract verified on Etherscan?", a: "Yes, the TagRegistry contract will be verified on Etherscan after mainnet deployment. The contract pattern is already audited by Base." },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} className="collapse collapse-arrow glass-card rounded-xl">
                <input type="radio" name="faq" defaultChecked={i === 0} />
                <div className="collapse-title font-medium text-sm">{item.q}</div>
                <div className="collapse-content text-base-content/40 text-sm">
                  <p>{item.a}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer CTA */}
      <motion.div
        className="w-full py-16 px-4 border-t border-base-content/5"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
      >
        <div className="max-w-2xl mx-auto text-center">
          <motion.p variants={fadeUp} className="text-sm text-base-content/30 mb-6">
            Transaction tracking for all of Ethereum.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-6 text-xs text-base-content/30">
            <a
              href="https://eips.ethereum.org/EIPS/eip-8021"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors duration-300"
            >
              ERC-8021 Spec
            </a>
            <Link href="/docs" className="hover:text-primary transition-colors duration-300">
              Documentation
            </Link>
            <Link href="/analytics" className="hover:text-primary transition-colors duration-300">
              Dune Dashboard
            </Link>
            <Link href="/explore" className="hover:text-primary transition-colors duration-300">
              Registry Explorer
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Home;
