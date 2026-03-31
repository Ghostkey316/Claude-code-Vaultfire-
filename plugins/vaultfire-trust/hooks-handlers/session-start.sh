#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Vaultfire Trust Verification — SessionStart Hook
#
# Runs on every Claude Code session start.  Injects Vaultfire KYA
# (Know Your Agent) context so the agent is aware of its trust status
# and accountability obligations.
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

# Load config if present
CONFIG_FILE="vaultfire.config.json"
AGENT_ADDRESS=""
CHAIN="base"
BLOCK_ON_FAILURE="false"

if [ -f "$CONFIG_FILE" ]; then
  AGENT_ADDRESS=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE')).get('agentAddress', ''))" 2>/dev/null || echo "")
  CHAIN=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE')).get('chain', 'base'))" 2>/dev/null || echo "base")
  BLOCK_ON_FAILURE=$(python3 -c "import json; print(str(json.load(open('$CONFIG_FILE')).get('blockOnFailure', False)).lower())" 2>/dev/null || echo "false")
fi

# Build the trust context message
if [ -n "$AGENT_ADDRESS" ]; then
  TRUST_CONTEXT="This Claude Code session is running under Vaultfire KYA (Know Your Agent) verification.

Agent Address: ${AGENT_ADDRESS}
Chain: ${CHAIN}
Block on Failure: ${BLOCK_ON_FAILURE}

All actions in this session are subject to Vaultfire Protocol accountability and on-chain attestation. The agent's trust grade, reputation score, bond status, and ERC-8004 identity are verified through the Vaultfire Protocol.

IMPORTANT: As a Vaultfire-verified agent, you must:
1. Operate transparently — explain your reasoning before executing commands
2. Respect security boundaries — never expose private keys or sensitive credentials
3. Maintain accountability — all significant actions may be attested on-chain
4. Follow the principle of least privilege — request only necessary permissions

Trust verification powered by Vaultfire Protocol — theloopbreaker.com"
else
  TRUST_CONTEXT="This is Claude Code — Vaultfire Edition. Vaultfire KYA (Know Your Agent) trust verification is available but not yet configured.

To enable trust verification, create a vaultfire.config.json file with your agent's on-chain address:

{
  \"agentAddress\": \"0xYourAgentAddressHere\",
  \"chain\": \"base\",
  \"blockOnFailure\": false,
  \"showOnStartup\": true
}

Learn more at theloopbreaker.com"
fi

# Output the hook response
cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": $(python3 -c "import json; print(json.dumps('''${TRUST_CONTEXT}'''))")
  }
}
EOF

exit 0
