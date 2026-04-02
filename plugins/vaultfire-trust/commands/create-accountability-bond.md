---
name: create-accountability-bond
description: Create an on-chain accountability bond on the Vaultfire Protocol. Stakes the agent's own funds as a guarantee of responsible behaviour. Requires VAULTFIRE_AGENT_KEY.
---

# /create-accountability-bond

Create an on-chain accountability bond for this agent on the Vaultfire Protocol.

An accountability bond is a self-stake — the agent locks funds on-chain as a guarantee of responsible behaviour. This directly increases the agent's trust grade and reputation score.

## Prerequisites

1. **VAULTFIRE_AGENT_KEY** must be set as an environment variable containing the agent's private key.
2. The agent's wallet must hold sufficient native tokens (ETH on Base, AVAX on Avalanche) to cover gas fees and the bond stake amount.

## Usage

```
/create-accountability-bond [chain] [tier]
```

**Parameters:**
- `chain` — The blockchain network: `base` (default) or `avalanche`
- `tier` — The bond tier: `bronze` (default), `silver`, `gold`, or `platinum`

## What Happens

1. The Vaultfire SDK builds the unsigned bond creation transaction.
2. The agent signs the transaction locally using the private key from `VAULTFIRE_AGENT_KEY`.
3. The signed transaction is broadcast to the chain's public RPC endpoint.
4. The transaction is confirmed on-chain (waits for 1 block confirmation).
5. The bond is now active and visible in the trust panel.

## Expected Output

```
[vaultfire/bond] Creating accountability bond on base (tier: bronze) for agent 0xYourAddress…
[vaultfire/bond] Transaction submitted on base: 0xTransactionHash…
[vaultfire/bond] Transaction confirmed on base: 0xTransactionHash… (block 12345678)
[vaultfire/bond] Accountability bond created: https://basescan.org/tx/0xTransactionHash…
```

## Result

```json
{
  "txHash": "0x…",
  "chain": "base",
  "agentAddress": "0xYourAddress",
  "stakeAmount": "0.01",
  "explorerUrl": "https://basescan.org/tx/0x…"
}
```

## Security

- The private key is read from `VAULTFIRE_AGENT_KEY` environment variable only.
- The key is never written to any file, never logged, and never included in any output.
- Only the derived public address is displayed.
- If the key is missing or invalid, the command returns a clear error without crashing.

## Important

This command submits a **real on-chain transaction** that costs gas and stakes real funds. Ensure the wallet has sufficient balance before running.
