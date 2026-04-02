/**
 * Vaultfire Trust Verification Module
 *
 * Barrel export for the Vaultfire integration in Claude Code.
 * Provides the trust client, trust panel, plugin initialiser,
 * and all associated types.
 *
 * @module vaultfire
 */

export { checkAgentTrust, formatTrustSummary, buildDemoResult } from './trust-client.js';
export { TrustPanel } from './trust-panel.js';
export { initVaultfirePlugin, generateHookOutput } from './vaultfire-plugin.js';
export { X402Client, getX402Client } from './x402-client.js';
export { XMTPClient, getXMTPClient } from './xmtp-client.js';
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
export type {
  X402Payload,
  X402SignResult,
} from './x402-client.js';
export type {
  XMTPMessage,
  XMTPSendResult,
  XMTPConversation,
  XMTPMessageHandler,
} from './xmtp-client.js';
