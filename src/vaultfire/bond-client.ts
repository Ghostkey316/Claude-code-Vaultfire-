// SECURITY: Private key is read from env var only. Never log, store, or transmit the key.

/**
 * On-Chain Bond Creation Client
 *
 * Provides the ability for an agent to autonomously create accountability
 * bonds and partnership bonds on Base or Avalanche using the Vaultfire
 * Protocol's smart contracts.
 *
 * The private key is sourced exclusively from the `VAULTFIRE_AGENT_KEY`
 * environment variable and is never written to disk, logged, or included
 * in any output.  Only the derived public address is ever displayed.
 *
 * Bond creation is a **write operation** — it submits a real transaction
 * on-chain and costs gas.  The agent's wallet must hold sufficient native
 * tokens (ETH on Base, AVAX on Avalanche) to cover gas fees, plus any
 * bond stake amount denominated in the chain's native token.
 *
 * The flow uses the Vaultfire Agent SDK to build unsigned transaction data
 * (the SDK handles ABI encoding server-side), then signs and broadcasts
 * the transaction locally using ethers.js.
 *
 * @module vaultfire/bond-client
 */

import { ethers } from 'ethers';
import { createVaultfireSDK } from '@vaultfire/agent-sdk';
import type { SupportedChain, BondTier, AgentBondType, TransactionData } from '@vaultfire/agent-sdk';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Public RPC endpoints for transaction submission. */
const CHAIN_RPC: Record<string, string> = {
  base:      'https://mainnet.base.org',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
  arbitrum:  'https://arbitrum-one.publicnode.com',
  polygon:   'https://polygon-bor-rpc.publicnode.com',
};

/** Chain IDs for EVM networks. */
const CHAIN_IDS: Record<string, number> = {
  base:      8453,
  avalanche: 43114,
  arbitrum:  42161,
  polygon:   137,
};

/** Block explorer URLs for transaction links. */
const EXPLORER_URLS: Record<string, string> = {
  base:      'https://basescan.org/tx/',
  avalanche: 'https://snowtrace.io/tx/',
  arbitrum:  'https://arbiscan.io/tx/',
  polygon:   'https://polygonscan.com/tx/',
};

/* ------------------------------------------------------------------ */
/*  Result interfaces                                                  */
/* ------------------------------------------------------------------ */

/** Result of creating an accountability bond. */
export interface AccountabilityBondResult {
  /** The on-chain transaction hash. */
  txHash: string;

  /** The chain the bond was created on. */
  chain: string;

  /** The agent address that created the bond. */
  agentAddress: string;

  /** The stake amount in the chain's native token (human-readable). */
  stakeAmount: string;

  /** Block explorer URL for the transaction. */
  explorerUrl: string;
}

/** Result of creating a partnership bond. */
export interface PartnershipBondResult {
  /** The on-chain transaction hash. */
  txHash: string;

  /** The chain the bond was created on. */
  chain: string;

  /** The agent address that created the bond. */
  agentAddress: string;

  /** The partner agent's EVM address. */
  partner: string;

  /** The bond tier (bronze, silver, gold, platinum). */
  bondTier: string;

  /** Block explorer URL for the transaction. */
  explorerUrl: string;
}

/** Current bond status (read-only convenience wrapper). */
export interface BondStatusResult {
  /** Whether the agent has an active accountability bond. */
  isBonded: boolean;

  /** Whether the agent has an active partnership bond. */
  hasPartnershipBond: boolean;

  /** The partner address, if a partnership bond is active. */
  partnerAddress: string | null;

  /** The bond tier, if a bond is active. */
  bondTier: string | null;

  /** The bond amount in wei. */
  bondAmountWei: string;

  /** The bond amount in the chain's native token (human-readable). */
  bondAmountEth: string;

  /** The chain queried. */
  chain: string;
}

/* ------------------------------------------------------------------ */
/*  BondClient class                                                   */
/* ------------------------------------------------------------------ */

/**
 * Client for creating on-chain accountability and partnership bonds.
 *
 * The private key is read once from `process.env.VAULTFIRE_AGENT_KEY`
 * during construction and is never exposed, logged, or stored in any
 * accessible property.
 *
 * If the environment variable is not set or the key is invalid, the
 * client is created in a disabled state — all write methods throw a
 * clear error without crashing.
 */
export class BondClient {
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
        '[vaultfire/bond] VAULTFIRE_AGENT_KEY is set but is not a valid private key. ' +
        'Bond creation is disabled. Check the key format (64 hex chars, optionally 0x-prefixed).',
      );
      this.address = '';
      this.enabled = false;
      this.#wallet = null;
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Private helpers                                                  */
  /* ---------------------------------------------------------------- */

  /**
   * Connect the internal wallet to the RPC provider for the given chain.
   * Returns a connected wallet ready to sign and broadcast transactions.
   */
  #connectWallet(chain: string): ethers.Wallet {
    if (!this.#wallet) {
      throw new Error(
        '[vaultfire/bond] Cannot create bond: VAULTFIRE_AGENT_KEY is not configured. ' +
        'Set the environment variable to enable bond creation.',
      );
    }
    const rpc = CHAIN_RPC[chain] ?? CHAIN_RPC.base;
    const provider = new ethers.JsonRpcProvider(rpc);
    return this.#wallet.connect(provider);
  }

  /**
   * Sign and broadcast a transaction built by the Vaultfire SDK.
   *
   * The SDK returns unsigned transaction data (`to`, `data`, `value`,
   * `chainId`, `gasEstimate`).  This method signs it locally with the
   * agent's private key and submits it to the chain's public RPC.
   *
   * @param txData - The unsigned transaction data from the SDK.
   * @param chain  - The chain to broadcast on.
   * @returns The transaction hash.
   */
  async #signAndBroadcast(txData: TransactionData, chain: string): Promise<string> {
    const connectedWallet = this.#connectWallet(chain);

    const tx: ethers.TransactionRequest = {
      to: txData.to,
      data: txData.data,
      value: txData.value,
      chainId: CHAIN_IDS[chain] ?? CHAIN_IDS.base,
      gasLimit: txData.gasEstimate
        ? BigInt(txData.gasEstimate)
        : 300_000n, // Safe default if SDK doesn't provide estimate
    };

    const response = await connectedWallet.sendTransaction(tx);

    console.log(
      `[vaultfire/bond] Transaction submitted on ${chain}: ${response.hash}`,
    );

    // Wait for one confirmation to ensure the tx is mined
    const receipt = await response.wait(1);

    if (!receipt || receipt.status === 0) {
      throw new Error(
        `[vaultfire/bond] Transaction reverted on ${chain}: ${response.hash}. ` +
        'The bond creation failed on-chain. Check gas and stake amount.',
      );
    }

    console.log(
      `[vaultfire/bond] Transaction confirmed on ${chain}: ${response.hash} (block ${receipt.blockNumber})`,
    );

    return response.hash;
  }

  /* ---------------------------------------------------------------- */
  /*  Public API — Write operations                                    */
  /* ---------------------------------------------------------------- */

  /**
   * Create an accountability bond on-chain.
   *
   * This is a **write operation** — it submits a real transaction and
   * costs gas.  The agent's wallet must hold sufficient native tokens.
   *
   * Uses the Vaultfire SDK's `buildBondTx()` to obtain the unsigned
   * transaction data, then signs and broadcasts it locally.
   *
   * @param chain      - The chain to create the bond on ('base' or 'avalanche').
   * @param bondTier   - The bond tier (default: 'bronze').
   * @returns The bond creation result with transaction hash and explorer link.
   */
  async createAccountabilityBond(
    chain: SupportedChain = 'base',
    bondTier: BondTier = 'bronze',
  ): Promise<AccountabilityBondResult> {
    if (!this.enabled || !this.#wallet) {
      throw new Error(
        '[vaultfire/bond] Cannot create bond: VAULTFIRE_AGENT_KEY is not configured. ' +
        'Set the environment variable to enable bond creation.',
      );
    }

    console.log(
      `[vaultfire/bond] Creating accountability bond on ${chain} (tier: ${bondTier}) ` +
      `for agent ${this.address}…`,
    );

    const sdk = createVaultfireSDK({ chain });

    // The SDK's buildBondTx builds the unsigned transaction for bond creation.
    // For an accountability bond (self-bond), the agent is both the agent and
    // the partner — the contract recognises this as a solo accountability bond.
    const txData = await sdk.buildBondTx({
      agentAddress: this.address,
      partnerAddress: this.address, // Self-bond = accountability bond
      bondTier,
      chain,
    });

    const txHash = await this.#signAndBroadcast(txData, chain);
    const explorerUrl = (EXPLORER_URLS[chain] ?? EXPLORER_URLS.base) + txHash;

    console.log(
      `[vaultfire/bond] Accountability bond created: ${explorerUrl}`,
    );

    return {
      txHash,
      chain,
      agentAddress: this.address,
      stakeAmount: ethers.formatEther(txData.value || '0'),
      explorerUrl,
    };
  }

  /**
   * Create a partnership bond with another agent on-chain.
   *
   * This is a **write operation** — it submits a real transaction and
   * costs gas.  The agent's wallet must hold sufficient native tokens.
   *
   * Uses the Vaultfire SDK's `buildBondTx()` to obtain the unsigned
   * transaction data, then signs and broadcasts it locally.
   *
   * @param partnerAddress - The EVM address of the partner agent.
   * @param chain          - The chain to create the bond on ('base' or 'avalanche').
   * @param bondTier       - The bond tier (default: 'bronze').
   * @param bondType       - The bond type (default: 'collaboration').
   * @returns The partnership bond creation result with transaction hash.
   */
  async createPartnershipBond(
    partnerAddress: string,
    chain: SupportedChain = 'base',
    bondTier: BondTier = 'bronze',
    bondType: AgentBondType = 'collaboration',
  ): Promise<PartnershipBondResult> {
    if (!this.enabled || !this.#wallet) {
      throw new Error(
        '[vaultfire/bond] Cannot create bond: VAULTFIRE_AGENT_KEY is not configured. ' +
        'Set the environment variable to enable bond creation.',
      );
    }

    // Validate partner address format
    if (!/^0x[0-9a-fA-F]{40}$/.test(partnerAddress)) {
      throw new Error(
        `[vaultfire/bond] Invalid partner address: ${partnerAddress}. ` +
        'Must be a valid EVM address (0x + 40 hex chars).',
      );
    }

    // Prevent self-bonding through the partnership method
    if (partnerAddress.toLowerCase() === this.address.toLowerCase()) {
      throw new Error(
        '[vaultfire/bond] Cannot create a partnership bond with yourself. ' +
        'Use createAccountabilityBond() for self-bonds.',
      );
    }

    console.log(
      `[vaultfire/bond] Creating partnership bond on ${chain} (tier: ${bondTier}, type: ${bondType}) ` +
      `between ${this.address} and ${partnerAddress.slice(0, 10)}…`,
    );

    const sdk = createVaultfireSDK({ chain });

    const txData = await sdk.buildBondTx({
      agentAddress: this.address,
      partnerAddress,
      bondTier,
      bondType,
      chain,
    });

    const txHash = await this.#signAndBroadcast(txData, chain);
    const explorerUrl = (EXPLORER_URLS[chain] ?? EXPLORER_URLS.base) + txHash;

    console.log(
      `[vaultfire/bond] Partnership bond created: ${explorerUrl}`,
    );

    return {
      txHash,
      chain,
      agentAddress: this.address,
      partner: partnerAddress,
      bondTier,
      explorerUrl,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Public API — Read operations                                     */
  /* ---------------------------------------------------------------- */

  /**
   * Get the current bond status for the agent on the given chain.
   *
   * This is a **read-only** operation — no wallet or gas required.
   * It queries the Vaultfire SDK's `checkBond()` endpoint.
   *
   * @param chain - The chain to query (default: 'base').
   * @returns The current bond status.
   */
  async getBondStatus(chain: SupportedChain = 'base'): Promise<BondStatusResult> {
    const agentAddress = this.address || process.env['VAULTFIRE_AGENT_ADDRESS'] || '';

    if (!agentAddress) {
      return {
        isBonded: false,
        hasPartnershipBond: false,
        partnerAddress: null,
        bondTier: null,
        bondAmountWei: '0',
        bondAmountEth: '0',
        chain,
      };
    }

    const sdk = createVaultfireSDK({ chain });

    try {
      const status = await sdk.checkBond(agentAddress, agentAddress);

      return {
        isBonded: status.hasBond,
        hasPartnershipBond: status.partnerAddress != null && status.partnerAddress !== agentAddress,
        partnerAddress: status.partnerAddress,
        bondTier: status.tier,
        bondAmountWei: status.bondAmountWei,
        bondAmountEth: status.bondAmountEth.toString(),
        chain,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[vaultfire/bond] Bond status check failed: ${msg}`);
      return {
        isBonded: false,
        hasPartnershipBond: false,
        partnerAddress: null,
        bondTier: null,
        bondAmountWei: '0',
        bondAmountEth: '0',
        chain,
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Convenience singleton                                              */
/* ------------------------------------------------------------------ */

let _instance: BondClient | null = null;

/**
 * Get or create the singleton BondClient instance.
 *
 * The client reads `VAULTFIRE_AGENT_KEY` from the environment on first
 * access.  Subsequent calls return the same instance.
 */
export function getBondClient(): BondClient {
  if (!_instance) {
    _instance = new BondClient();
  }
  return _instance;
}
