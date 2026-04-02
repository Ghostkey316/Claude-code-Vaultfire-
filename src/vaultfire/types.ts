/**
 * Vaultfire Protocol — Trust Verification Types
 *
 * Type definitions for Vaultfire KYA (Know Your Agent) trust data,
 * used throughout the Claude Code — Vaultfire Edition integration.
 *
 * These types align with the @vaultfire/agent-sdk but provide a
 * simplified surface for the Claude Code trust panel and plugin.
 *
 * @module vaultfire/types
 */

/** Supported blockchain networks for Vaultfire trust verification. */
export type SupportedChain = 'base' | 'avalanche' | 'ethereum';

/** Trust grade assigned by the Vaultfire Protocol scoring engine. */
export type TrustGrade = 'A' | 'B' | 'C' | 'D' | 'F' | 'Unverified';

/** Reputation tier derived from the numeric score. */
export type ReputationTier = 'unverified' | 'bronze' | 'silver' | 'gold' | 'platinum';

/**
 * On-chain commitments made by the Vaultfire Protocol itself, distinct
 * from any individual agent's trust score.  Each field reflects whether
 * the corresponding Vaultfire smart contract is deployed and has bytecode
 * on the active chain — confirming the protocol's structural guarantees
 * are in force.
 *
 * Contract addresses (Base):
 *   AntiSurveillance:  0x722E37A7D6f27896C688336AaaFb0dDA80D25E57
 *   PrivacyGuarantees: 0xE2f75A4B14ffFc1f9C2b1ca22Fdd6877E5BD5045
 *   MissionEnforcement: 0x8568F4020FCD55915dB3695558dD6D2532599e56
 *
 * Contract addresses (Avalanche):
 *   AntiSurveillance:  0x281814eF92062DA8049Fe5c4743c4Aef19a17380
 *   PrivacyGuarantees: 0xc09F0e06690332eD9b490E1040BdE642f11F3937
 *   MissionEnforcement: 0xcf64D815F5424B7937aB226bC733Ed35ab6CaDcB
 */
/**
 * x402 payment signing capability status.
 *
 * x402 is a standard for AI agent micropayments using EIP-712 signed
 * USDC transfers.  When an agent has a valid EVM address, it is
 * considered x402-capable — meaning it can authorise payments on
 * behalf of the user.  Vaultfire is the trust layer that makes this safe.
 *
 * This is a read-only capability check — no wallet or private key is
 * required.  The signing address is the agent's on-chain address.
 */
export interface X402Status {
  /** Whether the agent address is a valid EVM address capable of EIP-712 signing. */
  capable: boolean;

  /** The EVM address that would sign x402 payment authorisations. */
  signingAddress: string;

  /** The signing standard used for payment authorisation. */
  standard: 'EIP-712';

  /** The payment currency supported by the x402 standard. */
  currency: 'USDC';
}

/**
 * XMTP decentralised messaging identity status.
 *
 * XMTP is a decentralised messaging protocol.  An agent with an EVM
 * address can be reached via XMTP, giving it a verified, persistent
 * messaging identity.  This proves the agent is reachable, not just
 * registered — a critical capability for trust.
 *
 * The reachability check queries the XMTP network to determine whether
 * the agent address has an active XMTP identity.  If the XMTP API is
 * unreachable, the check gracefully returns `reachable: false` without
 * failing the overall trust verification.
 */
export interface XMTPStatus {
  /** Whether the agent address is registered and reachable on XMTP. */
  reachable: boolean;

  /** The EVM address used as the XMTP identity. */
  address: string;

  /** The XMTP network identifier. */
  network: 'xmtp.network';
}

export interface ProtocolCommitments {
  /**
   * Whether the AntiSurveillance contract is deployed and active.
   * This contract enforces on-chain prohibitions against agent surveillance
   * and data harvesting without consent.
   */
  antiSurveillance: boolean;

  /**
   * Whether the PrivacyGuarantees contract is deployed and active.
   * This contract encodes the protocol's binding privacy commitments,
   * ensuring agent interactions cannot be used for profiling.
   */
  privacyGuarantees: boolean;

  /**
   * Whether the MissionEnforcement contract is deployed and active.
   * This contract enforces the Vaultfire Protocol's core mission
   * constraints, preventing agents from operating outside their
   * declared purpose.
   */
  missionEnforcement: boolean;
}

/** Simplified trust result consumed by the trust panel and plugin. */
export interface TrustResult {
  /** Letter grade representing overall trust level. */
  trustGrade: TrustGrade;

  /** Numeric reputation score from 0–100. */
  reputationScore: number;

  /** Reputation tier label. */
  reputationTier: ReputationTier;

  /** Whether the agent has posted an accountability bond. */
  isBonded: boolean;

  /** Whether the agent is registered under the ERC-8004 identity standard. */
  erc8004Registered: boolean;

  /** The blockchain network used for verification. */
  chain: SupportedChain;

  /** The on-chain address of the agent. */
  address: string;

  /** Optional VNS (Vaultfire Name Service) name. */
  vnsName: string | null;

  /** URL to the full verification page on Vaultfire. */
  verificationUrl: string;

  /**
   * Whether the Vaultfire API / RPC endpoint was reachable.
   * `true` when verification succeeded, `false` when all retries
   * were exhausted and the fallback result was returned.
   */
  rpcReachable: boolean;

  /**
   * Human-readable error message when verification failed, or `null`
   * when the check completed successfully.
   */
  errorMessage: string | null;

  /**
   * Whether the agent has an active AIPartnershipBondsV2 partnership bond
   * on the Vaultfire Protocol.  A partnership bond represents a mutual
   * accountability relationship between two agents or an agent and an
   * operator, verified through the AIPartnershipBondsV2 contract on
   * Base or Avalanche.
   */
  partnershipBond: boolean;

  /**
   * The address of the bond partner when `partnershipBond` is `true`,
   * or `null` when no partnership bond is active.
   */
  bondPartner: string | null;

  /**
   * x402 payment signing capability.
   * Indicates whether the agent's EVM address is valid for EIP-712
   * signed USDC micropayments under the x402 standard.
   */
  x402: X402Status;

  /**
   * XMTP decentralised messaging identity.
   * Indicates whether the agent is reachable via the XMTP messaging
   * network, proving it has a verified, persistent communication channel.
   */
  xmtp: XMTPStatus;

  /**
   * On-chain commitments made by the Vaultfire Protocol itself.
   * These reflect whether the AntiSurveillance, PrivacyGuarantees, and
   * MissionEnforcement contracts are deployed and active on the chain
   * being queried.  These are protocol-level guarantees, not agent-level.
   */
  protocolCommitments: ProtocolCommitments;

  /**
   * Whether this result was generated by demo mode rather than a live
   * on-chain query.  When `true` the trust panel displays a clearly
   * visible `[ DEMO MODE ]` label so users are never misled.
   */
  demoMode: boolean;
}

/** Configuration stored in vaultfire.config.json. */
export interface VaultfireConfig {
  /** The on-chain address of the agent to verify. */
  agentAddress: string;

  /** The blockchain network to query. */
  chain: SupportedChain;

  /** If true, block Claude Code startup when the trust grade is F. */
  blockOnFailure: boolean;

  /** If true, display the trust panel on every startup. */
  showOnStartup: boolean;

  /**
   * If true, skip the live on-chain query and display a pre-filled
   * high-trust demo profile instead.  The panel shows a prominent
   * `[ DEMO MODE ]` label so the result is never mistaken for real data.
   *
   * Enable with `--vaultfire-demo` CLI flag or by setting this to `true`
   * in vaultfire.config.json.
   */
  demoMode: boolean;
}
