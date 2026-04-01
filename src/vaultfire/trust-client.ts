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
 * Partnership bond status is sourced from the AIPartnershipBondsV2
 * contract via the Vaultfire API.  The `TrustProfile.isBonded` and
 * `TrustProfile.bondPartner` fields reflect the on-chain
 * AIPartnershipBondsV2 state on Base and Avalanche.  A confirmed
 * partnership bond contributes +5 points to the effective reputation
 * score used for grade calculation.
 *
 * @module vaultfire/trust-client
 */

import { createVaultfireSDK } from '@vaultfire/agent-sdk';
import type { TrustProfile } from '@vaultfire/agent-sdk';
import type { SupportedChain, TrustGrade, TrustResult } from './types.js';

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
 * Derive a trust grade from a numeric reputation score.
 *
 * The partnership bond bonus (+5) is already factored into `score`
 * before this function is called, so the grade naturally improves
 * when an AIPartnershipBondsV2 bond is active.
 *
 * | Score  | Grade |
 * |--------|-------|
 * | 90–100 | A     |
 * | 75–89  | B     |
 * | 55–74  | C     |
 * | 30–54  | D     |
 * |  0–29  | F     |
 */
function scoreToGrade(score: number): TrustGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 55) return 'C';
  if (score >= 30) return 'D';
  return 'F';
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
    partnershipBond: false,
    bondPartner: null,
    chain,
    address,
    vnsName: null,
    verificationUrl: '',
    rpcReachable: false,
    errorMessage: `Trust Unverified — RPC unreachable (${message})`,
    demoMode: false,
  };
}

/* ------------------------------------------------------------------ */
/*  Demo mode                                                          */
/* ------------------------------------------------------------------ */

/**
 * Build a pre-filled high-trust demo result.
 *
 * This is returned when `demoMode` is enabled in the config (or via the
 * `--vaultfire-demo` CLI flag).  The result is clearly marked with
 * `demoMode: true` so the trust panel can display a `[ DEMO MODE ]`
 * label — ensuring users are never misled about the data source.
 *
 * The demo profile includes an active AIPartnershipBondsV2 partnership
 * bond (`partnershipBond: true`) to showcase the full feature set.
 *
 * @param address - The configured agent address (used for display only).
 * @param chain   - The configured chain (used for display only).
 * @returns A {@link TrustResult} representing a fully bonded, A-grade agent.
 */
export function buildDemoResult(
  address: string,
  chain: SupportedChain = 'base',
): TrustResult {
  console.log('[vaultfire] Demo mode active — using pre-filled high-trust profile.');
  return {
    trustGrade: 'A',
    reputationScore: 95,
    reputationTier: 'platinum',
    isBonded: true,
    erc8004Registered: true,
    partnershipBond: true,
    bondPartner: '0xVaultfire000000000000000000000000000000',
    chain,
    address: address || '0xDEMO000000000000000000000000000000000000',
    vnsName: 'demo.agent.vaultfire',
    verificationUrl: 'https://theloopbreaker.com/demo',
    rpcReachable: true,
    errorMessage: null,
    demoMode: true,
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
 * Partnership bond status is sourced from the AIPartnershipBondsV2
 * contract via `TrustProfile.isBonded` and `TrustProfile.bondPartner`.
 * When a partnership bond is active the effective reputation score is
 * boosted by +5 points, which may lift the agent's trust grade.
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

      // AIPartnershipBondsV2 — the SDK surfaces the on-chain bond state
      // through TrustProfile.isBonded and TrustProfile.bondPartner.
      // A non-null bondPartner confirms an active AIPartnershipBondsV2
      // partnership bond (as opposed to a solo accountability bond).
      const partnershipBond: boolean =
        (trust.isBonded ?? false) && trust.bondPartner != null;
      const bondPartner: string | null = trust.bondPartner ?? null;

      // Apply the partnership bond bonus (+5 pts) to the reputation score
      // before recalculating the grade.  This ensures the grade reflects
      // the full trust picture including the AIPartnershipBondsV2 state.
      const baseScore = trust.reputationScore ?? 0;
      const effectiveScore = partnershipBond
        ? Math.min(100, baseScore + 5)
        : baseScore;

      // Use the API-provided grade if the score didn't change, otherwise
      // recalculate to reflect the partnership bond bonus.
      const trustGrade =
        effectiveScore !== baseScore
          ? scoreToGrade(effectiveScore)
          : (trust.trustGrade ?? 'F');

      if (partnershipBond && effectiveScore !== baseScore) {
        console.log(
          `[vaultfire] AIPartnershipBondsV2 bond active — score boosted ` +
            `${baseScore} → ${effectiveScore}, grade: ${trustGrade}`,
        );
      }

      return {
        trustGrade,
        reputationScore: effectiveScore,
        reputationTier: trust.reputationTier ?? 'unverified',
        isBonded: trust.isBonded ?? false,
        erc8004Registered: trust.isRegistered ?? false,
        partnershipBond,
        bondPartner,
        chain,
        address,
        vnsName: trust.vnsName ?? null,
        verificationUrl: trust.verificationUrl ?? '',
        rpcReachable: true,
        errorMessage: null,
        demoMode: false,
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
  const partnerIcon = trust.partnershipBond ? '\u2714 Active' : '\u2718 None';
  const chainLabels: Record<string, string> = { base: 'Base', avalanche: 'Avalanche', ethereum: 'Ethereum' };
  const chainLabel = chainLabels[trust.chain] ?? trust.chain;

  const demoTag = trust.demoMode ? '  [ DEMO MODE — not real on-chain data ]' : '';

  const lines = [
    '',
    trust.demoMode
      ? '\u26A1 VAULTFIRE TRUST VERIFICATION \u26A1  [ DEMO MODE ]'
      : '\u26A1 VAULTFIRE TRUST VERIFICATION \u26A1',
    ''.padStart(40, '\u2500'),
    demoTag,
    `  Trust Grade:        ${trust.trustGrade}`,
    `  Reputation Score:   ${trust.reputationScore} / 100  (${trust.reputationTier})`,
    `  Bond Status:        ${bondIcon}`,
    `  Partnership Bond:   ${partnerIcon}`,
    trust.partnershipBond && trust.bondPartner
      ? `  Bond Partner:       ${trust.bondPartner}`
      : '',
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
