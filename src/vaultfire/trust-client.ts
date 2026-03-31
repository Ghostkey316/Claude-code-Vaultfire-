/**
 * Vaultfire Trust Client
 *
 * Wraps the @vaultfire/agent-sdk to perform on-chain trust verification
 * for AI coding agents.  Returns a normalised {@link TrustResult} that
 * the rest of the plugin consumes.
 *
 * The real SDK calls the Vaultfire Agent API to retrieve the full
 * TrustProfile for any on-chain address, including trust grade,
 * reputation score, bond status, and ERC-8004 registration.
 *
 * @module vaultfire/trust-client
 */

import { createVaultfireSDK } from '@vaultfire/agent-sdk';
import type { TrustProfile } from '@vaultfire/agent-sdk';
import type { SupportedChain, TrustResult } from './types.js';

/**
 * Verify an agent's trust status on the Vaultfire Protocol.
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
  };
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
    ''.padStart(40, '\u2500'),
    '  Powered by Vaultfire Protocol \u2014 theloopbreaker.com',
    '',
  ].filter(Boolean);

  return lines.join('\n');
}
