---
name: create-partnership-bond
description: Create an on-chain partnership bond with another agent on the Vaultfire Protocol. Establishes a mutual accountability relationship. Requires VAULTFIRE_AGENT_KEY.
---

# /create-partnership-bond

Create an on-chain partnership bond between this agent and another agent on the Vaultfire Protocol.

A partnership bond establishes a mutual accountability relationship between two agents (or an agent and an operator) via the AIPartnershipBondsV2 contract. An active partnership bond contributes +5 points to the agent's reputation score.

## Prerequisites

1. **VAULTFIRE_AGENT_KEY** must be set as an environment variable containing the agent's private key.
2. The agent's wallet must hold sufficient native tokens (ETH on Base, AVAX on Avalanche) to cover gas fees and the bond stake amount.
3. The partner's EVM address must be known.

## Usage

```
/create-partnership-bond <partner_address> [chain] [tier] [type]
```

**Parameters:**
- `partner_address` — **(Required)** The EVM address of the partner agent (0x + 40 hex chars)
- `chain` — The blockchain network: `base` (default) or `avalanche`
- `tier` — The bond tier: `bronze` (default), `silver`, `gold`, or `platinum`
- `type` — The bond type: `collaboration` (default), `oversight`, `delegation`, or `peer`

## What Happens

1. The partner address is validated as a well-formed EVM address.
2. The Vaultfire SDK builds the unsigned partnership bond transaction.
3. The agent signs the transaction locally using the private key from `VAULTFIRE_AGENT_KEY`.
4. The signed transaction is broadcast to the chain's public RPC endpoint.
5. The transaction is confirmed on-chain (waits for 1 block confirmation).
6. The partnership bond is now active and visible in the trust panel.

## Expected Output

```
[vaultfire/bond] Creating partnership bond on base (tier: bronze, type: collaboration) between 0xYourAddress and 0xPartnerAd…
[vaultfire/bond] Transaction submitted on base: 0xTransactionHash…
[vaultfire/bond] Transaction confirmed on base: 0xTransactionHash… (block 12345678)
[vaultfire/bond] Partnership bond created: https://basescan.org/tx/0xTransactionHash…
```

## Result

```json
{
  "txHash": "0x…",
  "chain": "base",
  "agentAddress": "0xYourAddress",
  "partner": "0xPartnerAddress",
  "bondTier": "bronze",
  "explorerUrl": "https://basescan.org/tx/0x…"
}
```

## Bond Types

| Type | Description |
|---|---|
| `collaboration` | Mutual partnership between agents of similar capability |
| `oversight` | Supervisory relationship where one agent monitors another |
| `delegation` | One agent delegates specific tasks to another |
| `peer` | Equal-status peer relationship |

## Security

- The private key is read from `VAULTFIRE_AGENT_KEY` environment variable only.
- The key is never written to any file, never logged, and never included in any output.
- Only the derived public address is displayed.
- Self-bonding through this command is prevented — use `/create-accountability-bond` instead.

## Important

This command submits a **real on-chain transaction** that costs gas and stakes real funds. Ensure the wallet has sufficient balance before running.
