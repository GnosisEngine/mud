// bundles/vendor-npcs/tests/layer3.test.js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Config, ItemType } = require('ranvier');

Config.load({
  dataDir: 'data',
  daysPerMonth: 28,
  mercMoveIntervalMs: 15000,
  mercFleeIntervalMs: 3000,
  mercMaxPenaltyStacks: 3,
});

const { buy, sell, appraise } = require('../lib/VendorTransaction');
const { build, MERC_ENTITY_REF } = require('../lib/ContractFactory');
const { TWO_GAME_MONTHS_MS } = require('../constants');

// ---------------------------------------------------------------------------
// Shared mock builders
// ---------------------------------------------------------------------------

function makePlayer(overrides = {}) {
  const meta = {};
  const inventory = new Map();
  const player = {
    name: 'TestPlayer',
    _saved: false,
    getMeta: key => {
      const parts = key.split('.');
      let cur = meta;
      for (const p of parts) cur = cur?.[p];
      return cur;
    },
    setMeta: (key, val) => {
      const parts = key.split('.');
      let cur = meta;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = val;
    },
    isInventoryFull: () => false,
    addItem: item => inventory.set(item.entityReference, item),
    removeItem: item => inventory.delete(item.entityReference),
    save: () => { player._saved = true; },
    inventory,
    getBroadcastTargets: () => [player],
    socket: { writable: true, write: () => {} },
    ...overrides,
  };
  return player;
}

function makeItem(overrides = {}) {
  return {
    entityReference: 'area:ironsword',
    name: 'Iron Sword',
    keywords: ['iron', 'sword'],
    type: ItemType.WEAPON,
    metadata: { quality: 'common' },
    getMeta: key => overrides._meta?.[key],
    hydrate: () => {},
    ...overrides,
  };
}

function makeVendorConfig(itemOverrides = {}) {
  return {
    items: {
      'area:ironsword': { cost: 30, currency: 'gold', ...itemOverrides },
    },
  };
}

function makeVendor(vendorConfig) {
  return {
    getMeta: () => vendorConfig,
    getBroadcastTargets: () => [],
  };
}

function makeState({ tellCalls = [], fullInventory = false } = {}) {
  const state = {
    _itemsAdded: [],
    _itemsRemoved: [],
    ChannelManager: {
      get: () => ({
        send: (_state, _sender, msg) => tellCalls.push(msg),
      }),
    },
    ItemManager: {
      add: item => state._itemsAdded.push(item),
      remove: item => state._itemsRemoved.push(item),
    },
    AreaManager: {
      getAreaByReference: ref => ({ ref }),
    },
    ItemFactory: {
      create: (_area, ref) => makeItem({ entityReference: ref }),
    },
  };
  return state;
}

// ---------------------------------------------------------------------------
// VendorTransaction — buy
// ---------------------------------------------------------------------------

test('buy: no args fires tell and returns without mutation', () => {
  const tells = [];
  const player = makePlayer();
  const state = makeState({ tellCalls: tells });
  const vendor = makeVendor(makeVendorConfig());

  buy(state, vendor, player, '');

  assert.equal(tells.length, 1);
  assert.ok(tells[0].includes('what do you want to buy'));
  assert.equal(player._saved, false);
});

test('buy: unknown item fires tell and returns without mutation', () => {
  const tells = [];
  const player = makePlayer();
  player.setMeta('currencies.gold', 100);
  const state = makeState({ tellCalls: tells });
  const vendor = makeVendor(makeVendorConfig());

  buy(state, vendor, player, 'axe');

  assert.equal(tells.length, 1);
  assert.ok(tells[0].includes("won't check in back"));
  assert.equal(player.getMeta('currencies.gold'), 100);
  assert.equal(player._saved, false);
});

test('buy: insufficient currency fires tell and does not deduct', () => {
  const tells = [];
  const player = makePlayer();
  player.setMeta('currencies.gold', 10);
  const state = makeState({ tellCalls: tells });
  const vendor = makeVendor(makeVendorConfig());

  buy(state, vendor, player, 'sword');

  assert.equal(tells.length, 1);
  assert.ok(tells[0].includes("can't afford"));
  assert.equal(player.getMeta('currencies.gold'), 10);
});

test('buy: zero currency (getMeta returns undefined) is treated as 0', () => {
  const tells = [];
  const player = makePlayer();
  const state = makeState({ tellCalls: tells });
  const vendor = makeVendor(makeVendorConfig());

  buy(state, vendor, player, 'sword');

  assert.equal(tells.length, 1);
  assert.ok(tells[0].includes("can't afford"));
});

test('buy: full inventory fires tell and does not deduct', () => {
  const tells = [];
  const player = makePlayer({ isInventoryFull: () => true });
  player.setMeta('currencies.gold', 100);
  const state = makeState({ tellCalls: tells });
  const vendor = makeVendor(makeVendorConfig());

  buy(state, vendor, player, 'sword');

  assert.equal(tells.length, 1);
  assert.ok(tells[0].includes('carry any more'));
  assert.equal(player.getMeta('currencies.gold'), 100);
});

test('buy: valid purchase deducts currency and adds item to inventory', () => {
  const player = makePlayer();
  player.setMeta('currencies.gold', 100);
  const state = makeState();
  const vendor = makeVendor(makeVendorConfig());

  buy(state, vendor, player, 'sword');

  assert.equal(player.getMeta('currencies.gold'), 70);
  assert.equal(player.inventory.size, 1);
  assert.equal(state._itemsAdded.length, 1);
  assert.equal(player._saved, true);
});

test('buy: valid purchase uses dot-notation to pick nth match', () => {
  const player = makePlayer();
  player.setMeta('currencies.gold', 200);

  const vendorConfig = {
    items: {
      'area:ironsword': { cost: 30, currency: 'gold' },
      'area:steelsword': { cost: 50, currency: 'gold' },
    },
  };

  const state = makeState();
  state.ItemFactory.create = (_area, ref) => makeItem({
    entityReference: ref,
    name: ref === 'area:steelsword' ? 'Steel Sword' : 'Iron Sword',
    keywords: ref === 'area:steelsword' ? ['steel', 'sword'] : ['iron', 'sword'],
  });

  const vendor = makeVendor(vendorConfig);

  buy(state, vendor, player, '2.sword');

  assert.equal(player.getMeta('currencies.gold'), 150);
});

// ---------------------------------------------------------------------------
// VendorTransaction — sell
// ---------------------------------------------------------------------------

test('sell: no args fires tell and returns without mutation', () => {
  const tells = [];
  const player = makePlayer();
  const state = makeState({ tellCalls: tells });
  const vendor = makeVendor(makeVendorConfig());

  sell(state, vendor, player, '');

  assert.equal(tells.length, 1);
  assert.ok(tells[0].includes('want to sell'));
});

test('sell: item not in inventory fires message to player', () => {
  const player = makePlayer();
  const state = makeState();
  const vendor = makeVendor(makeVendorConfig());

  sell(state, vendor, player, 'axe');

  assert.equal(state._itemsRemoved.length, 0);
  assert.equal(player.getMeta('currencies.gold'), undefined);
});

test('sell: non-sellable item fires message and does not add currency', () => {
  const item = makeItem({ getMeta: () => null });
  const player = makePlayer();
  player.inventory.set(item.entityReference, item);
  const state = makeState();
  const vendor = makeVendor(makeVendorConfig());

  sell(state, vendor, player, 'sword');

  assert.equal(player.getMeta('currencies.gold'), undefined);
  assert.equal(state._itemsRemoved.length, 0);
});

test('sell: uncommon item without confirm fires message and does not sell', () => {
  const item = makeItem({
    metadata: { quality: 'uncommon' },
    getMeta: key => key === 'sellable' ? { currency: 'gold', value: 20 } : null,
  });
  const player = makePlayer();
  player.inventory.set(item.entityReference, item);
  const state = makeState();
  const vendor = makeVendor(makeVendorConfig());

  sell(state, vendor, player, 'sword');

  assert.equal(player.getMeta('currencies.gold'), undefined);
  assert.equal(state._itemsRemoved.length, 0);
});

test('sell: uncommon item with confirm sells successfully', () => {
  const item = makeItem({
    metadata: { quality: 'uncommon' },
    getMeta: key => key === 'sellable' ? { currency: 'gold', value: 20 } : null,
  });
  const player = makePlayer();
  player.inventory.set(item.entityReference, item);
  const state = makeState();
  const vendor = makeVendor(makeVendorConfig());

  sell(state, vendor, player, 'sword sure');

  assert.equal(player.getMeta('currencies.gold'), 20);
  assert.equal(state._itemsRemoved.length, 1);
  assert.equal(player.inventory.size, 0);
});

test('sell: common item sells without confirm and removes from inventory', () => {
  const item = makeItem({
    getMeta: key => key === 'sellable' ? { currency: 'gold', value: 15 } : null,
  });
  const player = makePlayer();
  player.inventory.set(item.entityReference, item);
  const state = makeState();
  const vendor = makeVendor(makeVendorConfig());

  sell(state, vendor, player, 'sword');

  assert.equal(player.getMeta('currencies.gold'), 15);
  assert.equal(state._itemsRemoved.length, 1);
  assert.equal(player.inventory.size, 0);
});

test('sell: accumulates currency on repeated sales', () => {
  const item = makeItem({
    getMeta: key => key === 'sellable' ? { currency: 'gold', value: 15 } : null,
  });
  const player = makePlayer();
  player.setMeta('currencies.gold', 10);
  player.inventory.set(item.entityReference, item);
  const state = makeState();
  const vendor = makeVendor(makeVendorConfig());

  sell(state, vendor, player, 'sword');

  assert.equal(player.getMeta('currencies.gold'), 25);
});

// ---------------------------------------------------------------------------
// VendorTransaction — appraise
// ---------------------------------------------------------------------------

test('appraise: no args fires tell', () => {
  const tells = [];
  const player = makePlayer();
  const state = makeState({ tellCalls: tells });
  const vendor = makeVendor(makeVendorConfig());

  appraise(state, vendor, player, '');

  assert.equal(tells.length, 1);
  assert.ok(tells[0].includes('appraise'));
});

test('appraise: item not in inventory fires message to player', () => {
  const tells = [];
  const player = makePlayer();
  const state = makeState({ tellCalls: tells });
  const vendor = makeVendor(makeVendorConfig());

  appraise(state, vendor, player, 'axe');

  assert.equal(tells.length, 0);
});

test('appraise: non-sellable item fires message to player without tell', () => {
  const tells = [];
  const item = makeItem({ getMeta: () => null });
  const player = makePlayer();
  player.inventory.set(item.entityReference, item);
  const state = makeState({ tellCalls: tells });
  const vendor = makeVendor(makeVendorConfig());

  appraise(state, vendor, player, 'sword');

  assert.equal(tells.length, 0);
});

test('appraise: valid item fires tell with the sell value', () => {
  const tells = [];
  const item = makeItem({
    getMeta: key => key === 'sellable' ? { currency: 'gold', value: 42 } : null,
  });
  const player = makePlayer();
  player.inventory.set(item.entityReference, item);
  const state = makeState({ tellCalls: tells });
  const vendor = makeVendor(makeVendorConfig());

  appraise(state, vendor, player, 'sword');

  assert.equal(tells.length, 1);
  assert.ok(tells[0].includes('42'));
  assert.ok(tells[0].includes('Gold'));
});

// ---------------------------------------------------------------------------
// ContractFactory — build
// ---------------------------------------------------------------------------

const sampleMercConfig = {
  name: 'Jan the Sellsword',
  homeRoomId: 'mapped:soldierquarters',
  tier: 1,
  cost: 100,
  currency: 'gold',
  upkeepCost: 50,
  upkeepCurrency: 'gold',
};

test('build: returns all required contract fields', () => {
  const contract = build(sampleMercConfig, 'Alice');
  const required = ['contractId', 'mercRef', 'mercName', 'homeRoomId', 'issuedAt',
    'nextUpkeepAt', 'expiresAt', 'holderId', 'tier', 'upkeepCost', 'upkeepCurrency', 'status'];
  for (const field of required) {
    assert.ok(field in contract, `missing field: ${field}`);
  }
});

test('build: contractId starts with mc_', () => {
  const { contractId } = build(sampleMercConfig, 'Alice');
  assert.ok(contractId.startsWith('mc_'), `expected mc_ prefix, got: ${contractId}`);
});

test('build: contractId is unique across calls', () => {
  const ids = new Set(Array.from({ length: 20 }, () => build(sampleMercConfig, 'Alice').contractId));
  assert.equal(ids.size, 20);
});

test('build: nextUpkeepAt is exactly TWO_GAME_MONTHS_MS after issuedAt', () => {
  const contract = build(sampleMercConfig, 'Alice');
  assert.equal(contract.nextUpkeepAt - contract.issuedAt, TWO_GAME_MONTHS_MS);
});

test('build: expiresAt equals nextUpkeepAt at creation', () => {
  const contract = build(sampleMercConfig, 'Alice');
  assert.equal(contract.expiresAt, contract.nextUpkeepAt);
});

test('build: status is EN_ROUTE', () => {
  const { status } = build(sampleMercConfig, 'Alice');
  assert.equal(status, 'EN_ROUTE');
});

test('build: holderId matches the supplied playerId', () => {
  const { holderId } = build(sampleMercConfig, 'Alice');
  assert.equal(holderId, 'Alice');
});

test('build: mercRef is the stub entity reference', () => {
  const { mercRef } = build(sampleMercConfig, 'Alice');
  assert.equal(mercRef, MERC_ENTITY_REF);
  assert.equal(mercRef, 'vendor-npcs:mercenary');
});

test('build: mercName, homeRoomId, tier, upkeepCost, upkeepCurrency map from config', () => {
  const contract = build(sampleMercConfig, 'Alice');
  assert.equal(contract.mercName, 'Jan the Sellsword');
  assert.equal(contract.homeRoomId, 'mapped:soldierquarters');
  assert.equal(contract.tier, 1);
  assert.equal(contract.upkeepCost, 50);
  assert.equal(contract.upkeepCurrency, 'gold');
});

test('build: tier defaults to 1 when absent from config', () => {
  const configNoTier = { ...sampleMercConfig };
  delete configNoTier.tier;
  const { tier } = build(configNoTier, 'Alice');
  assert.equal(tier, 1);
});
