// bundles/ranvier-storage/lib/codec.js
'use strict';

/**
 * Opcode table — single char, positional fields, space-separated, newline terminated.
 * Claims ONLY. Packages (collateral) are entirely SQLite's concern — see db.js.
 *
 * Nullable fields   → '-' sentinel
 * Timestamps        → base36 unix ms
 * Booleans          → 1 or 0
 * Tax rates         → plain integers
 *
 * LIVE EVENT OPCODES
 *
 * C  claimId roomId ownerId claimedAt taxRate taxRateLocked autoRenewEnabled
 *    CLAIM_CREATED
 *
 * T  claimId ownerId
 *    CLAIM_TRANSFERRED
 *
 * X  claimId
 *    CLAIM_EXPIRED — removes claim entirely
 *
 * O  claimId expiresAt
 *    CLAIM_EXPIRY_SET — arms logout timer (claimState → E)
 *                       expiresAt='-' disarms (claimState → A)
 *
 * E  claimId extensionExpiry
 *    CLAIM_EXTENDED — extension fee paid, updates extensionExpiry window
 *
 * R  claimId
 *    CLAIM_RATE_LOCKED — tax rate frozen on package funding, taxRateLocked → true
 *
  * SNAPSHOT OPCODES — written during compaction, replayed identically
  *
 * S  claimId roomId ownerId claimedAt taxRate taxRateLocked autoRenewEnabled
 *    extensionExpiry expiresAt
 *    SNAPSHOT_CLAIM — full claim state, one line per live claim
 *
 * claimState is DERIVED, never stored in the log
 *   A  active    — expiresAt is null
 *   E  expiring  — expiresAt is set
 *
 * Pledged / town-held states are package concerns — query SQLite directly.
 */

// Helpers

const nil = (v) => (v === null || v === undefined) ? '-' : v;
const ts36 = (v) => (v === null || v === undefined) ? '-' : v.toString(36);
const fromTs = (s) => s === '-' ? null : parseInt(s, 36);
const bool = (v) => v ? '1' : '0';
const fromBool = (s) => s === '1';

// Encoders — event object → log line string

const ENCODERS = {
  C: ({ id, roomId, ownerId, claimedAt, taxRate, taxRateLocked, autoRenewEnabled }) =>
    `C ${id} ${roomId} ${ownerId} ${ts36(claimedAt)} ${taxRate} ${bool(taxRateLocked)} ${bool(autoRenewEnabled)}`,

  T: ({ id, ownerId }) =>
    `T ${id} ${ownerId}`,

  X: ({ id }) =>
    `X ${id}`,

  O: ({ id, expiresAt }) =>
    `O ${id} ${ts36(expiresAt)}`,

  E: ({ id, extensionExpiry }) =>
    `E ${id} ${ts36(extensionExpiry)}`,

  R: ({ id }) =>
    `R ${id}`,

  S: ({ id, roomId, ownerId, claimedAt, taxRate, taxRateLocked,
    autoRenewEnabled, extensionExpiry, expiresAt }) =>
    `S ${id} ${roomId} ${ownerId} ${ts36(claimedAt)} ${taxRate} ` +
    `${bool(taxRateLocked)} ${bool(autoRenewEnabled)} ` +
    `${ts36(extensionExpiry)} ${ts36(expiresAt)}`,
};

// Decoders — positional fields → event data object

const DECODERS = {
  C: ([id, roomId, ownerId, claimedAt, taxRate, taxRateLocked, autoRenewEnabled]) => ({
    id, roomId, ownerId,
    claimedAt: fromTs(claimedAt),
    taxRate: Number(taxRate),
    taxRateLocked: fromBool(taxRateLocked),
    autoRenewEnabled: fromBool(autoRenewEnabled),
  }),

  T: ([id, ownerId]) => ({ id, ownerId }),

  X: ([id]) => ({ id }),

  O: ([id, expiresAt]) => ({ id, expiresAt: fromTs(expiresAt) }),

  E: ([id, extensionExpiry]) => ({ id, extensionExpiry: fromTs(extensionExpiry) }),

  R: ([id]) => ({ id }),

  S: ([id, roomId, ownerId, claimedAt, taxRate, taxRateLocked,
    autoRenewEnabled, extensionExpiry, expiresAt]) => ({
    id, roomId, ownerId,
    claimedAt: fromTs(claimedAt),
    taxRate: Number(taxRate),
    taxRateLocked: fromBool(taxRateLocked),
    autoRenewEnabled: fromBool(autoRenewEnabled),
    extensionExpiry: fromTs(extensionExpiry),
    expiresAt: fromTs(expiresAt),
  }),
};

// Public API

/**
 * Encode an event to a log line.
 * @param {string} opcode
 * @param {object} data
 * @returns {string} line with trailing newline, ready to append
 */
function encode(opcode, data) {
  const encoder = ENCODERS[opcode];
  if (!encoder) throw new Error(`codec: unknown opcode "${opcode}"`);
  return encoder(data) + '\n';
}

/**
 * Decode a single log line back to an event.
 * @param {string} line — raw line, may have trailing newline
 * @returns {{ opcode: string, data: object } | null}
 */
function decode(line) {
  const trimmed = line.trimEnd();
  if (!trimmed) return null;

  const opcode = trimmed[0];
  const fields = trimmed.length > 2 ? trimmed.slice(2).split(' ') : [];

  const decoder = DECODERS[opcode];
  if (!decoder) throw new Error(`codec: unknown opcode "${opcode}"`);

  return { opcode, data: decoder(fields) };
}

/**
 * Current unix ms timestamp.
 * Store layer passes this into event data before encoding.
 */
const now = () => Date.now();

module.exports = { encode, decode, now };
