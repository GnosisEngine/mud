// bundles/vendor-npcs/tests/layer8.test.js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Config } = require('ranvier');

Config.load({
  dataDir: 'data',
  daysPerMonth: 28,
  mercMoveIntervalMs: 15000,
  mercFleeIntervalMs: 3000,
  mercMaxPenaltyStacks: 3,
});

const playerEvents = require('../player-events');

// ---------------------------------------------------------------------------
// Mock builders
// ---------------------------------------------------------------------------

function makeContractItem({ contractId, mercName, expiresAt, holderId = 'Alice' }) {
  const meta = { contract: { contractId, mercName, expiresAt, holderId } };
  return {
    uuid: `item-${contractId}`,
    name: `${mercName}'s Contract`,
    keywords: ['contract'],
    entityReference: 'mercs:merc-contract',
    getMeta: key => {
      const parts = key.split('.');
      let cur = meta;
      for (const p of parts) cur = cur?.[p];
      return cur;
    },
    metadata: meta,
  };
}

function makePlayer(items = []) {
  const inventory = new Map();
  const removed = [];
  const output = [];

  for (const item of items) {
    inventory.set(item.uuid, item);
  }

  const player = {
    name: 'Alice',
    inventory,
    _removed: removed,
    removeItem: item => {
      inventory.delete(item.uuid);
      removed.push(item);
    },
    getBroadcastTargets: () => [player],
    socket: { writable: true, write: msg => output.push(msg) },
    _output: output,
  };
  return player;
}

function makeState({ contracts = [], removedItems = [] } = {}) {
  return {
    MercenaryService: {
      getContractsByPlayer: _name => contracts,
    },
    ItemManager: {
      remove: item => removedItems.push(item),
    },
    ChannelManager: {
      get: () => ({ send: () => {} }),
    },
  };
}

function fireLogin(player, state) {
  const handler = playerEvents.listeners.login(state);
  handler.call(player);
}

// ---------------------------------------------------------------------------
// Guard clauses
// ---------------------------------------------------------------------------

test('login: no-op when MercenaryService is not on state', () => {
  const player = makePlayer();
  const state = { MercenaryService: null, ItemManager: { remove: () => {} } };

  assert.doesNotThrow(() => fireLogin(player, state));
});

test('login: no-op when player has no inventory', () => {
  const player = makePlayer();
  player.inventory = new Map(); // empty
  const removedItems = [];
  const state = makeState({ removedItems });

  fireLogin(player, state);

  assert.equal(removedItems.length, 0);
});

test('login: no-op when player inventory has no contract items', () => {
  const nonContractItem = {
    uuid: 'item-sword', name: 'Sword', keywords: [],
    getMeta: () => null, metadata: {},
  };
  const player = makePlayer([nonContractItem]);
  const removedItems = [];
  const state = makeState({ removedItems });

  fireLogin(player, state);

  assert.equal(removedItems.length, 0);
  assert.equal(player.inventory.size, 1); // sword still there
});

// ---------------------------------------------------------------------------
// Expired contract pruning
// ---------------------------------------------------------------------------

test('login: removes expired contract item from inventory', () => {
  const expiredItem = makeContractItem({
    contractId: 'mc_expired',
    mercName: 'Dead Merc',
    expiresAt: Date.now() - 1000,
  });
  const player = makePlayer([expiredItem]);
  const removedItems = [];
  const state = makeState({ removedItems });

  fireLogin(player, state);

  assert.equal(player.inventory.size, 0);
  assert.ok(player._removed.includes(expiredItem));
});

test('login: removes expired contract item from ItemManager', () => {
  const expiredItem = makeContractItem({
    contractId: 'mc_expired',
    mercName: 'Dead Merc',
    expiresAt: Date.now() - 1000,
  });
  const player = makePlayer([expiredItem]);
  const removedItems = [];
  const state = makeState({ removedItems });

  fireLogin(player, state);

  assert.ok(removedItems.includes(expiredItem));
});

test('login: notifies player when expired contract is removed', () => {
  const expiredItem = makeContractItem({
    contractId: 'mc_expired',
    mercName: 'Jan the Sellsword',
    expiresAt: Date.now() - 1000,
  });
  const player = makePlayer([expiredItem]);
  const state = makeState();

  fireLogin(player, state);

  const allOutput = player._output.join('');
  assert.ok(allOutput.includes('expired') || allOutput.includes('dissolved'));
});

test('login: does not remove a non-expired contract item', () => {
  const activeItem = makeContractItem({
    contractId: 'mc_active',
    mercName: 'Jan the Sellsword',
    expiresAt: Date.now() + 999999999,
  });
  const player = makePlayer([activeItem]);
  const removedItems = [];
  const state = makeState({ removedItems });

  fireLogin(player, state);

  assert.equal(player.inventory.size, 1);
  assert.equal(removedItems.length, 0);
});

test('login: handles multiple items — only removes expired ones', () => {
  const expiredItem = makeContractItem({
    contractId: 'mc_expired',
    mercName: 'Dead Merc',
    expiresAt: Date.now() - 1000,
  });
  const activeItem = makeContractItem({
    contractId: 'mc_active',
    mercName: 'Live Merc',
    expiresAt: Date.now() + 999999999,
  });
  const player = makePlayer([expiredItem, activeItem]);
  const removedItems = [];
  const state = makeState({ removedItems });

  fireLogin(player, state);

  assert.equal(player.inventory.size, 1);
  assert.ok(player.inventory.has(activeItem.uuid));
  assert.ok(!player.inventory.has(expiredItem.uuid));
});

// ---------------------------------------------------------------------------
// contractItem reconciliation (Case 2)
// ---------------------------------------------------------------------------

test('login: wires contractItem reference when entry exists with null contractItem', () => {
  const activeItem = makeContractItem({
    contractId: 'mc_active',
    mercName: 'Jan the Sellsword',
    expiresAt: Date.now() + 999999999,
  });
  const player = makePlayer([activeItem]);

  const entry = { contractId: 'mc_active', contractItem: null, holderId: 'Alice' };
  const state = makeState({ contracts: [entry] });

  fireLogin(player, state);

  assert.equal(entry.contractItem, activeItem);
});

test('login: updates holderId on the entry to the current player', () => {
  const activeItem = makeContractItem({
    contractId: 'mc_active',
    mercName: 'Jan the Sellsword',
    expiresAt: Date.now() + 999999999,
    holderId: 'OldHolder',
  });
  const player = makePlayer([activeItem]);

  const entry = { contractId: 'mc_active', contractItem: null, holderId: 'OldHolder' };
  const state = makeState({ contracts: [entry] });

  fireLogin(player, state);

  assert.equal(entry.holderId, 'Alice');
});

test('login: does not overwrite a contractItem reference that is already set', () => {
  const existingItemRef = { uuid: 'item-existing', getMeta: () => null };
  const activeItem = makeContractItem({
    contractId: 'mc_active',
    mercName: 'Jan the Sellsword',
    expiresAt: Date.now() + 999999999,
  });
  const player = makePlayer([activeItem]);

  const entry = { contractId: 'mc_active', contractItem: existingItemRef, holderId: 'Alice' };
  const state = makeState({ contracts: [entry] });

  fireLogin(player, state);

  // Already set — should not be overwritten
  assert.equal(entry.contractItem, existingItemRef);
});

// ---------------------------------------------------------------------------
// Case 3 — active contract not in registry (no-op)
// ---------------------------------------------------------------------------

test('login: no-op when active contract is not in the registry', () => {
  const activeItem = makeContractItem({
    contractId: 'mc_not_in_registry',
    mercName: 'Jan the Sellsword',
    expiresAt: Date.now() + 999999999,
  });
  const player = makePlayer([activeItem]);

  // Registry has no matching entry
  const state = makeState({ contracts: [] });
  const removedItems = [];
  state.ItemManager.remove = item => removedItems.push(item);

  fireLogin(player, state);

  // Item stays in inventory, nothing removed
  assert.equal(player.inventory.size, 1);
  assert.equal(removedItems.length, 0);
});
