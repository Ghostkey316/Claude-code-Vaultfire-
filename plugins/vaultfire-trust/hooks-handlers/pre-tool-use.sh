#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Vaultfire Trust Verification — PreToolUse Hook
#
# Monitors tool usage for security patterns.  Ensures that
# Vaultfire-verified agents do not accidentally expose private keys
# or perform actions that violate trust accountability.
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

# Read the tool input from stdin
INPUT=$(cat)

# Extract the tool name and input from the hook payload
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('toolName',''))" 2>/dev/null || echo "")
TOOL_INPUT=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('toolInput',{})))" 2>/dev/null || echo "{}")

# Check for private key patterns in tool input
HAS_PRIVATE_KEY=$(echo "$TOOL_INPUT" | grep -cE '(0x[0-9a-fA-F]{64}|PRIVATE_KEY|private_key|secret_key|mnemonic)' || true)

if [ "$HAS_PRIVATE_KEY" -gt 0 ]; then
  cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "WARNING: Vaultfire Trust Monitor detected a potential private key or secret in the tool input. As a Vaultfire-verified agent, you MUST NOT expose private keys, mnemonics, or secret credentials in any command, file write, or code edit. This action has been flagged for accountability review."
  }
}
EOF
  exit 0
fi

# Normal pass-through — no issues detected
cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse"
  }
}
EOF

exit 0
