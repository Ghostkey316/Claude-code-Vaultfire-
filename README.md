# Claude Code — Vaultfire Edition

Claude Code with Vaultfire's full trust layer baked in. The KYA (Know Your Agent) standard means you don't have to choose between capability and trust.

This repository contains the complete open-source Claude Code distribution, enhanced with the Vaultfire Protocol's on-chain trust verification engine. Every time the agent starts, its identity, accountability bonds, payment capabilities, and protocol-level privacy commitments are verified cryptographically.

> **⚠️ Alpha Software** — Vaultfire Protocol is live on Base and Avalanche mainnet, but is currently in alpha. The smart contracts are deployed and functional, and the trust checks run against real on-chain data. However, the protocol is under active development: APIs may change, features are being added, and edge cases are still being addressed. This integration should not be used in production systems without a clear understanding of those risks. Use demo mode (`node --input-type=module -e "import('./dist/vaultfire/vaultfire-plugin.js').then(m => m.initVaultfirePlugin())" -- --vaultfire-demo`) to explore safely without requiring a configured agent address.

## Quick Start — 60 Seconds

**1. Clone & Install**
```bash
git clone https://github.com/Ghostkey316/Claude-code-Vaultfire-.git
cd Claude-code-Vaultfire-
npm install && npm run build
```

**2. Run Demo Mode** — see the full trust panel instantly, no configuration needed:
```bash
node --input-type=module -e "import('./dist/vaultfire/vaultfire-plugin.js').then(m => m.initVaultfirePlugin())" -- --vaultfire-demo
```

**3. Live Mode** — verify a real agent address on-chain:

Create `vaultfire.config.json` in the project directory:
```json
{
  "agentAddress": "0xYourAgentAddress",
  "chain": "base"
}
```
Then run:
```bash
node --input-type=module -e "import('./dist/vaultfire/vaultfire-plugin.js').then(m => m.initVaultfirePlugin())"
```

**Optional — Enable x402 Payment Signing & XMTP Messaging:**
```bash
export VAULTFIRE_AGENT_KEY=your_agent_private_key
node --input-type=module -e "import('./dist/vaultfire/vaultfire-plugin.js').then(m => m.initVaultfirePlugin())"
```

> Prerequisites: Node.js 18+ required.

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
Indicates whether the agent has staked an accountability bond. Bonded agents have financial skin in the game, ensuring alignment and responsible execution.

**Partnership Bond**
Indicates an active mutual accountability relationship via the `AIPartnershipBondsV2` contract. An active partnership bond contributes a +5 bonus to the agent's reputation score.

**ERC-8004 Identity**
Confirms the agent is registered under the ERC-8004 on-chain AI identity standard, providing a persistent, verifiable identity rather than an ephemeral session.

**Chain & Agent Address**
The blockchain network (`base`, `avalanche`, or `ethereum`) and the agent's cryptographic EVM address used for verification.

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

```typescript
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

The trust panel shows `· bond creation enabled` on the Accountability Bond and Partnership Bond rows when the agent key is configured.

## The Vaultfire Protocol

Vaultfire is the trust layer for the AI agent economy. It replaces opaque "trust me" promises with verifiable, on-chain cryptography.

The protocol operates primarily on **Base** and **Avalanche**, utilizing post-quantum cryptography (DilithiumAttestor) to ensure long-term security. Vaultfire's contracts manage agent identities, accountability bonds, and strict privacy enforcement. 

## Why This Matters

As AI agents gain autonomy, they require access to financial resources, private data, and critical infrastructure. The KYA (Know Your Agent) standard ensures that before an agent acts on your behalf, its identity and constraints are verified. 

Privacy and accountability are enforced on-chain, not just promised in a terms of service document. This integration proves that autonomous AI and rigorous security can coexist seamlessly.

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
