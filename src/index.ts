/**
 * Claude Code — Vaultfire Edition
 *
 * Main entry point.  Re-exports the full Vaultfire public API surface
 * so consumers can import directly from the package root.
 *
 * @example
 * ```ts
 * import { initVaultfirePlugin, checkAgentTrust, TrustPanel } from 'claude-code-vaultfire';
 * import { X402Client, XMTPClient } from 'claude-code-vaultfire';
 * ```
 *
 * @packageDocumentation
 */

export {
  initVaultfirePlugin,
  generateHookOutput,
  checkAgentTrust,
  formatTrustSummary,
  buildDemoResult,
  TrustPanel,
  X402Client,
  getX402Client,
  XMTPClient,
  getXMTPClient,
} from './vaultfire/index.js';

export type {
  TrustResult,
  TrustGrade,
  SupportedChain,
  ReputationTier,
  VaultfireConfig,
  ProtocolCommitments,
  X402Status,
  XMTPStatus,
  X402Payload,
  X402SignResult,
  XMTPMessage,
  XMTPSendResult,
  XMTPConversation,
  XMTPMessageHandler,
} from './vaultfire/index.js';
