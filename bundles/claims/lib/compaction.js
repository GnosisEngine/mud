// bundles/ranvier-storage/lib/compaction.js
'use strict';

/**
 * Compaction — collapses the event log down to current graph state.
 *
 * The in-memory graph is already the fully resolved truth of every event
 * that has ever fired. Compaction simply serializes that truth as a set
 * of S (snapshot) opcodes into a new log file, then atomically swaps it
 * into place. The old event chain is discarded entirely.
 *
 * Compaction is called in two situations:
 *   1. On every boot, immediately after replay — the log resets to current
 *      state on each restart, bounding replay time to a single session.
 *   2. Mid-session, when log.needsCompaction() returns true — guards against
 *      unbounded log growth during a very long uptime.
 *
 * During mid-session compaction the active log keeps receiving appends
 * normally. The tmp file is written from the current graph snapshot, then
 * swapped in atomically. Any events that fired during the write are already
 * reflected in the graph — the next compaction or boot will capture them.
 */

/**
 * Compact the log to current graph state.
 *
 * @param {import('./log').Log}     log
 * @param {import('./graph').Graph} graph
 * @returns {Promise<void>}
 */
async function compact(log, graph) {
  const claims = graph.getAllClaims();
  const writer = log.openTmpWriter();

  for (const claim of claims) {
    writer.write('S', claim);
  }

  await writer.close();

  log.swap();

  console.log(`compaction: wrote ${claims.length} snapshot entries`);
}

module.exports = { compact };
