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
 * Displays trust grade, reputation score, bond status, AIPartnershipBondsV2
 * partnership bond status, ERC-8004 identity registration, chain, agent
 * address, and optional VNS name — all colour-coded for quick visual parsing.
 *
 * When demo mode is active (`trust.demoMode === true`) the panel
 * renders a prominent magenta `[ DEMO MODE ]` banner at the top and
 * bottom so the result is never mistaken for real on-chain data.
 *
 * When the RPC endpoint is unreachable (`trust.rpcReachable === false`)
 * the panel renders a yellow warning banner instead of crashing.
 */
export const TrustPanel: React.FC<TrustPanelProps> = ({ trust }) => {
  const bond = statusIcon(trust.isBonded);
  const partnerBond = statusIcon(trust.partnershipBond);
  const identity = statusIcon(trust.erc8004Registered);
  const gc = gradeColor(trust.trustGrade);
  // Demo mode uses magenta border to visually distinguish from real data
  const borderColor = trust.demoMode ? 'magenta' : gc;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={borderColor}
      paddingX={2}
      paddingY={1}
    >
      {/* ── Demo Mode Banner (top) ─────────────────────────────── */}
      {trust.demoMode && (
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="magenta" inverse>
            {' \u2605 DEMO MODE \u2605 \u2014 This is NOT real on-chain data '}
          </Text>
        </Box>
      )}

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
        {trust.demoMode && (
          <Text color="magenta" dimColor>
            {' '}(demo)
          </Text>
        )}
      </FieldRow>

      {/* ── Reputation Score ───────────────────────────────────── */}
      <FieldRow label="Reputation Score:">
        <Text bold color={scoreColor(trust.reputationScore)}>
          {trust.reputationScore}
        </Text>
        <Text dimColor> / 100</Text>
        <Text color="gray"> ({trust.reputationTier})</Text>
      </FieldRow>

      {/* ── Accountability Bond ──────────────────────────────── */}
      <FieldRow label="Accountability Bond:">
        <Text color={bond.color}>{bond.symbol}</Text>
        <Text> {trust.isBonded ? 'Bonded' : 'Unbonded'}</Text>
        {process.env['VAULTFIRE_AGENT_KEY'] && (
          <Text color="green" dimColor> {"\u00B7"} bond creation enabled</Text>
        )}
      </FieldRow>

      {/* ── Partnership Bond (AIPartnershipBondsV2) ───────────── */}
      <FieldRow label="Partnership Bond:">
        <Text color={partnerBond.color}>{partnerBond.symbol}</Text>
        <Text> {trust.partnershipBond ? 'Active' : 'None'}</Text>
        {trust.partnershipBond && trust.bondPartner && (
          <Text dimColor> ({trust.bondPartner.slice(0, 10)}…)</Text>
        )}
        {process.env['VAULTFIRE_AGENT_KEY'] && (
          <Text color="green" dimColor> {"\u00B7"} bonding enabled</Text>
        )}
      </FieldRow>

      {/* ── ERC-8004 Identity ──────────────────────────────────── */}
      <FieldRow label="ERC-8004 Identity:">
        <Text color={identity.color}>{identity.symbol}</Text>
        <Text> {trust.erc8004Registered ? 'Registered' : 'Unregistered'}</Text>
      </FieldRow>

      {/* ── Chain ──────────────────────────────────────────────── */}
      <FieldRow label="Chain:">
        <Text bold>{{ base: 'Base', avalanche: 'Avalanche', arbitrum: 'Arbitrum', polygon: 'Polygon' }[trust.chain] ?? trust.chain}</Text>
      </FieldRow>

      {/* ── Agent Address ──────────────────────────────────────── */}
      <FieldRow label="Agent:">
        <Text>{trust.address}</Text>
      </FieldRow>

      {/* ── VNS Name (optional) ─────────────────────────────── */}
      {trust.vnsName && (
        <FieldRow label="VNS Name:">
          <Text color="cyan">{trust.vnsName}</Text>
        </FieldRow>
      )}

      {/* ── x402 Payments ───────────────────────────────────── */}
      <FieldRow label="x402 Payments:">
        {trust.x402.capable ? (
          <>
            <Text color="green">{"\u2714"}</Text>
            <Text> Enabled</Text>
            <Text dimColor> ({trust.x402.standard} {"\u00B7"} {trust.x402.currency})</Text>
            {process.env['VAULTFIRE_AGENT_KEY'] && (
              <Text color="green" dimColor> {"\u00B7"} signing active</Text>
            )}
          </>
        ) : (
          <>
            <Text color="red">{"\u2718"}</Text>
            <Text dimColor> Not configured</Text>
          </>
        )}
      </FieldRow>

      {/* ── XMTP Identity ───────────────────────────────────── */}
      <FieldRow label="XMTP Identity:">
        {trust.xmtp.reachable ? (
          <>
            <Text color="green">{"\u2714"}</Text>
            <Text> Reachable</Text>
            <Text dimColor> ({trust.xmtp.network})</Text>
            {process.env['VAULTFIRE_AGENT_KEY'] && (
              <Text color="green" dimColor> {"\u00B7"} messaging active</Text>
            )}
          </>
        ) : (
          <>
            <Text color="red">{"\u2718"}</Text>
            <Text dimColor> Not reachable</Text>
          </>
        )}
      </FieldRow>

      {/* ── Protocol Commitments Divider ─────────────────────── */}
      <Box marginTop={1} marginBottom={0}>
        <Text dimColor>{'─'.repeat(38)}</Text>
      </Box>

      {/* ── Protocol Commitments Header ────────────────────────── */}
      <Box marginBottom={0}>
        <Text bold dimColor>Protocol Commitments:</Text>
      </Box>

      {/* ── Anti-Surveillance ──────────────────────────────────── */}
      <FieldRow label="  Anti-Surveillance:">
        <Text color={statusIcon(trust.protocolCommitments.antiSurveillance).color}>
          {statusIcon(trust.protocolCommitments.antiSurveillance).symbol}
        </Text>
        <Text> {trust.protocolCommitments.antiSurveillance ? 'Enforced on-chain' : 'Inactive'}</Text>
      </FieldRow>

      {/* ── Privacy Guarantees ─────────────────────────────────── */}
      <FieldRow label="  Privacy Guarantees:">
        <Text color={statusIcon(trust.protocolCommitments.privacyGuarantees).color}>
          {statusIcon(trust.protocolCommitments.privacyGuarantees).symbol}
        </Text>
        <Text> {trust.protocolCommitments.privacyGuarantees ? 'Active' : 'Inactive'}</Text>
      </FieldRow>

      {/* ── Mission Enforcement ────────────────────────────────── */}
      <FieldRow label="  Mission Enforcement:">
        <Text color={statusIcon(trust.protocolCommitments.missionEnforcement).color}>
          {statusIcon(trust.protocolCommitments.missionEnforcement).symbol}
        </Text>
        <Text> {trust.protocolCommitments.missionEnforcement ? 'Active' : 'Inactive'}</Text>
      </FieldRow>

      {/* ── Demo Mode Banner (bottom) ──────────────────────────── */}
      {trust.demoMode && (
        <Box justifyContent="center" marginTop={1}>
          <Text color="magenta" dimColor>
            Demo mode \u2014 set demoMode: false in vaultfire.config.json for live on-chain data
          </Text>
        </Box>
      )}

      {/* ── Alpha notice (live mode only) ──────────────────────── */}
      {!trust.demoMode && (
        <Box justifyContent="center" marginTop={1}>
          <Text color="gray" dimColor>
            Vaultfire Protocol {'\u00B7'} Alpha {'\u00B7'} theloopbreaker.com
          </Text>
        </Box>
      )}

      {/* ── Footer (demo mode only) ────────────────────────────── */}
      {trust.demoMode && (
        <Box justifyContent="center" marginTop={0}>
          <Text dimColor italic>
            Powered by Vaultfire Protocol {'\u2014'} theloopbreaker.com
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default TrustPanel;
