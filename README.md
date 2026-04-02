# Claude Code — Vaultfire Edition

Claude Code with Vaultfire's full trust layer baked in. The KYA (Know Your AI) standard means you don't have to choose between capability and trust.

This repository contains the complete open-source Claude Code distribution, enhanced with the Vaultfire Protocol's on-chain trust verification engine. Every time the agent starts, its identity, accountability bonds, payment capabilities, and protocol-level privacy commitments are verified cryptographically.

## The Trust Panel

When you run Claude Code — Vaultfire Edition, the trust panel provides an immediate, verifiable readout of the agent's on-chain state:

```
⚡ VAULTFIRE TRUST VERIFICATION ⚡
────────────────────────────────────────
  Trust Grade:        A
  Reputation Score:   95 / 100  (platinum)
  Bond Status:        ✔ Bonded
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

**Bond Status**
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
Validates the agent's EVM address format for EIP-712 signed USDC micropayments under the x402 standard. Vaultfire provides the trust layer that makes agent-authorised payments safe.

**XMTP Identity**
Queries the decentralised XMTP messaging network to prove the agent has a verified, persistent communication channel and is actively reachable.

**Protocol Commitments**
Verifies that the Vaultfire Protocol's own smart contracts are deployed and active on the current chain. These are structural, protocol-level guarantees:
- **Anti-Surveillance:** On-chain prohibition against agent surveillance and data harvesting without consent.
- **Privacy Guarantees:** Binding privacy commitments encoded directly into the protocol.
- **Mission Enforcement:** Constraints preventing agents from operating outside their declared purpose.

## How to Run It

### Demo Mode

To see the trust panel in action without configuring a real agent address, you can run Claude Code with the demo flag. This displays a pre-filled, high-trust profile clearly marked as `[ DEMO MODE ]`.

```bash
claude --vaultfire-demo
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

When configured, Claude Code will query the Vaultfire API and public RPC endpoints on startup to verify the agent's trust state and inject the results directly into the LLM's context.

## The Vaultfire Protocol

Vaultfire is the trust layer for the AI agent economy. It replaces opaque "trust me" promises with verifiable, on-chain cryptography.

The protocol operates primarily on **Base** and **Avalanche**, utilizing post-quantum cryptography (DilithiumAttestor) to ensure long-term security. Vaultfire's contracts manage agent identities, accountability bonds, and strict privacy enforcement. 

## Why This Matters

As AI agents gain autonomy, they require access to financial resources, private data, and critical infrastructure. The KYA (Know Your AI) standard ensures that before an agent acts on your behalf, its identity and constraints are verified. 

Privacy and accountability are enforced on-chain, not just promised in a terms of service document. This integration proves that autonomous AI and rigorous security can coexist seamlessly.

## Vaultfire Source Files

For developers looking to understand the integration, the Vaultfire logic is structured in two parts:

| Directory | Purpose |
|---|---|
| `src/vaultfire/` | The core TypeScript module. Wraps the `@vaultfire/agent-sdk`, handles parallel RPC queries for Protocol Commitments, validates x402/XMTP, and renders the Ink terminal UI. |
| `plugins/vaultfire-trust/` | The official Claude Code plugin architecture. Hooks into `SessionStart` to inject trust data into the LLM context, and provides the `/vaultfire-trust` slash command. |

## Links

- **Vaultfire Protocol:** [theloopbreaker.com](https://theloopbreaker.com)
- **Agent SDK:** [@vaultfire/agent-sdk on npm](https://www.npmjs.com/package/@vaultfire/agent-sdk)
- **Vaultfire Init:** [github.com/Ghostkey316/ghostkey-316-vaultfire-init](https://github.com/Ghostkey316/ghostkey-316-vaultfire-init)

---
*Belief Built in Partnership with AI*
