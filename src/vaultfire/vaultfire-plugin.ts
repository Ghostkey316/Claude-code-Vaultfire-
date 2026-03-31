/**
 * Vaultfire Plugin for Claude Code
 *
 * Reads the local `vaultfire.config.json`, performs trust verification
 * via the Vaultfire SDK, renders the trust panel, and optionally blocks
 * execution when the agent fails verification.
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
import { checkAgentTrust, formatTrustSummary } from './trust-client.js';
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
};

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
 * 2. Calls {@link checkAgentTrust} with the configured address.
 * 3. Renders the {@link TrustPanel} in the terminal (Ink).
 * 4. If `blockOnFailure` is enabled and the grade is **F**, throws.
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
      trustGrade: 'F',
      reputationScore: 0,
      reputationTier: 'unverified',
      isBonded: false,
      erc8004Registered: false,
      chain: config.chain,
      address: '',
      vnsName: null,
      verificationUrl: '',
    };
  }

  // Perform the on-chain trust verification
  const trust = await checkAgentTrust(config.agentAddress, config.chain);

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

  // Block execution if trust verification fails
  if (config.blockOnFailure && trust.trustGrade === 'F') {
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
  const context =
    `This Claude Code session is running under Vaultfire KYA (Know Your Agent) verification.\n\n` +
    summary +
    `\n\nAll actions in this session are subject to Vaultfire Protocol accountability. ` +
    `Trust verification powered by theloopbreaker.com.`;

  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: context,
    },
  });
}
