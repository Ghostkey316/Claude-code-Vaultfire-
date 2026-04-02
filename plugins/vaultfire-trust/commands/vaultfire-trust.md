---
description: Display the Vaultfire KYA (Know Your Agent) trust verification status for the current agent, including trust grade, reputation score, bond status, AIPartnershipBondsV2 partnership bond, ERC-8004 identity, and Protocol Commitments.
---

# Vaultfire Trust Verification

You are running the Vaultfire trust verification command. Follow these steps:

## Step 1: Check Configuration

Look for a `vaultfire.config.json` file in the current directory. If it exists, read it and extract:
- `agentAddress`: The on-chain address to verify
- `chain`: The blockchain network (`base`, `avalanche`, or `ethereum`)
- `blockOnFailure`: Whether to block on failed verification
- `showOnStartup`: Whether to show the trust panel on startup
- `demoMode`: Whether to show a pre-filled demo profile instead of live on-chain data

If no config file exists, inform the user they need to create one:
```json
{
  "agentAddress": "0xYourAgentAddressHere",
  "chain": "base",
  "blockOnFailure": false,
  "showOnStartup": true,
  "demoMode": false
}
```

If `demoMode` is `true` (or the session was started with `--vaultfire-demo`), display the demo trust profile and make it clear this is **demo data, not real on-chain data**.

## Step 2: Display Trust Information

Present the trust verification status in a clear, formatted output:

```
⚡ VAULTFIRE TRUST VERIFICATION ⚡
────────────────────────────────────────
  Trust Grade:          [A / B / C / D / F / Unverified]
  Reputation Score:     [0–100] / 100  ([tier])
  Bond Status:          [✔ Bonded / ✘ Unbonded]
  Partnership Bond:     [✔ Active / ✘ None]  (AIPartnershipBondsV2)
  ERC-8004 Identity:    [✔ Registered / ✘ Unregistered]
  Chain:                [Base / Avalanche / Ethereum]
  Agent:                [agentAddress]
  VNS Name:             [vaultfire name, if registered]
────────────────────────────────────────
  Protocol Commitments:
    Anti-Surveillance:    [✔ Enforced on-chain / ✘ Inactive]
    Privacy Guarantees:   [✔ Active / ✘ Inactive]
    Mission Enforcement:  [✔ Active / ✘ Inactive]
────────────────────────────────────────
  Powered by Vaultfire Protocol — theloopbreaker.com
```

## Step 3: Provide Context

Explain what each field means:
- **Trust Grade**: Overall trustworthiness rating (A–F). An active AIPartnershipBondsV2 bond adds +5 points to the score, which may improve the grade.
- **Reputation Score**: Numeric score based on on-chain history (0–100)
- **Bond Status**: Whether the agent has staked an accountability bond
- **Partnership Bond**: Whether the agent has an active AIPartnershipBondsV2 partnership bond with another agent or operator
- **ERC-8004 Identity**: Whether the agent is registered under the on-chain AI identity standard
- **Chain**: Which blockchain network the verification runs on (`base`, `avalanche`, or `ethereum`)
- **VNS Name**: The agent's Vaultfire Name Service name, if registered

## Trust Grade Scale

| Grade | Score Range | Meaning |
|-------|-------------|--------|
| A     | 90–100      | Platinum trust — fully bonded, registered, high reputation |
| B     | 75–89       | Gold trust — bonded and registered |
| C     | 55–74       | Silver trust — partial verification |
| D     | 30–54       | Bronze trust — minimal verification |
| F     | 0–29        | Unverified — no bond, no registration |

## Protocol Commitments

The Protocol Commitments section shows whether the Vaultfire Protocol's own smart contracts are deployed and active on the current chain. These are **protocol-level guarantees**, not agent-level:

- **Anti-Surveillance** — on-chain prohibition against agent surveillance and data harvesting without consent
- **Privacy Guarantees** — binding privacy commitments encoded on-chain
- **Mission Enforcement** — constraints preventing agents from operating outside their declared purpose

## Demo Mode

To see a demonstration without a real agent address:

```bash
claude --vaultfire-demo
```

Or set `"demoMode": true` in `vaultfire.config.json`. The panel shows a prominent `[ DEMO MODE ]` label so the result is never mistaken for real on-chain data.

## Links

- Vaultfire Protocol: https://theloopbreaker.com
- Vaultfire Init: https://github.com/Ghostkey316/ghostkey-316-vaultfire-init
