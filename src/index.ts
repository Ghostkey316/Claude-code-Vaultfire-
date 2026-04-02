/**
 * Claude Code — Vaultfire Edition
 *
 * Main entry point.  Re-exports the full Vaultfire public API surface
 * so consumers can import directly from the package root.
 *
 * @example
 * ```ts
 * import { initVaultfirePlugin, checkAgentTrust, TrustPanel } from 'claude-code-vaultfire';
 * ```
 *
 * @packageDocumentation
 */

export {
  initVaultfirePlugin,
  generateHookOutput,
  checkAgentTrust,
  formatTrustSummary,
  TrustPanel,
} from './vaultfire/index.js';

export type {
  TrustResult,
  TrustGrade,
  SupportedChain,
  ReputationTier,
  VaultfireConfig,
  ProtocolCommitments,
} from './vaultfire/index.js';
