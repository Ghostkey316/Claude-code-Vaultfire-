/**
 * Vaultfire Plugin for Claude Code
 *
 * Reads the local `vaultfire.config.json`, performs trust verification
 * via the Vaultfire SDK, renders the trust panel, and optionally blocks
 * execution when the agent fails verification.
 *
 * The plugin is resilient to network failures: if the Vaultfire API
 * cannot be reached, Claude Code continues to function normally with
 * an "Unverified" trust status displayed in the panel.
 *
 * This module is the main entry point for the Vaultfire integration
 * inside Claude Code — Vaultfire Edition.
 *
 * @module vaultfire/vaultfire-plugin
 */

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render } from 'ink';
import { checkAgentTrust, buildDemoResult, formatTrustSummary } from './trust-client.js';
import { TrustPanel } from './trust-panel.js';
import type { VaultfireConfig, TrustResult } from './types.js';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CONFIG_FILE_NAME = 'vaultfire.config.json';

const DEFAULT_CONFIG: VaultfireConfig = {
  agentAddress: '',
  chain: 'base',
  blockOnFailure: false,
  showOnStartup: true,
  demoMode: false,
};

/* ------------------------------------------------------------------ */
/*  CLI flag detection                                                 */
/* ------------------------------------------------------------------ */

/**
 * Returns `true` when the `--vaultfire-demo` flag is present in the
 * process arguments.  This allows demo mode to be activated without
 * editing the config file, e.g.:
 *
 *   claude --vaultfire-demo
 */
function isDemoFlagSet(): boolean {
  return process.argv.includes('--vaultfire-demo');
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Attempt to load `vaultfire.config.json` from the current working
 * directory, then fall back to the user's home directory.
 * Returns the default config when the file is absent.
 */
function loadConfig(): VaultfireConfig {
  const candidates = [
    path.resolve(process.cwd(), CONFIG_FILE_NAME),
    path.resolve(process.env['HOME'] ?? '~', CONFIG_FILE_NAME),
  ];

  for (const configPath of candidates) {
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const parsed: Partial<VaultfireConfig> = JSON.parse(raw);
        return { ...DEFAULT_CONFIG, ...parsed };
      } catch {
        console.error(`[vaultfire] Failed to parse ${configPath} — using defaults.`);
      }
    }
  }

  return DEFAULT_CONFIG;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Initialise the Vaultfire plugin.
 *
 * 1. Reads `vaultfire.config.json` (if present).
 * 2. Checks for `--vaultfire-demo` CLI flag or `demoMode: true` in config.
 *    - If demo mode is active, returns a pre-filled high-trust profile
 *      without making any on-chain calls.  The panel clearly labels
 *      the result as `[ DEMO MODE ]`.
 * 3. Otherwise calls {@link checkAgentTrust} with the configured address.
 *    - Retries up to 3 times with exponential backoff on failure.
 *    - Falls back to "Unverified" if all retries are exhausted.
 * 4. Renders the {@link TrustPanel} in the terminal (Ink).
 * 5. If `blockOnFailure` is enabled and the grade is **F** (and the
 *    RPC was actually reachable — i.e. a real F, not a fallback),
 *    throws an error to halt startup.
 *
 * @returns The {@link TrustResult} for downstream consumers.
 */
export async function initVaultfirePlugin(): Promise<TrustResult> {
  const config = loadConfig();

  if (!config.agentAddress) {
    console.warn(
      '[vaultfire] No agentAddress configured — skipping trust verification.',
    );
    console.warn(
      '[vaultfire] Create a vaultfire.config.json to enable KYA verification.',
    );
    return {
      trustGrade: 'Unverified',
      reputationScore: 0,
      reputationTier: 'unverified',
      isBonded: false,
      erc8004Registered: false,
      partnershipBond: false,
      bondPartner: null,
      x402: { capable: false, signingAddress: '', standard: 'EIP-712', currency: 'USDC' },
      xmtp: { reachable: false, address: '', network: 'xmtp.network' },
      protocolCommitments: { antiSurveillance: false, privacyGuarantees: false, missionEnforcement: false },
      chain: config.chain,
      address: '',
      vnsName: null,
      verificationUrl: '',
      rpcReachable: false,
      errorMessage: 'No agentAddress configured.',
      demoMode: false,
    };
  }

  // Check for demo mode (CLI flag takes precedence over config file)
  const demoActive = isDemoFlagSet() || config.demoMode;

  if (demoActive) {
    console.log(
      '[vaultfire] Demo mode activated via ' +
        (isDemoFlagSet() ? '--vaultfire-demo flag' : 'vaultfire.config.json'),
    );
  }

  // Perform the on-chain trust verification (or return demo profile)
  const trust = demoActive
    ? buildDemoResult(config.agentAddress, config.chain)
    : await checkAgentTrust(config.agentAddress, config.chain);

  // Render the Ink-based trust panel in the terminal
  if (config.showOnStartup) {
    try {
      const element = React.createElement(TrustPanel, { trust });
      const { unmount, waitUntilExit } = render(element);
      await waitUntilExit();
      unmount();
    } catch {
      // Fallback to plain text if Ink rendering fails
      console.log(formatTrustSummary(trust));
    }
  }

  // Block execution only when the RPC was reachable and the agent
  // genuinely received an F grade.  If the RPC was unreachable we
  // never block — the user should not be punished for network issues.
  if (config.blockOnFailure && trust.trustGrade === 'F' && trust.rpcReachable) {
    throw new Error(
      `[vaultfire] Agent ${config.agentAddress} failed trust verification (grade: F). ` +
        'Execution blocked by blockOnFailure policy.',
    );
  }

  return trust;
}

/**
 * Generate the JSON output for the Claude Code SessionStart hook.
 * This is called by the shell hook handler.
 */
export function generateHookOutput(trust: TrustResult): string {
  const summary = formatTrustSummary(trust);
  const rpcNote = trust.rpcReachable
    ? ''
    : '\n\nNOTE: The Vaultfire RPC endpoint was unreachable. Trust data shown is a fallback. ' +
      'Claude Code is operating normally but without verified trust status.';

  const demoNote = trust.demoMode
    ? '\n\nNOTE: This session is running in DEMO MODE. The trust data shown is pre-filled ' +
      'and does NOT reflect real on-chain verification. Set demoMode: false in ' +
      'vaultfire.config.json to enable live trust verification.'
    : '';

  const context =
    `This Claude Code session is running under Vaultfire KYA (Know Your Agent) verification.\n\n` +
    summary +
    rpcNote +
    demoNote +
    `\n\nAll actions in this session are subject to Vaultfire Protocol accountability. ` +
    `Trust verification powered by theloopbreaker.com.`;

  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: context,
    },
  });
}
