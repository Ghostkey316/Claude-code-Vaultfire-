# Vaultfire Trust Plugin

Vaultfire KYA (Know Your Agent) trust verification for Claude Code. This plugin integrates the Vaultfire Protocol directly into Claude Code's agent lifecycle, providing on-chain identity verification, accountability bonds, reputation scoring, x402 payment signing, and XMTP decentralised messaging.

## Features

| Feature | Description |
|---------|-------------|
| **SessionStart Hook** | Verifies agent trust on every session start and injects accountability context |
| **PreToolUse Hook** | Monitors tool usage for private key exposure and security violations |
| **`/vaultfire-trust` Command** | Display the current trust verification status on demand |
| **Trust Verifier Agent** | Specialised agent for interpreting and explaining trust data |
| **Vaultfire KYA Skill** | Auto-invoked skill for trust, verification, and accountability topics |
| **x402 Payment Signing** | Full EIP-712 signed USDC payment authorisations via `X402Client` (requires `VAULTFIRE_AGENT_KEY`) |
| **XMTP Messaging** | Send and receive encrypted messages on the XMTP network via `XMTPClient` (requires `VAULTFIRE_AGENT_KEY`) |

## How It Works

When a Claude Code session starts, the SessionStart hook reads the `vaultfire.config.json` configuration file from the project root. If an agent address is configured, the hook injects Vaultfire accountability context into the session, ensuring the agent operates with full awareness of its trust obligations.

The PreToolUse hook monitors all Bash commands, file edits, and writes for potential private key exposure. If a private key pattern is detected, the hook flags the action for accountability review.

## Configuration

Create a `vaultfire.config.json` in your project root:

```json
{
  "agentAddress": "0xYourAgentAddressHere",
  "chain": "base",
  "blockOnFailure": false,
  "showOnStartup": true,
  "demoMode": false
}
```

### Enabling x402 Payment Signing & XMTP Messaging

To unlock full interactive capabilities, set the `VAULTFIRE_AGENT_KEY` environment variable:

```bash
export VAULTFIRE_AGENT_KEY=<your-agent-private-key>
```

**Security:** The private key is read from the environment variable only. It is never written to any file, never logged, never included in any output, and never transmitted. Only the derived public address is ever displayed.

When set, the following features are activated:
- **x402 Payment Signing** — Full EIP-712 signed USDC payment authorisations via the `X402Client` class
- **XMTP Messaging** — Send and receive encrypted messages on the decentralised XMTP network via the `XMTPClient` class

When not set, both features gracefully fall back to read-only status checks.

### Demo Mode

To see the trust panel without a real agent address:

```bash
claude --vaultfire-demo
```

Or set `"demoMode": true` in `vaultfire.config.json`. The panel shows a prominent `[ DEMO MODE ]` label so the result is never mistaken for real on-chain data.

## Links

- [Vaultfire Protocol](https://theloopbreaker.com)
- [Vaultfire Init Repository](https://github.com/Ghostkey316/ghostkey-316-vaultfire-init)
