// SECURITY: Private key is read from env var only. Never log, store, or transmit the key.

/**
 * x402 Payment Signing Client
 *
 * Provides EIP-712 signed USDC payment authorisations for AI agent
 * micropayments under the x402 standard.  The private key is sourced
 * exclusively from the `VAULTFIRE_AGENT_KEY` environment variable and
 * is never written to disk, logged, or included in any output.
 *
 * This module does NOT submit transactions on-chain — it only produces
 * a signed EIP-712 payload that a relayer or counterparty can verify
 * and execute.
 *
 * @module vaultfire/x402-client
 */

import { ethers } from 'ethers';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Well-known USDC contract addresses per chain. */
const USDC_ADDRESSES: Record<number, string> = {
  8453:   '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
  43114:  '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Avalanche
  42161:  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
  137:    '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Polygon
};

/** Map chain name to chain ID. */
const CHAIN_IDS: Record<string, number> = {
  base:      8453,
  avalanche: 43114,
  arbitrum:  42161,
  polygon:   137,
};

/** The EIP-712 type definitions for an x402 payment authorisation. */
const X402_TYPES = {
  x402Payment: [
    { name: 'to',       type: 'address' },
    { name: 'amount',   type: 'uint256' },
    { name: 'currency', type: 'string'  },
    { name: 'nonce',    type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

/* ------------------------------------------------------------------ */
/*  Payload interface                                                  */
/* ------------------------------------------------------------------ */

/** The structured payload that accompanies an x402 signature. */
export interface X402Payload {
  to: string;
  amount: string;
  currency: string;
  nonce: string;
  deadline: string;
  chainId: number;
  verifyingContract: string;
}

/** The complete result of an x402 payment signing operation. */
export interface X402SignResult {
  signature: string;
  payload: X402Payload;
  signingAddress: string;
}

/* ------------------------------------------------------------------ */
/*  X402Client class                                                   */
/* ------------------------------------------------------------------ */

/**
 * Client for signing x402 payment authorisations using EIP-712.
 *
 * The private key is read once from `process.env.VAULTFIRE_AGENT_KEY`
 * during construction and is never exposed, logged, or stored in any
 * accessible property.
 *
 * If the environment variable is not set or the key is invalid, the
 * client is created in a disabled state — all signing methods return
 * an error result without crashing.
 */
export class X402Client {
  /** The derived EVM address (public — safe to display). */
  public readonly address: string;

  /** Whether the client has a valid signing key. */
  public readonly enabled: boolean;

  /** Internal wallet instance — never exposed. */
  #wallet: ethers.Wallet | null;

  constructor() {
    const raw = process.env['VAULTFIRE_AGENT_KEY'];

    if (!raw) {
      this.address = '';
      this.enabled = false;
      this.#wallet = null;
      return;
    }

    // Validate key format without ever logging the value
    try {
      const key = raw.startsWith('0x') ? raw : `0x${raw}`;
      const wallet = new ethers.Wallet(key);
      this.#wallet = wallet;
      this.address = wallet.address;
      this.enabled = true;
    } catch {
      console.error(
        '[vaultfire/x402] VAULTFIRE_AGENT_KEY is set but is not a valid private key. ' +
        'x402 signing is disabled. Check the key format (64 hex chars, optionally 0x-prefixed).',
      );
      this.address = '';
      this.enabled = false;
      this.#wallet = null;
    }
  }

  /**
   * Derive the EVM address from the configured private key.
   *
   * Returns an empty string when the client is disabled.
   * This is a read-only operation — no signing occurs.
   */
  getAddress(): string {
    return this.address;
  }

  /**
   * Sign an x402 payment authorisation using EIP-712.
   *
   * The method constructs a typed data structure per the x402 standard,
   * signs it with the agent's private key, and returns the signature
   * along with the full payload.  The transaction is NOT submitted
   * on-chain — only the signature is produced.
   *
   * @param to       - The recipient EVM address.
   * @param amount   - The payment amount in USDC base units (6 decimals).
   * @param currency - The payment currency (must be 'USDC').
   * @param chainId  - The chain ID (8453 for Base, 43114 for Avalanche, 42161 for Arbitrum, 137 for Polygon).
   *                   Can also be a chain name ('base', 'avalanche', 'arbitrum', 'polygon').
   * @returns The signed payment result, or throws if the client is disabled.
   */
  async signPayment(
    to: string,
    amount: string,
    currency: 'USDC' = 'USDC',
    chainId: number | string = 8453,
  ): Promise<X402SignResult> {
    if (!this.#wallet || !this.enabled) {
      throw new Error(
        '[vaultfire/x402] Cannot sign: VAULTFIRE_AGENT_KEY is not configured. ' +
        'Set the environment variable to enable x402 payment signing.',
      );
    }

    // Resolve chain name to chain ID if needed
    const resolvedChainId = typeof chainId === 'string'
      ? (CHAIN_IDS[chainId] ?? 8453)
      : chainId;

    const usdcAddress = USDC_ADDRESSES[resolvedChainId]
      ?? USDC_ADDRESSES[8453]; // fallback to Base USDC

    // Build the EIP-712 domain
    const domain: ethers.TypedDataDomain = {
      name: 'x402Payment',
      version: '1',
      chainId: resolvedChainId,
      verifyingContract: usdcAddress,
    };

    // Build the payment value
    const nonce = Date.now().toString();
    const deadline = (Math.floor(Date.now() / 1000) + 3600).toString(); // 1 hour from now

    const value = {
      to,
      amount,
      currency,
      nonce,
      deadline,
    };

    // Sign the typed data
    const signature = await this.#wallet.signTypedData(domain, X402_TYPES, value);

    const payload: X402Payload = {
      to,
      amount,
      currency,
      nonce,
      deadline,
      chainId: resolvedChainId,
      verifyingContract: usdcAddress,
    };

    console.log(
      `[vaultfire/x402] Payment signed: ${amount} ${currency} to ${to.slice(0, 10)}… on chain ${resolvedChainId}`,
    );

    return {
      signature,
      payload,
      signingAddress: this.address,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Convenience singleton                                              */
/* ------------------------------------------------------------------ */

let _instance: X402Client | null = null;

/**
 * Get or create the singleton X402Client instance.
 *
 * The client reads `VAULTFIRE_AGENT_KEY` from the environment on first
 * access.  Subsequent calls return the same instance.
 */
export function getX402Client(): X402Client {
  if (!_instance) {
    _instance = new X402Client();
  }
  return _instance;
}
