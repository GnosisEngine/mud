// bundles/vendor-npcs/tests/layer6.test.js
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

const shopCommand  = require('../commands/shop').command;
const hireCommand  = require('../commands/hire').command;
const dismissCommand = require('../commands/dismiss').command;
const mercsCommand = require('../commands/mercs').command;

// ---------------------------------------------------------------------------
// Mock builders
// ---------------------------------------------------------------------------

function makePlayer(opts = {}) {
  const inventory = opts.inventory || new Map();
  const output = [];
  const p = {
    name: opts.name || 'Alice',
    output,
    room: opts.room || makeRoom([]),
    inventory,
    getMeta: () => null,
    setMeta: () => {},
    isInventoryFull: () => false,
    addItem: () => {},
    removeItem: () => {},
    save: () => {},
    getBroadcastTargets: () => [p],
    socket: { writable: true, write: msg => output.push(msg) },
  };
  return p;
}

function makeRoom(npcs = []) {
  return {
    npcs: new Set(npcs),
    players: new Set(),
    entityReference: 'test:room1',
  };
}

function makeVendorNpc(hasMercenary = false) {
  return {
    name: 'Test Vendor',
    keywords: ['vendor'],
    getMeta: key => {
      if (key === 'vendor') {
        return {
          items: { 'limbo:sword': { cost: 30, currency: 'gold' } },
          enterMessage: 'Hello!',
        };
      }
      if (key === 'mercenary' && hasMercenary) {
        return { name: 'Jan', homeRoomId: 'mapped:home', cost: 100, currency: 'gold', upkeepCost: 50, upkeepCurrency: 'gold' };
      }
      return null;
    },
    isNpc: true,
  };
}

function makeContractItem(contractId, mercName) {
  const meta = { contract: { contractId, mercName, holderId: 'Alice' } };
  return {
    uuid: `item-${contractId}`,
    getMeta: key => {
      const parts = key.split('.');
      let cur = meta;
      for (const p of parts) cur = cur?.[p];
      return cur;
    },
    metadata: meta,
  };
}

function makeState(opts = {}) {
  const hireCalls = [];
  const dismissCalls = [];
  return {
    _hireCalls: hireCalls,
    _dismissCalls: dismissCalls,
    getTarget: opts.getTarget || ((_room, _query, _types) => null),
    MercenaryService: opts.MercenaryService || {
      hire: (player, vendor, state) => hireCalls.push({ player, vendor }),
      dismiss: (contractId, state) => dismissCalls.push(contractId),
      getContractsByPlayer: _name => opts.contracts || [],
    },
    StorageManager: {
      store: {
        getClaimsByOwner: _name => opts.claims || [],
      },
    },
    RoomManager: {
      getRoom: id => opts.rooms?.[id] || null,
    },
    ChannelManager: {
      get: () => ({ send: () => {} }),
    },
    AreaManager: {
      getAreaByReference: () => ({}),
    },
    ItemFactory: {
      create: () => ({
        name: 'Mock Item', keywords: [], metadata: {}, entityReference: 'limbo:sword',
        type: 5, getMeta: () => null, hydrate: () => {},
      }),
    },
    ItemManager: { add: () => {}, remove: () => {} },
  };
}

// ---------------------------------------------------------------------------
// shop.js
// ---------------------------------------------------------------------------

test('shop: no vendor in room shows error', () => {
  const player = makePlayer({ room: makeRoom([]) });
  const state = makeState();

  shopCommand(state)('list', player, 'shop');

  assert.ok(player.output.some(o => o.includes("aren't in a shop")));
});

test('shop: invalid subcommand shows help hint', () => {
  const vendor = makeVendorNpc();
  const player = makePlayer({ room: makeRoom([vendor]) });
  const state = makeState();

  shopCommand(state)('frobnicate', player, 'shop');

  assert.ok(player.output.some(o => o.includes('help shops')));
});

test('shop: delegates buy subcommand (alias triggers buy prefix)', () => {
  const buyCalls = [];
  const vendor = makeVendorNpc();
  const player = makePlayer({ room: makeRoom([vendor]) });
  const state = makeState();

  // Patch VendorTransaction via require cache
  const VendorTransaction = require('../lib/VendorTransaction');
  const original = VendorTransaction.buy;
  VendorTransaction.buy = (s, v, p, args) => buyCalls.push(args);

  shopCommand(state)('sword', player, 'buy');

  VendorTransaction.buy = original;
  assert.equal(buyCalls.length, 1);
  assert.equal(buyCalls[0], 'sword');
});

test('shop: delegates sell subcommand', () => {
  const sellCalls = [];
  const vendor = makeVendorNpc();
  const player = makePlayer({ room: makeRoom([vendor]) });
  const state = makeState();

  const VendorTransaction = require('../lib/VendorTransaction');
  const original = VendorTransaction.sell;
  VendorTransaction.sell = (s, v, p, args) => sellCalls.push(args);

  shopCommand(state)('sell junk', player, 'shop');

  VendorTransaction.sell = original;
  assert.equal(sellCalls.length, 1);
  assert.equal(sellCalls[0], 'junk');
});

test('shop: delegates appraise alias to value subcommand', () => {
  const appraiseCalls = [];
  const vendor = makeVendorNpc();
  const player = makePlayer({ room: makeRoom([vendor]) });
  const state = makeState();

  const VendorTransaction = require('../lib/VendorTransaction');
  const original = VendorTransaction.appraise;
  VendorTransaction.appraise = (s, v, p, args) => appraiseCalls.push(args);

  shopCommand(state)('sword', player, 'appraise');

  VendorTransaction.appraise = original;
  assert.equal(appraiseCalls.length, 1);
});

// ---------------------------------------------------------------------------
// hire.js
// ---------------------------------------------------------------------------

test('hire: no args shows usage', () => {
  const player = makePlayer({ room: makeRoom([]) });
  const state = makeState();

  hireCommand(state)('', player);

  assert.ok(player.output.some(o => o.includes('Hire whom')));
});

test('hire: no mercenary vendor in room shows error', () => {
  const nonMercVendor = makeVendorNpc(false);
  const player = makePlayer({ room: makeRoom([nonMercVendor]) });
  const state = makeState();

  hireCommand(state)('jan', player);

  assert.ok(player.output.some(o => o.includes('no mercenary broker')));
  assert.equal(state._hireCalls.length, 0);
});

test('hire: target not found shows error', () => {
  const mercVendor = makeVendorNpc(true);
  const player = makePlayer({ room: makeRoom([mercVendor]) });
  const state = makeState({
    getTarget: () => null,
  });

  hireCommand(state)('nobody', player);

  assert.ok(player.output.some(o => o.includes("don't see anyone")));
  assert.equal(state._hireCalls.length, 0);
});

test('hire: target found but not the merc vendor shows error', () => {
  const mercVendor = makeVendorNpc(true);
  const someOtherNpc = { getMeta: () => null };
  const player = makePlayer({ room: makeRoom([mercVendor]) });
  const state = makeState({
    getTarget: () => someOtherNpc,
  });

  hireCommand(state)('jan', player);

  assert.ok(player.output.some(o => o.includes("don't see anyone")));
  assert.equal(state._hireCalls.length, 0);
});

test('hire: valid target delegates to MercenaryService.hire', () => {
  const mercVendor = makeVendorNpc(true);
  const player = makePlayer({ room: makeRoom([mercVendor]) });
  const state = makeState({
    getTarget: () => mercVendor,
  });

  hireCommand(state)('jan', player);

  assert.equal(state._hireCalls.length, 1);
  assert.equal(state._hireCalls[0].player, player);
  assert.equal(state._hireCalls[0].vendor, mercVendor);
});

// ---------------------------------------------------------------------------
// dismiss.js
// ---------------------------------------------------------------------------

test('dismiss: no args shows usage', () => {
  const player = makePlayer({ room: makeRoom([]) });
  const state = makeState();

  dismissCommand(state)('', player);

  assert.ok(player.output.some(o => o.includes('Dismiss which')));
});

test('dismiss: no inventory shows error', () => {
  const player = makePlayer({ room: makeRoom([]) });
  player.inventory = new Map(); // empty
  const state = makeState();

  dismissCommand(state)('jan', player);

  assert.ok(player.output.some(o => o.includes('no mercenary contracts')));
  assert.equal(state._dismissCalls.length, 0);
});

test('dismiss: no matching contract in inventory shows error', () => {
  const player = makePlayer({ room: makeRoom([]) });
  player.inventory.set('uuid-1', makeContractItem('mc_abc', 'Gregor the Grey'));
  const state = makeState({
    contracts: [{ contractId: 'mc_abc', mercName: 'Gregor the Grey', status: 'EN_ROUTE' }],
  });

  dismissCommand(state)('jan', player);

  assert.ok(player.output.some(o => o.includes('no contract for a mercenary matching')));
  assert.equal(state._dismissCalls.length, 0);
});

test('dismiss: merc already returning shows error', () => {
  const player = makePlayer({ room: makeRoom([]) });
  player.inventory.set('uuid-1', makeContractItem('mc_abc', 'Jan the Sellsword'));
  const state = makeState({
    contracts: [{ contractId: 'mc_abc', mercName: 'Jan the Sellsword', status: 'RETURNING' }],
  });

  dismissCommand(state)('jan', player);

  assert.ok(player.output.some(o => o.includes('already on their way home')));
  assert.equal(state._dismissCalls.length, 0);
});

test('dismiss: contract not in service registry shows error', () => {
  const player = makePlayer({ room: makeRoom([]) });
  player.inventory.set('uuid-1', makeContractItem('mc_abc', 'Jan the Sellsword'));
  const state = makeState({
    contracts: [], // not in registry
  });

  dismissCommand(state)('jan', player);

  assert.ok(player.output.some(o => o.includes('no longer active')));
  assert.equal(state._dismissCalls.length, 0);
});

test('dismiss: valid EN_ROUTE contract delegates to MercenaryService.dismiss', () => {
  const player = makePlayer({ room: makeRoom([]) });
  player.inventory.set('uuid-1', makeContractItem('mc_abc', 'Jan the Sellsword'));
  const state = makeState({
    contracts: [{ contractId: 'mc_abc', mercName: 'Jan the Sellsword', status: 'EN_ROUTE' }],
  });

  dismissCommand(state)('jan', player);

  assert.equal(state._dismissCalls.length, 1);
  assert.equal(state._dismissCalls[0], 'mc_abc');
});

test('dismiss: matches by partial merc name (case-insensitive)', () => {
  const player = makePlayer({ room: makeRoom([]) });
  player.inventory.set('uuid-1', makeContractItem('mc_abc', 'Jan the Sellsword'));
  const state = makeState({
    contracts: [{ contractId: 'mc_abc', mercName: 'Jan the Sellsword', status: 'STATIONED' }],
  });

  dismissCommand(state)('sellsword', player);

  assert.equal(state._dismissCalls.length, 1);
});

// ---------------------------------------------------------------------------
// mercs.js
// ---------------------------------------------------------------------------

test('mercs: no active contracts shows message', () => {
  const player = makePlayer({ room: makeRoom([]) });
  const state = makeState({ contracts: [], claims: [] });

  mercsCommand(state)('', player);

  assert.ok(player.output.some(o => o.includes('no active mercenary contracts')));
});

test('mercs: lists one entry with merc name and status', () => {
  const player = makePlayer({ room: makeRoom([]) });
  const state = makeState({
    contracts: [{
      contractId: 'mc_abc',
      mercName: 'Jan the Sellsword',
      status: 'STATIONED',
      targetRoomId: 'mapped:claim1',
      nextUpkeepAt: Date.now() + 3600000,
    }],
    claims: [{ roomId: 'mapped:claim1' }],
    rooms: { 'mapped:claim1': { title: 'A Crossroads', entityReference: 'mapped:claim1' } },
  });

  mercsCommand(state)('', player);

  const allOutput = player.output.join('');
  assert.ok(allOutput.includes('Jan the Sellsword'));
  assert.ok(allOutput.includes('Stationed'));
});

test('mercs: shows garrison count vs total claims', () => {
  const player = makePlayer({ room: makeRoom([]) });
  const state = makeState({
    contracts: [{
      contractId: 'mc_abc',
      mercName: 'Jan',
      status: 'EN_ROUTE',
      targetRoomId: 'mapped:c1',
      nextUpkeepAt: Date.now() + 3600000,
    }],
    claims: [{ roomId: 'mapped:c1' }, { roomId: 'mapped:c2' }],
    rooms: { 'mapped:c1': { title: 'Room 1' } },
  });

  mercsCommand(state)('', player);

  const allOutput = player.output.join('');
  assert.ok(allOutput.includes('1'), 'should show 1 active merc');
  assert.ok(allOutput.includes('2'), 'should show 2 total claims');
});

test('mercs: handles missing room for targetRoomId gracefully', () => {
  const player = makePlayer({ room: makeRoom([]) });
  const state = makeState({
    contracts: [{
      contractId: 'mc_abc',
      mercName: 'Jan',
      status: 'EN_ROUTE',
      targetRoomId: 'mapped:unknown',
      nextUpkeepAt: Date.now() + 3600000,
    }],
    claims: [],
    rooms: {},
  });

  assert.doesNotThrow(() => mercsCommand(state)('', player));
});
