# Vaultfire KYA (Know Your Agent)

## When to Use

This skill is automatically invoked when the user asks about agent trust, verification, accountability, or Vaultfire Protocol integration. It is also relevant when discussing AI safety, agent identity, or on-chain reputation.

## Core Concepts

The Vaultfire Protocol provides a trust verification framework for AI agents operating in autonomous or semi-autonomous environments. The KYA (Know Your Agent) standard ensures that every AI agent has a verifiable on-chain identity, a transparent reputation score, and optional accountability bonds that align the agent's incentives with user safety.

In the context of Claude Code, KYA verification runs at session startup. The agent's trust profile is fetched from the blockchain (Base or Avalanche), and the results are displayed in the terminal via the Vaultfire Trust Panel. If the `blockOnFailure` option is enabled and the agent's trust grade is F, the session is blocked from proceeding.

## Trust Verification Flow

The verification process begins when Claude Code starts a new session. The plugin reads the `vaultfire.config.json` file to obtain the agent's on-chain address and preferred chain. It then calls the Vaultfire Agent SDK's `verifyTrust()` method, which queries the Vaultfire Agent API for the full trust profile. The result includes the trust grade (A through F), a numeric reputation score (0 to 100), bond status, ERC-8004 registration status, and an optional VNS (Vaultfire Name Service) name.

## Configuration

Users configure the integration by placing a `vaultfire.config.json` file in their project root. The file specifies the agent address, the blockchain network, whether to block on verification failure, and whether to display the trust panel on startup.

## References

For more information, visit [theloopbreaker.com](https://theloopbreaker.com) or the [Vaultfire Init repository](https://github.com/Ghostkey316/ghostkey-316-vaultfire-init).
