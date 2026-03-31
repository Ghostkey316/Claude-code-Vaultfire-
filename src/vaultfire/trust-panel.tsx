/**
 * Vaultfire Trust Panel
 *
 * An Ink-based terminal UI component that renders a rich, colour-coded
 * trust verification panel inside the terminal.  Claude Code already
 * uses Ink for its terminal UI, so this integrates natively.
 *
 * The panel gracefully handles the "Unverified" fallback state that
 * occurs when the Vaultfire API / RPC endpoint is unreachable.
 *
 * @module vaultfire/trust-panel
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { TrustResult, TrustGrade } from './types.js';

/* ------------------------------------------------------------------ */
/*  Colour helpers                                                     */
/* ------------------------------------------------------------------ */

/** Map a trust grade to a terminal colour name. */
function gradeColor(grade: TrustGrade | string): string {
  switch (grade) {
    case 'A':
      return 'green';
    case 'B':
      return 'cyan';
    case 'C':
      return 'yellow';
    case 'D':
    case 'F':
    case 'Unverified':
    default:
      return 'red';
  }
}

/** Return a coloured status indicator for boolean fields. */
function statusIcon(ok: boolean): { symbol: string; color: string } {
  return ok
    ? { symbol: '\u2714', color: 'green' }
    : { symbol: '\u2718', color: 'red' };
}

/** Map reputation score to a colour. */
function scoreColor(score: number): string {
  if (score >= 80) return 'green';
  if (score >= 60) return 'cyan';
  if (score >= 40) return 'yellow';
  return 'red';
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

interface FieldRowProps {
  label: string;
  children: React.ReactNode;
}

/** A single labelled row in the trust panel. */
const FieldRow: React.FC<FieldRowProps> = ({ label, children }) => (
  <Box>
    <Text dimColor>{label.padEnd(22)}</Text>
    {children}
  </Box>
);

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export interface TrustPanelProps {
  trust: TrustResult;
}

/**
 * Renders the Vaultfire trust verification panel in the terminal.
 *
 * Displays trust grade, reputation score, bond status, ERC-8004
 * identity registration, chain, agent address, and optional VNS name
 * — all colour-coded for quick visual parsing.
 *
 * When the RPC endpoint is unreachable (rpcReachable === false), the
 * panel renders a clear warning instead of crashing.
 */
export const TrustPanel: React.FC<TrustPanelProps> = ({ trust }) => {
  const bond = statusIcon(trust.isBonded);
  const identity = statusIcon(trust.erc8004Registered);
  const gc = gradeColor(trust.trustGrade);

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={gc}
      paddingX={2}
      paddingY={1}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={gc}>
          {'\u26A1'} VAULTFIRE TRUST VERIFICATION {'\u26A1'}
        </Text>
      </Box>

      {/* ── RPC Warning (shown only when unreachable) ──────────── */}
      {!trust.rpcReachable && (
        <Box marginBottom={1}>
          <Text color="yellow" bold>
            {'\u26A0'} {trust.errorMessage ?? 'Trust Unverified — RPC unreachable'}
          </Text>
        </Box>
      )}

      {/* ── Trust Grade ────────────────────────────────────────── */}
      <FieldRow label="Trust Grade:">
        <Text bold color={gc}>
          {trust.trustGrade}
        </Text>
      </FieldRow>

      {/* ── Reputation Score ───────────────────────────────────── */}
      <FieldRow label="Reputation Score:">
        <Text bold color={scoreColor(trust.reputationScore)}>
          {trust.reputationScore}
        </Text>
        <Text dimColor> / 100</Text>
        <Text color="gray"> ({trust.reputationTier})</Text>
      </FieldRow>

      {/* ── Bond Status ────────────────────────────────────────── */}
      <FieldRow label="Bond Status:">
        <Text color={bond.color}>{bond.symbol}</Text>
        <Text> {trust.isBonded ? 'Bonded' : 'Unbonded'}</Text>
      </FieldRow>

      {/* ── ERC-8004 Identity ──────────────────────────────────── */}
      <FieldRow label="ERC-8004 Identity:">
        <Text color={identity.color}>{identity.symbol}</Text>
        <Text> {trust.erc8004Registered ? 'Registered' : 'Unregistered'}</Text>
      </FieldRow>

      {/* ── Chain ──────────────────────────────────────────────── */}
      <FieldRow label="Chain:">
        <Text bold>{{ base: 'Base', avalanche: 'Avalanche', ethereum: 'Ethereum' }[trust.chain] ?? trust.chain}</Text>
      </FieldRow>

      {/* ── Agent Address ──────────────────────────────────────── */}
      <FieldRow label="Agent:">
        <Text>{trust.address}</Text>
      </FieldRow>

      {/* ── VNS Name (optional) ────────────────────────────────── */}
      {trust.vnsName && (
        <FieldRow label="VNS Name:">
          <Text color="cyan">{trust.vnsName}</Text>
        </FieldRow>
      )}

      {/* ── Footer ─────────────────────────────────────────────── */}
      <Box justifyContent="center" marginTop={1}>
        <Text dimColor italic>
          Powered by Vaultfire Protocol {'\u2014'} theloopbreaker.com
        </Text>
      </Box>
    </Box>
  );
};

export default TrustPanel;
