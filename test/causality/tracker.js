// tests/causality/CausalityTracker.js
'use strict';

const _edges = [];

function record(parent, child) {
  _edges.push({ parent, child });
}

function reset() {
  _edges.length = 0;
}

function getLog() {
  return [..._edges];
}

function buildNode(node, childrenOf) {
  return {
    ref: node.ref,
    event: node.event,
    ts: node.ts,
    children: (childrenOf.get(node) || []).map(c => buildNode(c, childrenOf)),
  };
}

function printTree() {
  const childrenOf = new Map();
  const roots = [];

  for (const { parent, child } of _edges) {
    if (!childrenOf.has(child)) childrenOf.set(child, []);
    if (parent === null) {
      roots.push(child);
    } else {
      if (!childrenOf.has(parent)) childrenOf.set(parent, []);
      childrenOf.get(parent).push(child);
    }
  }

  return JSON.stringify(roots.map(r => buildNode(r, childrenOf)), null, 2);
}

module.exports = { record, reset, getLog, printTree };
