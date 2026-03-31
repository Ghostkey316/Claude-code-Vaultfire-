---
description: Display the Vaultfire KYA trust verification status for the current agent
---

# Vaultfire Trust Verification

You are running the Vaultfire trust verification command. Follow these steps:

## Step 1: Check Configuration

Look for a `vaultfire.config.json` file in the current directory. If it exists, read it and extract:
- `agentAddress`: The on-chain address to verify
- `chain`: The blockchain network (base or avalanche)
- `blockOnFailure`: Whether to block on failed verification
- `showOnStartup`: Whether to show the trust panel on startup

If no config file exists, inform the user they need to create one:
```json
{
  "agentAddress": "0xYourAgentAddressHere",
  "chain": "base",
  "blockOnFailure": false,
  "showOnStartup": true
}
```

## Step 2: Display Trust Information

Present the trust verification status in a clear, formatted output:

```
⚡ VAULTFIRE TRUST VERIFICATION ⚡
────────────────────────────────────────
  Trust Grade:        [grade]
  Reputation Score:   [score] / 100
  Bond Status:        [bonded/unbonded]
  ERC-8004 Identity:  [registered/unregistered]
  Chain:              [Base/Avalanche]
  Agent:              [address]
────────────────────────────────────────
  Powered by Vaultfire Protocol — theloopbreaker.com
```

## Step 3: Provide Context

Explain what each field means:
- **Trust Grade**: Overall trustworthiness rating (A through F)
- **Reputation Score**: Numeric score based on on-chain history (0–100)
- **Bond Status**: Whether the agent has staked an accountability bond
- **ERC-8004 Identity**: Whether the agent is registered under the on-chain AI identity standard
- **Chain**: Which blockchain network the verification runs on

## Links

- Vaultfire Protocol: https://theloopbreaker.com
- Vaultfire Init: https://github.com/Ghostkey316/ghostkey-316-vaultfire-init
