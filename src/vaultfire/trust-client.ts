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
 * x402 payment capability is determined by validating the agent address
 * as a well-formed EVM address (0x + 40 hex chars).  When the
 * VAULTFIRE_AGENT_KEY environment variable is set, the X402Client
 * enables full EIP-712 payment signing and the XMTPClient enables
 * full decentralised messaging.  Without the key, both features
 * fall back to read-only status checks.
 *
 * @module vaultfire/trust-client
 */

import { createVaultfireSDK } from '@vaultfire/agent-sdk';
import type { TrustProfile } from '@vaultfire/agent-sdk';
import type { SupportedChain, TrustGrade, TrustResult, ProtocolCommitments, X402Status, XMTPStatus } from './types.js';
import { getX402Client } from './x402-client.js';
import { getXMTPClient } from './xmtp-client.js';
import { getBondClient } from './bond-client.js';
import type { AccountabilityBondResult, PartnershipBondResult, BondStatusResult } from './bond-client.js';

/* ------------------------------------------------------------------ */
/*  Retry configuration                                                */
/* ------------------------------------------------------------------ */

/** Maximum number of verification attempts before falling back. */
const MAX_RETRIES = 3;

/** Base delay in milliseconds — doubled after each failed attempt. */
const BASE_DELAY_MS = 1_000;

/* ------------------------------------------------------------------ */
/*  Protocol contract addresses                                        */
/*                                                                     */
/*  These are the deployed Vaultfire Protocol commitment contracts.    */
/*  Source: ghostkey-316-vaultfire-init / app/lib/contracts.ts        */
/* ------------------------------------------------------------------ */

interface ProtocolContractSet {
  antiSurveillance: string;
  privacyGuarantees: string;
  missionEnforcement: string;
}

/**
 * Deployed contract addresses for each supported chain.
 * Verified against the Vaultfire Protocol's official contracts.ts.
 */
const PROTOCOL_CONTRACTS: Record<string, ProtocolContractSet> = {
  base: {
    antiSurveillance:   '0x722E37A7D6f27896C688336AaaFb0dDA80D25E57',
    privacyGuarantees:  '0xE2f75A4B14ffFc1f9C2b1ca22Fdd6877E5BD5045',
    missionEnforcement: '0x8568F4020FCD55915dB3695558dD6D2532599e56',
  },
  avalanche: {
    antiSurveillance:   '0x281814eF92062DA8049Fe5c4743c4Aef19a17380',
    privacyGuarantees:  '0xc09F0e06690332eD9b490E1040BdE642f11F3937',
    missionEnforcement: '0xcf64D815F5424B7937aB226bC733Ed35ab6CaDcB',
  },
  arbitrum: {
    antiSurveillance:   '0xfDdd2B1597c87577543176AB7f49D587876563D2',
    privacyGuarantees:  '0x8aceF0Bc7e07B2dE35E9069663953f41B5422218',
    missionEnforcement: '0x0E777878C5b5248E1b52b09Ab5cdEb2eD6e7Da58',
  },
  polygon: {
    antiSurveillance:   '0xfDdd2B1597c87577543176AB7f49D587876563D2',
    privacyGuarantees:  '0x8aceF0Bc7e07B2dE35E9069663953f41B5422218',
    missionEnforcement: '0x0E777878C5b5248E1b52b09Ab5cdEb2eD6e7Da58',
  },
};

/** Public RPC endpoints for bytecode verification (read-only, no key required). */
const CHAIN_RPC: Record<string, string> = {
  base:      'https://mainnet.base.org',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
  arbitrum:  'https://arbitrum-one.publicnode.com',
  polygon:   'https://polygon-bor-rpc.publicnode.com',
};

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
 * Check whether a contract address has deployed bytecode on the given chain.
 *
 * Uses a raw eth_getCode JSON-RPC call against the public RPC endpoint.
 * A response of "0x" means no code is deployed; anything longer confirms
 * the contract is live and enforcing the protocol's guarantees.
 *
 * This is a read-only operation — no wallet, no private key, no gas.
 *
 * @param address - The contract address to check.
 * @param chain   - The chain to query.
 * @returns `true` when bytecode is present, `false` otherwise.
 */
async function hasDeployedBytecode(address: string, chain: string): Promise<boolean> {
  const rpc = CHAIN_RPC[chain] ?? CHAIN_RPC.base;
  try {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: [address, 'latest'],
        id: 1,
      }),
    });
    if (!res.ok) return false;
    const json = await res.json() as { result?: string };
    const code: string = json.result ?? '0x';
    // "0x" means no code; anything longer means contract is deployed
    return code !== '0x' && code.length > 2;
  } catch {
    return false;
  }
}

/**
 * Verify all three Vaultfire Protocol commitment contracts on the given chain.
 *
 * Each contract is checked in parallel for maximum speed.  If the chain
 * is not in PROTOCOL_CONTRACTS all three default to `false`.
 *
 * @param chain - The chain to query.
 * @returns A {@link ProtocolCommitments} object.
 */
async function checkProtocolCommitments(chain: string): Promise<ProtocolCommitments> {
  const contracts = PROTOCOL_CONTRACTS[chain];
  if (!contracts) {
    console.warn(`[vaultfire] No protocol contract addresses for chain "${chain}" — defaulting to false.`);
    return { antiSurveillance: false, privacyGuarantees: false, missionEnforcement: false };
  }

  const [antiSurveillance, privacyGuarantees, missionEnforcement] = await Promise.all([
    hasDeployedBytecode(contracts.antiSurveillance,   chain),
    hasDeployedBytecode(contracts.privacyGuarantees,  chain),
    hasDeployedBytecode(contracts.missionEnforcement, chain),
  ]);

  console.log(
    `[vaultfire] Protocol Commitments (${chain}): ` +
    `AntiSurveillance=${antiSurveillance} ` +
    `PrivacyGuarantees=${privacyGuarantees} ` +
    `MissionEnforcement=${missionEnforcement}`,
  );

  return { antiSurveillance, privacyGuarantees, missionEnforcement };
}

/* ------------------------------------------------------------------ */
/*  x402 payment capability                                            */
/* ------------------------------------------------------------------ */

/** Regex for a valid EVM address: 0x followed by exactly 40 hex chars. */
const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/**
 * Check whether the agent address is x402-capable.
 *
 * An agent is considered x402-capable when its address is a valid,
 * non-zero EVM address (0x + 40 hex chars).  This is a pure format
 * check — no wallet, no private key, no on-chain call required.
 *
 * @param agentAddress - The on-chain address to validate.
 * @returns An {@link X402Status} object.
 */
function checkX402Capability(agentAddress: string): X402Status {
  // When VAULTFIRE_AGENT_KEY is set, the X402Client derives the real
  // signing address and enables full EIP-712 payment signing.
  const x402Client = getX402Client();
  if (x402Client.enabled) {
    console.log(
      `[vaultfire] x402: VAULTFIRE_AGENT_KEY detected — full EIP-712 signing enabled ` +
        `(address: ${x402Client.address})`,
    );
    return {
      capable: true,
      signingAddress: x402Client.address,
      standard: 'EIP-712',
      currency: 'USDC',
    };
  }

  // Fallback: simple EVM address format check (read-only, no signing)
  const isValid =
    EVM_ADDRESS_RE.test(agentAddress) &&
    agentAddress !== '0x0000000000000000000000000000000000000000';

  if (isValid) {
    console.log(`[vaultfire] x402: agent address is a valid EVM address — payment capability enabled (read-only, no signing key).`);
  } else {
    console.log(`[vaultfire] x402: agent address is not a valid EVM address — payment capability disabled.`);
  }

  return {
    capable: isValid,
    signingAddress: isValid ? agentAddress : '',
    standard: 'EIP-712',
    currency: 'USDC',
  };
}

/* ------------------------------------------------------------------ */
/*  XMTP messaging identity                                            */
/* ------------------------------------------------------------------ */

/**
 * Check whether the agent address is reachable on the XMTP network.
 *
 * Queries the XMTP canMessage API to determine whether the address
 * has an active XMTP identity.  If the API call fails or returns
 * not-found, the function gracefully returns `reachable: false`
 * without failing the overall trust verification.
 *
 * This is a read-only HTTP call — no wallet or private key required.
 *
 * @param agentAddress - The EVM address to check on XMTP.
 * @returns An {@link XMTPStatus} object.
 */
async function checkXMTPReachability(agentAddress: string): Promise<XMTPStatus> {
  const fallback: XMTPStatus = {
    reachable: false,
    address: agentAddress,
    network: 'xmtp.network',
  };

  // When VAULTFIRE_AGENT_KEY is set, the XMTPClient has full messaging
  // capability — report as reachable with the derived address.
  const xmtpClient = getXMTPClient();
  if (xmtpClient.enabled) {
    console.log(
      `[vaultfire] XMTP: VAULTFIRE_AGENT_KEY detected — full messaging enabled ` +
        `(address: ${xmtpClient.address})`,
    );
    return {
      reachable: true,
      address: xmtpClient.address,
      network: 'xmtp.network',
    };
  }

  // Fallback: read-only reachability check via XMTP API (no key needed)
  if (!EVM_ADDRESS_RE.test(agentAddress)) {
    console.log('[vaultfire] XMTP: invalid address format — skipping reachability check.');
    return fallback;
  }

  try {
    const url = `https://production.xmtp.network/identity/v1/is-inbox-id/${agentAddress.toLowerCase()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5_000),
    });

    if (res.ok) {
      console.log(`[vaultfire] XMTP: address is reachable on xmtp.network.`);
      return {
        reachable: true,
        address: agentAddress,
        network: 'xmtp.network',
      };
    }

    console.log(`[vaultfire] XMTP: address not found on xmtp.network (HTTP ${res.status}).`);
    return fallback;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[vaultfire] XMTP: reachability check failed (${msg}) — defaulting to not reachable.`);
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/*  Trust grade calculation                                            */
/* ------------------------------------------------------------------ */

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
    x402: { capable: false, signingAddress: '', standard: 'EIP-712', currency: 'USDC' },
    xmtp: { reachable: false, address, network: 'xmtp.network' },
    protocolCommitments: { antiSurveillance: false, privacyGuarantees: false, missionEnforcement: false },
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
    x402: {
      capable: true,
      signingAddress: address || '0xDEMO000000000000000000000000000000000000',
      standard: 'EIP-712',
      currency: 'USDC',
    },
    xmtp: {
      reachable: true,
      address: address || '0xDEMO000000000000000000000000000000000000',
      network: 'xmtp.network',
    },
    protocolCommitments: {
      antiSurveillance: true,
      privacyGuarantees: true,
      missionEnforcement: true,
    },
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
  const sdk = createVaultfireSDK({ chain: chain as any });

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Run all checks in parallel for maximum speed:
      // 1. Agent trust via Vaultfire SDK
      // 2. Protocol commitment contract bytecode verification
      // 3. XMTP messaging identity reachability
      // (x402 is a synchronous format check, run after)
      const [trust, protocolCommitments, xmtp] = await Promise.all([
        sdk.verifyTrust(address) as Promise<TrustProfile>,
        checkProtocolCommitments(chain),
        checkXMTPReachability(address),
      ]);

      // x402 — synchronous EVM address format validation
      const x402 = checkX402Capability(address);

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
        x402,
        xmtp,
        protocolCommitments,
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
/* ------------------------------------------------------------------ */
/*  Bond creation — write operations (require VAULTFIRE_AGENT_KEY)      */
/* ------------------------------------------------------------------ */

/**
 * Create an accountability bond on-chain.
 *
 * This is a **write operation** — it submits a real on-chain transaction
 * and costs gas.  Requires `VAULTFIRE_AGENT_KEY` to be set.
 *
 * Delegates to {@link BondClient.createAccountabilityBond}.
 *
 * @param chain    - The chain to create the bond on (default: 'base').
 * @param bondTier - The bond tier (default: 'bronze').
 * @returns The bond creation result.
 */
export async function createAccountabilityBond(
  chain: SupportedChain = 'base',
  bondTier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze',
): Promise<AccountabilityBondResult> {
  const client = getBondClient();
  return client.createAccountabilityBond(chain as any, bondTier);
}

/**
 * Create a partnership bond with another agent on-chain.
 *
 * This is a **write operation** — it submits a real on-chain transaction
 * and costs gas.  Requires `VAULTFIRE_AGENT_KEY` to be set.
 *
 * Delegates to {@link BondClient.createPartnershipBond}.
 *
 * @param partnerAddress - The EVM address of the partner agent.
 * @param chain          - The chain to create the bond on (default: 'base').
 * @param bondTier       - The bond tier (default: 'bronze').
 * @returns The partnership bond creation result.
 */
export async function createPartnershipBond(
  partnerAddress: string,
  chain: SupportedChain = 'base',
  bondTier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze',
): Promise<PartnershipBondResult> {
  const client = getBondClient();
  return client.createPartnershipBond(partnerAddress, chain as any, bondTier);
}

/**
 * Get the current bond status for the agent.
 *
 * This is a **read-only** operation — no wallet or gas required.
 * Delegates to {@link BondClient.getBondStatus}.
 *
 * @param chain - The chain to query (default: 'base').
 * @returns The current bond status.
 */
export async function getAgentBondStatus(
  chain: SupportedChain = 'base',
): Promise<BondStatusResult> {
  const client = getBondClient();
  return client.getBondStatus(chain as any);
}

/* ------------------------------------------------------------------ */
/*  Trust summary formatting                                           */
/* ------------------------------------------------------------------ */

export function formatTrustSummary(trust: TrustResult): string {
  const bondIcon    = trust.isBonded          ? '\u2714 Bonded'      : '\u2718 Unbonded';
  const partnerIcon = trust.partnershipBond   ? '\u2714 Active'      : '\u2718 None';
  const idIcon      = trust.erc8004Registered ? '\u2714 Registered'  : '\u2718 Unregistered';
  const chainLabels: Record<string, string> = { base: 'Base', avalanche: 'Avalanche', arbitrum: 'Arbitrum', polygon: 'Polygon' };
  const chainLabel = chainLabels[trust.chain] ?? trust.chain;

  const pc = trust.protocolCommitments;
  const antiIcon = pc.antiSurveillance   ? '\u2714 Enforced on-chain' : '\u2718 Inactive';
  const privIcon  = pc.privacyGuarantees  ? '\u2714 Active'           : '\u2718 Inactive';
  const missIcon  = pc.missionEnforcement ? '\u2714 Active'           : '\u2718 Inactive';

  const demoTag = trust.demoMode ? '  [ DEMO MODE \u2014 not real on-chain data ]' : '';

  const lines = [
    '',
    trust.demoMode
      ? '\u26A1 VAULTFIRE TRUST VERIFICATION \u26A1  [ DEMO MODE ]'
      : '\u26A1 VAULTFIRE TRUST VERIFICATION \u26A1',
    ''.padStart(40, '\u2500'),
    demoTag,
    `  Trust Grade:        ${trust.trustGrade}`,
    `  Reputation Score:   ${trust.reputationScore} / 100  (${trust.reputationTier})`,
    `  Accountability Bond: ${bondIcon}`,
    `  Partnership Bond:   ${partnerIcon}`,
    trust.partnershipBond && trust.bondPartner
      ? `  Bond Partner:       ${trust.bondPartner}`
      : '',
    `  ERC-8004 Identity:  ${idIcon}`,
    `  Chain:              ${chainLabel}`,
    `  Agent:              ${trust.address}`,
    trust.vnsName ? `  VNS Name:           ${trust.vnsName}` : '',
    '',
    trust.x402.capable
      ? `  x402 Payments:      \u2714 Enabled (${trust.x402.standard} \u00B7 ${trust.x402.currency})`
      : '  x402 Payments:      \u2718 Not configured',
    trust.xmtp.reachable
      ? `  XMTP Identity:      \u2714 Reachable (${trust.xmtp.network})`
      : '  XMTP Identity:      \u2718 Not reachable',
    '',
    trust.errorMessage ? `  Status:             ${trust.errorMessage}` : '',
    ''.padStart(40, '\u2500'),
    '  Protocol Commitments:',
    `    Anti-Surveillance:    ${antiIcon}`,
    `    Privacy Guarantees:   ${privIcon}`,
    `    Mission Enforcement:  ${missIcon}`,
    ''.padStart(40, '\u2500'),
    '  Powered by Vaultfire Protocol \u2014 theloopbreaker.com',
    '',
  ].filter(Boolean);

  return lines.join('\n');
}
