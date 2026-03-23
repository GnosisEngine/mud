// bundles/ranvier-storage/lib/replay.js
'use strict';

const { Graph } = require('./graph');

/**
 * Replay engine — wires Log and Graph together at startup.
 * Reads every event from the log in order and applies it to the graph.
 * Called once during boot, before the store accepts any operations.
 *
 * Opcode → graph method mapping:
 *   C  →  graph.applyClaim
 *   T  →  graph.transferClaim
 *   X  →  graph.expireClaim
 *   O  →  graph.setClaimExpiry
 *   E  →  graph.extendClaim
 *   S  →  graph.applySnapshot
 *
 * Unknown opcodes are skipped with a warning rather than throwing —
 * a future opcode in an old log should not prevent the server from booting.
 */

const HANDLERS = {
  C: (graph, data) => graph.applyClaim(data),
  T: (graph, data) => graph.transferClaim(data),
  X: (graph, data) => graph.expireClaim(data),
  O: (graph, data) => graph.setClaimExpiry(data),
  E: (graph, data) => graph.extendClaim(data),
  R: (graph, data) => graph.lockClaimTaxRate(data),
  S: (graph, data) => graph.applySnapshot(data),
};

/**
 * Replay all events from the log into a fresh graph.
 *
 * @param {import('./log').Log} log
 * @returns {Promise<Graph>} fully hydrated graph
 */
async function replay(log) {
  const graph = new Graph();
  let   total = 0;
  let   skipped = 0;

  for await (const { opcode, data } of log.readAll()) {
    const handler = HANDLERS[opcode];

    if (!handler) {
      console.warn(`replay: unknown opcode "${opcode}" — skipping`);
      skipped++;
      continue;
    }

    handler(graph, data);
    total++;
  }

  console.log(`replay: applied ${total} events${skipped ? `, skipped ${skipped} unknown` : ''}`);

  return graph;
}

module.exports = { replay };