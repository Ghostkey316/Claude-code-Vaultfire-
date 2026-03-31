/**
 * Vaultfire Trust Client
 *
 * Wraps the @vaultfire/agent-sdk to perform on-chain trust verification
 * for AI coding agents.  Returns a normalised {@link TrustResult} that
 * the rest of the plugin consumes.
 *
 * The client includes robust retry logic with exponential backoff so
 * that transient RPC or network failures do not crash Claude Code.
 * After all retries are exhausted a graceful "Unverified" fallback is
 * returned, allowing the session to continue normally.
 *
 * @module vaultfire/trust-client
 */

import { createVaultfireSDK } from '@vaultfire/agent-sdk';
import type { TrustProfile } from '@vaultfire/agent-sdk';
import type { SupportedChain, TrustResult } from './types.js';

/* ------------------------------------------------------------------ */
/*  Retry configuration                                                */
/* ------------------------------------------------------------------ */

/** Maximum number of verification attempts before falling back. */
const MAX_RETRIES = 3;

/** Base delay in milliseconds — doubled after each failed attempt. */
const BASE_DELAY_MS = 1_000;

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Sleep for the given number of milliseconds.
 * Used between retry attempts for exponential backoff.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build the "Unverified" fallback result returned when the Vaultfire
 * API / RPC endpoint cannot be reached after all retry attempts.
 */
function buildFallbackResult(
  address: string,
  chain: SupportedChain,
  error: unknown,
): TrustResult {
  const message =
    error instanceof Error ? error.message : String(error);

  console.warn(
    `[vaultfire] Trust verification failed after ${MAX_RETRIES} attempts: ${message}`,
  );
  console.warn(
    '[vaultfire] Continuing with "Unverified" status — Claude Code will function normally.',
  );

  return {
    trustGrade: 'Unverified',
    reputationScore: 0,
    reputationTier: 'unverified',
    isBonded: false,
    erc8004Registered: false,
    chain,
    address,
    vnsName: null,
    verificationUrl: '',
    rpcReachable: false,
    errorMessage: `Trust Unverified — RPC unreachable (${message})`,
  };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Verify an agent's trust status on the Vaultfire Protocol.
 *
 * The function will attempt up to {@link MAX_RETRIES} calls to the
 * Vaultfire SDK with exponential backoff (1 s → 2 s → 4 s).  If every
 * attempt fails the function returns a graceful "Unverified" result
 * instead of throwing, so Claude Code continues to work normally.
 *
 * @param address - The on-chain address of the agent to verify.
 * @param chain   - The blockchain network to query (default: `"base"`).
 * @returns A promise that resolves to a {@link TrustResult}.
 */
export async function checkAgentTrust(
  address: string,
  chain: SupportedChain = 'base',
): Promise<TrustResult> {
  const sdk = createVaultfireSDK({ chain });

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const trust: TrustProfile = await sdk.verifyTrust(address);

      return {
        trustGrade: trust.trustGrade ?? 'F',
        reputationScore: trust.reputationScore ?? 0,
        reputationTier: trust.reputationTier ?? 'unverified',
        isBonded: trust.isBonded ?? false,
        erc8004Registered: trust.isRegistered ?? false,
        chain,
        address,
        vnsName: trust.vnsName ?? null,
        verificationUrl: trust.verificationUrl ?? '',
        rpcReachable: true,
        errorMessage: null,
      };
    } catch (err: unknown) {
      lastError = err;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      const msg = err instanceof Error ? err.message : String(err);

      console.warn(
        `[vaultfire] Attempt ${attempt}/${MAX_RETRIES} failed: ${msg}` +
          (attempt < MAX_RETRIES ? ` — retrying in ${delay}ms…` : ' — no more retries.'),
      );

      if (attempt < MAX_RETRIES) {
        await sleep(delay);
      }
    }
  }

  // All retries exhausted — return graceful fallback
  return buildFallbackResult(address, chain, lastError);
}

/**
 * Build a human-readable trust summary string for terminal output.
 *
 * @param trust - The trust result to summarise.
 * @returns A multi-line string suitable for terminal display.
 */
export function formatTrustSummary(trust: TrustResult): string {
  const bondIcon = trust.isBonded ? '\u2714 Bonded' : '\u2718 Unbonded';
  const idIcon = trust.erc8004Registered ? '\u2714 Registered' : '\u2718 Unregistered';
  const chainLabels: Record<string, string> = { base: 'Base', avalanche: 'Avalanche', ethereum: 'Ethereum' };
  const chainLabel = chainLabels[trust.chain] ?? trust.chain;

  const lines = [
    '',
    '\u26A1 VAULTFIRE TRUST VERIFICATION \u26A1',
    ''.padStart(40, '\u2500'),
    `  Trust Grade:        ${trust.trustGrade}`,
    `  Reputation Score:   ${trust.reputationScore} / 100  (${trust.reputationTier})`,
    `  Bond Status:        ${bondIcon}`,
    `  ERC-8004 Identity:  ${idIcon}`,
    `  Chain:              ${chainLabel}`,
    `  Agent:              ${trust.address}`,
    trust.vnsName ? `  VNS Name:           ${trust.vnsName}` : '',
    trust.errorMessage ? `  Status:             ${trust.errorMessage}` : '',
    ''.padStart(40, '\u2500'),
    '  Powered by Vaultfire Protocol \u2014 theloopbreaker.com',
    '',
  ].filter(Boolean);

  return lines.join('\n');
}
