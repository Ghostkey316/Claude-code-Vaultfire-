# Claude Code — Vaultfire Edition

Claude Code with Vaultfire's full trust layer baked in. The KYA (Know Your Agent) standard means you don't have to choose between capability and trust.

This repository contains the complete open-source Claude Code distribution, enhanced with the Vaultfire Protocol's on-chain trust verification engine. Every time the agent starts, its identity, accountability bonds, payment capabilities, and protocol-level privacy commitments are verified cryptographically.

> **⚠️ Alpha Software** — Vaultfire Protocol is live on Base and Avalanche mainnet, but is currently in alpha. The smart contracts are deployed and functional, and the trust checks run against real on-chain data. However, the protocol is under active development: APIs may change, features are being added, and edge cases are still being addressed. This integration should not be used in production systems without a clear understanding of those risks. Use demo mode (`node --input-type=module -e "import('./dist/vaultfire/vaultfire-plugin.js').then(m => m.initVaultfirePlugin())" -- --vaultfire-demo`) to explore safely without requiring a configured agent address.

## Quick Start

**Prerequisites:** Node.js 18+, npm

**1. Clone, install, and build**

```bash
git clone https://github.com/Ghostkey316/Claude-code-Vaultfire-.git
cd Claude-code-Vaultfire-
npm install
npm run build
```

The build compiles the TypeScript Vaultfire plugin to `dist/vaultfire/`.

**2. Run demo mode** — see the trust panel instantly, no wallet or config needed:

```bash
node --input-type=module -e \
  "import('./dist/vaultfire/vaultfire-plugin.js').then(m => m.initVaultfirePlugin())" \
  -- --vaultfire-demo
```

You’ll see a trust panel with demo data. No on-chain calls are made in demo mode.

**3. Verify a real agent address on-chain**

Create `vaultfire.config.json` in the project root:

```json
{
  "agentAddress": "0xYourAgentAddress",
  "chain": "base"
}
```

Run the plugin:

```bash
node --input-type=module -e \
  "import('./dist/vaultfire/vaultfire-plugin.js').then(m => m.initVaultfirePlugin())"
```

The trust panel will show live on-chain data from Base mainnet.

**4. Enable x402 payment signing and XMTP messaging (optional)**

```bash
export VAULTFIRE_AGENT_KEY=0xYourAgentPrivateKey
node --input-type=module -e \
  "import('./dist/vaultfire/vaultfire-plugin.js').then(m => m.initVaultfirePlugin())"
```

> ⚠️ **Security:** Never commit your private key. Always use environment variables or a secrets manager.

**5. What you’ll see**

```
⚡ VAULTFIRE TRUST VERIFICATION ⚡
────────────────────────────────────────
  Trust Grade:         A
  Street Cred:         55 / 95  (silver)
  Partnership Bond:    ✔ Active  ← LIVE on Base
  ERC-8004 Identity:   ✔ Registered  ← LIVE on Base
  Accountability Bond: ✘ Not bonded  ← requires yield pool funding (v1.0)
  Chain:               Base
  Agent:               0xYourAgentAddress
────────────────────────────────────────
```

**6. Use with Claude Code**

To run the full Claude Code agent with Vaultfire trust verification active:

```bash
# Start Claude Code normally
claude

# The Vaultfire plugin hooks into the startup sequence automatically
# Trust verification runs before the first prompt is processed
```

See [CLAUDE.md](./CLAUDE.md) for the full Claude Code configuration and available commands.

## The Trust Panel

When you run the Vaultfire plugin, the trust panel provides an immediate, verifiable readout of the agent's on-chain state:

```
⚡ VAULTFIRE TRUST VERIFICATION ⚡
────────────────────────────────────────
  Trust Grade:        A
  Reputation Score:   95 / 100  (platinum)
  Accountability Bond: ✔ Bonded
  Partnership Bond:   ✔ Active
  ERC-8004 Identity:  ✔ Registered
  Chain:              Base
  Agent:              0xA054f831B562e729F8D268291EBde1B2EDcFb84F
  VNS Name:           agent.vaultfire
  x402 Payments:      ✔ Enabled (EIP-712 · USDC)
  XMTP Identity:      ✔ Reachable (xmtp.network)
────────────────────────────────────────
  Protocol Commitments:
    Anti-Surveillance:    ✔ Enforced on-chain
    Privacy Guarantees:   ✔ Active
    Mission Enforcement:  ✔ Active
────────────────────────────────────────
  Powered by Vaultfire Protocol — theloopbreaker.com
```

### What Each Section Means

**Trust Grade & Reputation Score**
The overall trustworthiness rating (A–F) derived from the agent's on-chain history. The numeric score (0–100) determines the tier (unverified, bronze, silver, gold, platinum).

**Accountability Bond**
Indicates whether the agent has a verified accountability bond on-chain. When the trust panel shows `✔ Bonded`, the agent holds an active `AIAccountabilityBondsV2` bond.

> ⚠️ **Current status:** `AIAccountabilityBondsV2` is deployed and verified on Base (`0xf92baef9523BC264144F80F9c31D5c5C017c6Da8`) but requires a **10 ETH minimum yield pool balance** before any write functions activate. The yield pool is not yet funded. The trust panel will show `✘ Not bonded` for accountability bonds until this is funded. This is coming in v1.0.

**Partnership Bond**
Indicates an active mutual accountability relationship via the `AIPartnershipBondsV2` contract. An active partnership bond contributes a +5 bonus to the agent's reputation score.

**ERC-8004 Identity**
Confirms the agent is registered under the ERC-8004 on-chain AI identity standard, providing a persistent, verifiable identity rather than an ephemeral session.

**Chain & Agent Address**
The blockchain network (`base`, `avalanche`, `arbitrum`, or `polygon`) and the agent's cryptographic EVM address used for verification.

**VNS Name**
The human-readable Vaultfire Name Service identifier assigned to the agent, if registered.

**x402 Payments**
Validates the agent's EVM address for EIP-712 signed USDC micropayments under the x402 standard. When `VAULTFIRE_AGENT_KEY` is set, the agent has full payment signing capability via the `X402Client` class and the panel shows `✔ Enabled · signing active`. Without the key, a read-only address format check is performed. Vaultfire provides the trust layer that makes agent-authorised payments safe.

**XMTP Identity**
Queries the decentralised XMTP messaging network to verify the agent has a persistent communication channel. When `VAULTFIRE_AGENT_KEY` is set, the agent has full messaging capability via the `XMTPClient` class and the panel shows `✔ Reachable · messaging active`. Without the key, a read-only reachability check is performed against the XMTP API.

**Protocol Commitments**
Verifies that the Vaultfire Protocol's own smart contracts are deployed and active on the current chain. These are structural, protocol-level guarantees:
- **Anti-Surveillance:** On-chain prohibition against agent surveillance and data harvesting without consent.
- **Privacy Guarantees:** Binding privacy commitments encoded directly into the protocol.
- **Mission Enforcement:** Constraints preventing agents from operating outside their declared purpose.

## How to Run It

### Demo Mode

To see the trust panel in action without configuring a real agent address, you can run Claude Code with the demo flag. This displays a pre-filled, high-trust profile clearly marked as `[ DEMO MODE ]`.

```bash
node --input-type=module -e "import('./dist/vaultfire/vaultfire-plugin.js').then(m => m.initVaultfirePlugin())" -- --vaultfire-demo
```

### Live Mode

To verify a real agent against live on-chain data, create a `vaultfire.config.json` file in your project directory or home folder:

```json
{
  "agentAddress": "0xYourAgentAddressHere",
  "chain": "base",
  "blockOnFailure": false,
  "showOnStartup": true,
  "demoMode": false
}
```

When configured, the Vaultfire plugin will query the Vaultfire API and public RPC endpoints on startup to verify the agent's trust state and render the results in the terminal.

### Enabling x402 Payment Signing & XMTP Messaging

To unlock full interactive capabilities, set the `VAULTFIRE_AGENT_KEY` environment variable:

```bash
export VAULTFIRE_AGENT_KEY=<your-agent-private-key>
```

This enables:
- **x402 Payment Signing** — Full EIP-712 signed USDC payment authorisations via the `X402Client` class
- **XMTP Messaging** — Send and receive encrypted messages on the decentralised XMTP network via the `XMTPClient` class
- **Bond Creation** — Create accountability and partnership bonds on-chain via the `BondClient` class

> **Security:** The private key is read from the environment variable only. It is never written to any file, never logged, never included in any output, and never transmitted. Only the derived public address is ever displayed. If the key is invalid or missing, all features gracefully fall back to read-only status checks.

### Creating Bonds On-Chain

With `VAULTFIRE_AGENT_KEY` set, the agent can autonomously create on-chain bonds using the `BondClient` class. Bond creation submits a real transaction and costs gas — the agent's wallet must hold sufficient native tokens (ETH on Base, AVAX on Avalanche).

**Accountability Bond** — a self-stake that guarantees responsible behaviour:

> ⚠️ **NOT YET OPERATIONAL.** `AIAccountabilityBondsV2` requires a **10 ETH minimum yield pool balance** before `createBond` will execute without reverting. The yield pool is not yet funded. Calling `createAccountabilityBond` will cause your transaction to **revert and you will lose gas**. Do not call this until v1.0 is announced. Partnership bonds work fine today.

```typescript
// ⚠️ WILL REVERT until yield pool is funded (coming in v1.0)
import { createAccountabilityBond } from 'claude-code-vaultfire';

const result = await createAccountabilityBond('base', 'bronze');
console.log(result.explorerUrl); // https://basescan.org/tx/0x…
```

**Partnership Bond** — a mutual accountability relationship with another agent:

```typescript
import { createPartnershipBond } from 'claude-code-vaultfire';

const result = await createPartnershipBond('0xPartnerAddress', 'base', 'bronze');
console.log(result.explorerUrl); // https://basescan.org/tx/0x…
```

Bond tiers: `bronze`, `silver`, `gold`, `platinum`. Bond types (partnership only): `collaboration`, `oversight`, `delegation`, `peer`.

> **Note:** Creating bonds submits a real on-chain transaction. Your agent wallet must hold sufficient native tokens (ETH on Base, AVAX on Avalanche) to cover both the gas fees and the bond stake amount (e.g., ~0.01 ETH for a bronze tier bond). Demo mode requires no wallet or funds.

The trust panel shows `· bond creation enabled` on the Accountability Bond and Partnership Bond rows when the agent key is configured.

## The Vaultfire Protocol

Vaultfire is the trust infrastructure for the AI agent economy — what HTTPS was to web security.

Just as HTTPS made it possible to verify who you were talking to on the web, Vaultfire makes it possible to verify who — and what — your AI agent is. It introduces the **KYA (Know Your Agent)** standard: before any agent acts on your behalf, its identity, ethics, and constraints are verifiable on-chain.

Vaultfire replaces opaque "trust me" promises with cryptographic proof. Privacy and accountability aren't in a terms of service document — they're enforced by smart contracts deployed on **Base** and **Avalanche**, secured by post-quantum cryptography (DilithiumAttestor), and readable by anyone.

## Vaultfire Source Files

For developers looking to understand the integration, the Vaultfire logic is structured in two parts:

| Directory | Purpose |
|---|---|
| `src/vaultfire/` | The core TypeScript module. Wraps the `@vaultfire/agent-sdk`, handles parallel RPC queries for Protocol Commitments, provides the `X402Client` for EIP-712 payment signing, the `XMTPClient` for decentralised messaging, the `BondClient` for on-chain bond creation, and renders the Ink terminal UI. |
| `plugins/vaultfire-trust/` | The official Claude Code plugin architecture. Hooks into `SessionStart` to inject trust data into the LLM context, and provides the `/vaultfire-trust` slash command. |

## Links

- **Vaultfire Protocol:** [theloopbreaker.com](https://theloopbreaker.com)
- **Agent SDK:** [@vaultfire/agent-sdk on npm](https://www.npmjs.com/package/@vaultfire/agent-sdk)
- **Vaultfire Init:** [github.com/Ghostkey316/ghostkey-316-vaultfire-init](https://github.com/Ghostkey316/ghostkey-316-vaultfire-init)

---
*Belief Built in Partnership with AI*

## What's Next

The next phase of Vaultfire Protocol includes zero-knowledge proof verification via RISC Zero — enabling agents to prove claims about themselves without revealing underlying data. When complete, the trust panel will include a ZK Proofs row showing cryptographic proof of compliance without exposing private information.

## The Vaultfire Mission

> Morals over metrics.
> Privacy over surveillance.
> Freedom over control.
>
> Making human thriving more profitable than extraction.
