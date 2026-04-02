// SECURITY: Private key is read from env var only. Never log, store, or transmit the key.

/**
 * XMTP Messaging Client for Vaultfire Agents
 *
 * Provides decentralised, end-to-end encrypted messaging over the XMTP
 * network.  The agent's private key is sourced exclusively from the
 * VAULTFIRE_AGENT_KEY environment variable and is never written to
 * disk, logged, or included in any output.
 *
 * @module vaultfire/xmtp-client
 */

import { ethers } from 'ethers';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface XMTPMessage {
  id: string;
  senderAddress: string;
  content: string;
  sent: Date;
}

export interface XMTPSendResult {
  success: boolean;
  messageId: string;
  to: string;
  error?: string;
}

export interface XMTPConversation {
  peerAddress: string;
  createdAt: Date;
  topic: string;
}

export type XMTPMessageHandler = (message: XMTPMessage) => void;

/* ------------------------------------------------------------------ */
/*  Internal XMTP client type (avoids importing at top level)          */
/* ------------------------------------------------------------------ */

interface XMTPClientInstance {
  address: string;
  conversations: {
    newConversation(peerAddress: string): Promise<XMTPConvoInstance>;
    list(): Promise<XMTPConvoInstance[]>;
  };
  canMessage(peerAddress: string): Promise<boolean>;
  close(): Promise<void>;
}

interface XMTPConvoInstance {
  peerAddress: string;
  createdAt: Date;
  topic: string;
  send(content: string): Promise<{ id: string }>;
  messages(opts?: { limit?: number }): Promise<Array<{
    id: string;
    senderAddress: string;
    content: string;
    sent: Date;
  }>>;
  streamMessages(): Promise<AsyncIterable<{
    id: string;
    senderAddress: string;
    content: string;
    sent: Date;
  }>>;
}

/* ------------------------------------------------------------------ */
/*  XMTPClient class                                                   */
/* ------------------------------------------------------------------ */

export class XMTPClient {
  public readonly address: string;
  public readonly enabled: boolean;
  public readonly network: string = 'production';

  #wallet: ethers.Wallet | null;
  #xmtpClient: XMTPClientInstance | null = null;
  #initialised = false;

  constructor() {
    const raw = process.env['VAULTFIRE_AGENT_KEY'];

    if (!raw) {
      this.address = '';
      this.enabled = false;
      this.#wallet = null;
      return;
    }

    try {
      const key = raw.startsWith('0x') ? raw : `0x${raw}`;
      const wallet = new ethers.Wallet(key);
      this.#wallet = wallet;
      this.address = wallet.address;
      this.enabled = true;
    } catch {
      console.error(
        '[vaultfire/xmtp] VAULTFIRE_AGENT_KEY is set but is not a valid private key. ' +
          'XMTP messaging is disabled.',
      );
      this.address = '';
      this.enabled = false;
      this.#wallet = null;
    }
  }

  /**
   * Lazily initialise the XMTP client on first use.
   */
  private async ensureInitialised(): Promise<void> {
    if (this.#initialised) return;
    if (!this.#wallet) {
      throw new Error(
        '[vaultfire/xmtp] Cannot initialise: VAULTFIRE_AGENT_KEY is not configured.',
      );
    }

    try {
      const xmtpModule = await import('@xmtp/xmtp-js');
      const ClientClass = xmtpModule.Client;
      this.#xmtpClient = (await ClientClass.create(this.#wallet, {
        env: 'production',
      })) as unknown as XMTPClientInstance;
      this.#initialised = true;
      console.log(
        `[vaultfire/xmtp] XMTP client initialised for ${this.address}`,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown XMTP error';
      throw new Error(
        `[vaultfire/xmtp] Failed to initialise XMTP client: ${message}`,
      );
    }
  }

  /**
   * Check whether a peer address is reachable on the XMTP network.
   */
  async canMessage(peerAddress: string): Promise<boolean> {
    await this.ensureInitialised();
    if (!this.#xmtpClient) return false;
    try {
      return await this.#xmtpClient.canMessage(peerAddress);
    } catch {
      return false;
    }
  }

  /**
   * Send a text message to a peer address via XMTP.
   */
  async sendMessage(to: string, content: string): Promise<XMTPSendResult> {
    await this.ensureInitialised();
    if (!this.#xmtpClient) {
      return {
        success: false,
        messageId: '',
        to,
        error: 'XMTP client not initialised.',
      };
    }

    try {
      const conversation = await this.#xmtpClient.conversations.newConversation(to);
      const sent = await conversation.send(content);
      console.log(
        `[vaultfire/xmtp] Message sent to ${to.slice(0, 10)}... (id: ${sent.id})`,
      );
      return { success: true, messageId: sent.id, to };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown send error';
      return { success: false, messageId: '', to, error: message };
    }
  }

  /**
   * List all conversations for this agent.
   */
  async listConversations(): Promise<XMTPConversation[]> {
    await this.ensureInitialised();
    if (!this.#xmtpClient) return [];

    try {
      const convos = await this.#xmtpClient.conversations.list();
      return convos.map((c) => ({
        peerAddress: c.peerAddress,
        createdAt: c.createdAt,
        topic: c.topic,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get recent messages from a specific peer.
   */
  async getMessages(
    peerAddress: string,
    limit = 20,
  ): Promise<XMTPMessage[]> {
    await this.ensureInitialised();
    if (!this.#xmtpClient) return [];

    try {
      const conversation =
        await this.#xmtpClient.conversations.newConversation(peerAddress);
      const msgs = await conversation.messages({ limit });
      return msgs.map((m) => ({
        id: m.id,
        senderAddress: m.senderAddress,
        content: typeof m.content === 'string' ? m.content : String(m.content),
        sent: m.sent,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Stream incoming messages from a specific peer in real time.
   * Returns an async iterable of messages.
   */
  async streamMessages(
    peerAddress: string,
    handler: XMTPMessageHandler,
  ): Promise<void> {
    await this.ensureInitialised();
    if (!this.#xmtpClient) {
      throw new Error('[vaultfire/xmtp] XMTP client not initialised.');
    }

    const conversation =
      await this.#xmtpClient.conversations.newConversation(peerAddress);
    const stream = await conversation.streamMessages();

    for await (const msg of stream) {
      handler({
        id: msg.id,
        senderAddress: msg.senderAddress,
        content: typeof msg.content === 'string' ? msg.content : String(msg.content),
        sent: msg.sent,
      });
    }
  }

  /**
   * Close the XMTP client and release resources.
   */
  async close(): Promise<void> {
    if (this.#xmtpClient) {
      await this.#xmtpClient.close();
      this.#xmtpClient = null;
      this.#initialised = false;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Convenience singleton                                              */
/* ------------------------------------------------------------------ */

let _instance: XMTPClient | null = null;

export function getXMTPClient(): XMTPClient {
  if (!_instance) {
    _instance = new XMTPClient();
  }
  return _instance;
}
