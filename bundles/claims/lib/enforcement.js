'use strict';

/**
 * In-memory enforcement state.
 *
 * threats:     Map<enforcerId, Map<targetId, { meta, timeoutHandle }>>
 * submissions: Map<targetId,  { enforcerId, claimId, roomId,
 *                                duration, endsAt, timeoutHandle }>
 */

const threats     = new Map();
const submissions = new Map();

// ---------------------------------------------------------------------------
// Threats
// ---------------------------------------------------------------------------

/**
 * Register a threat with its metadata and response-window timeout.
 * @param {string} enforcerId
 * @param {string} targetId
 * @param {{ enforcerId, claimId, roomId, duration }} meta
 * @param {*} timeoutHandle
 */
function addThreat(enforcerId, targetId, meta, timeoutHandle) {
  if (!threats.has(enforcerId)) threats.set(enforcerId, new Map());
  threats.get(enforcerId).set(targetId, { meta, timeoutHandle });
}

/**
 * Cancel and remove a single threat.
 */
function removeThreat(enforcerId, targetId) {
  const mine = threats.get(enforcerId);
  if (!mine) return;
  const entry = mine.get(targetId);
  if (entry) clearTimeout(entry.timeoutHandle);
  mine.delete(targetId);
}

/**
 * Cancel and remove ALL threats issued by an enforcer.
 * Called when the enforcer dies.
 */
function removeAllThreats(enforcerId) {
  const mine = threats.get(enforcerId);
  if (!mine) return;
  for (const { timeoutHandle } of mine.values()) clearTimeout(timeoutHandle);
  threats.delete(enforcerId);
}

function hasThreat(enforcerId, targetId) {
  return threats.get(enforcerId)?.has(targetId) ?? false;
}

/**
 * Return the stored threat metadata for a specific enforcer → target pair.
 * Used by the submit command to retrieve duration/claimId without exposing
 * the raw map.
 * @returns {{ enforcerId, claimId, roomId, duration } | null}
 */
function getThreatMeta(enforcerId, targetId) {
  return threats.get(enforcerId)?.get(targetId)?.meta ?? null;
}

/**
 * Find any enforcer who has an active threat against a given target.
 * Returns { enforcerId, meta } or null.
 * Used by the submit command to find the pending demand without knowing
 * who issued it.
 */
function findThreatAgainst(targetId) {
  for (const [enforcerId, targetMap] of threats) {
    const entry = targetMap.get(targetId);
    if (entry) return { enforcerId, meta: entry.meta };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

function addSubmission(targetId, sub) {
  submissions.set(targetId, sub);
}

function removeSubmission(targetId) {
  const sub = submissions.get(targetId);
  if (!sub) return;
  if (sub.timeoutHandle) clearTimeout(sub.timeoutHandle);
  submissions.delete(targetId);
}

/**
 * Remove ALL submissions held by an enforcer.
 * Returns freed targetIds so callers can notify players.
 */
function removeSubmissionsByEnforcer(enforcerId) {
  const freed = [];
  for (const [targetId, sub] of submissions) {
    if (sub.enforcerId === enforcerId) {
      if (sub.timeoutHandle) clearTimeout(sub.timeoutHandle);
      submissions.delete(targetId);
      freed.push(targetId);
    }
  }
  return freed;
}

function getSubmission(targetId) {
  return submissions.get(targetId) ?? null;
}

function isSubmittedTo(targetId, enforcerId) {
  return submissions.get(targetId)?.enforcerId === enforcerId;
}

module.exports = {
  addThreat,
  removeThreat,
  removeAllThreats,
  hasThreat,
  getThreatMeta,
  findThreatAgainst,
  addSubmission,
  removeSubmission,
  removeSubmissionsByEnforcer,
  getSubmission,
  isSubmittedTo,
};