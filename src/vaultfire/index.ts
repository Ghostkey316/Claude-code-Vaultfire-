/**
 * Vaultfire Trust Verification Module
 *
 * Barrel export for the Vaultfire integration in Claude Code.
 * Provides the trust client, trust panel, plugin initialiser,
 * and all associated types.
 *
 * @module vaultfire
 */

export { checkAgentTrust, formatTrustSummary } from './trust-client.js';
export { TrustPanel } from './trust-panel.js';
export { initVaultfirePlugin, generateHookOutput } from './vaultfire-plugin.js';
export type {
  TrustResult,
  TrustGrade,
  SupportedChain,
  ReputationTier,
  VaultfireConfig,
  ProtocolCommitments,
  X402Status,
  XMTPStatus,
} from './types.js';
