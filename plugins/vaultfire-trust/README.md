# Vaultfire Trust Plugin

Vaultfire KYA (Know Your Agent) trust verification for Claude Code. This plugin integrates the Vaultfire Protocol directly into Claude Code's agent lifecycle, providing on-chain identity verification, accountability bonds, and reputation scoring.

## Features

| Feature | Description |
|---------|-------------|
| **SessionStart Hook** | Verifies agent trust on every session start and injects accountability context |
| **PreToolUse Hook** | Monitors tool usage for private key exposure and security violations |
| **`/vaultfire-trust` Command** | Display the current trust verification status on demand |
| **Trust Verifier Agent** | Specialised agent for interpreting and explaining trust data |
| **Vaultfire KYA Skill** | Auto-invoked skill for trust, verification, and accountability topics |

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
  "showOnStartup": true
}
```

## Links

- [Vaultfire Protocol](https://theloopbreaker.com)
- [Vaultfire Init Repository](https://github.com/Ghostkey316/ghostkey-316-vaultfire-init)
