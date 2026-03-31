# Claude Code — Vaultfire Edition

![](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=flat-square) [![npm]](https://www.npmjs.com/package/@anthropic-ai/claude-code)

[npm]: https://img.shields.io/npm/v/@anthropic-ai/claude-code.svg?style=flat-square

**Claude Code with Vaultfire KYA trust verification built in.**

This repository is a fork of the official Claude Code distribution, enhanced with the Vaultfire Protocol to provide on-chain identity, accountability bonds, and reputation scoring for your AI coding agent.

## What Vaultfire Adds

Claude Code — Vaultfire Edition integrates the **Vaultfire Protocol** directly into the AI coding agent's lifecycle. It introduces **KYA (Know Your Agent)** verification, ensuring that the AI agent operating on your machine has verifiable trust, accountability, and an on-chain identity.

As AI coding agents gain more autonomy, trust becomes paramount. We believe AI agents should have:
- **Verifiable Trust:** A transparent, on-chain reputation score.
- **Accountability Bonds:** Financial stakes that align agent incentives with user safety.
- **On-chain Identity:** Standardised ERC-8004 identities to trace agent actions and origins.

Before Claude Code executes commands, the Vaultfire plugin queries the blockchain to verify the agent's trust grade, reputation score, bond status, and ERC-8004 identity registration. The PreToolUse hook also actively monitors for potential private key exposure, ensuring the agent respects security boundaries.

## Vaultfire Configuration

To enable KYA verification, copy the example configuration file to your project root:

```bash
cp vaultfire.config.example.json vaultfire.config.json
```

Edit `vaultfire.config.json` to include your agent's on-chain address:

```json
{
  "agentAddress": "0xYourAgentAddressHere",
  "chain": "base",
  "blockOnFailure": false,
  "showOnStartup": true
}
```

- `agentAddress`: The Ethereum/EVM address of the AI agent.
- `chain`: The blockchain network to query (`"base"`, `"avalanche"`, or `"ethereum"`).
- `blockOnFailure`: If `true`, Claude Code will refuse to start if the agent's trust grade is **F**.
- `showOnStartup`: If `true`, the trust panel will be displayed in the terminal on startup.
- `demoMode`: If `true`, skips live on-chain queries and displays a pre-filled high-trust demo profile.

## Demo Mode

To see what a fully bonded, highly reputable agent looks like without needing to interact with the blockchain, you can enable Demo Mode.

You can activate it via the configuration file (`"demoMode": true`) or by passing a flag when starting Claude Code:

```bash
claude --vaultfire-demo
```

When Demo Mode is active, the trust panel will display a pre-filled **Grade A** profile with a prominent `[ DEMO MODE ]` label. This ensures transparency so that the demo profile is never mistaken for real on-chain data. To view real live data again, ensure `demoMode` is set to `false` in your config and omit the CLI flag.

## Vaultfire Links

- **Vaultfire Protocol:** [theloopbreaker.com](https://theloopbreaker.com)
- **Vaultfire Init Repo:** [github.com/Ghostkey316/ghostkey-316-vaultfire-init](https://github.com/Ghostkey316/ghostkey-316-vaultfire-init)

---

### Belief Built in Partnership with AI

*This project represents a commitment to safe, verifiable, and accountable artificial intelligence. We believe that the future of AI development requires robust trust frameworks, and Vaultfire Protocol provides the foundation for that future.*

> **Alpha Disclaimer:** This is an experimental alpha release. Use at your own risk. The Vaultfire Protocol and the associated KYA verification are under active development.

---

## Original Claude Code Documentation

Claude Code is an agentic coding tool that lives in your terminal, understands your codebase, and helps you code faster by executing routine tasks, explaining complex code, and handling git workflows -- all through natural language commands. Use it in your terminal, IDE, or tag @claude on Github.

**Learn more in the [official documentation](https://code.claude.com/docs/en/overview)**.

<img src="./demo.gif" />

### Get started
> [!NOTE]
> Installation via npm is deprecated. Use one of the recommended methods below.

For more installation options, uninstall steps, and troubleshooting, see the [setup documentation](https://code.claude.com/docs/en/setup).

1. Install Claude Code:

    **MacOS/Linux (Recommended):**
    ```bash
    curl -fsSL https://claude.ai/install.sh | bash
    ```

    **Homebrew (MacOS/Linux):**
    ```bash
    brew install --cask claude-code
    ```

    **Windows (Recommended):**
    ```powershell
    irm https://claude.ai/install.ps1 | iex
    ```

    **WinGet (Windows):**
    ```powershell
    winget install Anthropic.ClaudeCode
    ```

    **NPM (Deprecated):**
    ```bash
    npm install -g @anthropic-ai/claude-code
    ```

2. Navigate to your project directory and run `claude`.

### Plugins

This repository includes several Claude Code plugins that extend functionality with custom commands and agents. See the [plugins directory](./plugins/README.md) for detailed documentation on available plugins. The **Vaultfire Trust Plugin** is included by default in this edition.

### Reporting Bugs

We welcome your feedback. Use the `/bug` command to report issues directly within Claude Code, or file a [GitHub issue](https://github.com/anthropics/claude-code/issues).

### Connect on Discord

Join the [Claude Developers Discord](https://anthropic.com/discord) to connect with other developers using Claude Code. Get help, share feedback, and discuss your projects with the community.

### Data collection, usage, and retention

When you use Claude Code, we collect feedback, which includes usage data (such as code acceptance or rejections), associated conversation data, and user feedback submitted via the `/bug` command.

#### How we use your data

See our [data usage policies](https://code.claude.com/docs/en/data-usage).

#### Privacy safeguards

We have implemented several safeguards to protect your data, including limited retention periods for sensitive information, restricted access to user session data, and clear policies against using feedback for model training.

For full details, please review our [Commercial Terms of Service](https://www.anthropic.com/legal/commercial-terms) and [Privacy Policy](https://www.anthropic.com/legal/privacy).
