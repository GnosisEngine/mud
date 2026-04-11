// bundles/vendor-npcs/tests/layer2.test.js
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

const { getItems, findItem, groupByCategory, CATEGORY_TITLES } = require('../lib/VendorCatalog');
const { friendlyCurrencyName, makeTell } = require('../lib/VendorFormat');

// ---------------------------------------------------------------------------
// VendorCatalog — findItem
// ---------------------------------------------------------------------------

const mockItems = [
  { name: 'Iron Sword',  keywords: ['iron', 'sword'], type: ItemType.WEAPON,    entityReference: 'area:ironsword',  metadata: { quality: 'common' } },
  { name: 'Steel Sword', keywords: ['steel', 'sword'], type: ItemType.WEAPON,   entityReference: 'area:steelsword', metadata: { quality: 'uncommon' } },
  { name: 'Health Potion', keywords: ['health', 'potion'], type: ItemType.POTION, entityReference: 'area:healthpot', metadata: { quality: 'common' } },
  { name: 'Leather Vest', keywords: ['leather', 'vest', 'armor'], type: ItemType.ARMOR, entityReference: 'area:leathervest', metadata: { quality: 'common' } },
];

test('findItem returns the first matching item by keyword', () => {
  const result = findItem(mockItems, 'sword');
  assert.equal(result.name, 'Iron Sword');
});

test('findItem returns null (not false) when no match', () => {
  const result = findItem(mockItems, 'axe');
  assert.equal(result, null);
});

test('findItem handles dot-notation for nth match', () => {
  const result = findItem(mockItems, '2.sword');
  assert.equal(result.name, 'Steel Sword');
});

test('findItem returns null for out-of-range dot index', () => {
  const result = findItem(mockItems, '3.sword');
  assert.equal(result, null);
});

test('findItem matches by any keyword in the keyword list', () => {
  assert.equal(findItem(mockItems, 'potion')?.name, 'Health Potion');
  assert.equal(findItem(mockItems, 'health')?.name, 'Health Potion');
});

// ---------------------------------------------------------------------------
// VendorCatalog — groupByCategory
// ---------------------------------------------------------------------------

test('groupByCategory only includes categories with items', () => {
  const groups = groupByCategory(mockItems);
  const types = Object.keys(groups).map(Number);
  assert.ok(types.includes(ItemType.WEAPON), 'weapons present');
  assert.ok(types.includes(ItemType.POTION), 'potions present');
  assert.ok(types.includes(ItemType.ARMOR), 'armor present');
  assert.ok(!types.includes(ItemType.CONTAINER), 'containers absent');
  assert.ok(!types.includes(ItemType.OBJECT), 'objects absent');
});

test('groupByCategory buckets items under the correct type', () => {
  const groups = groupByCategory(mockItems);
  assert.equal(groups[ItemType.WEAPON].items.length, 2);
  assert.equal(groups[ItemType.POTION].items.length, 1);
  assert.equal(groups[ItemType.ARMOR].items.length, 1);
});

test('groupByCategory preserves the title for each bucket', () => {
  const groups = groupByCategory(mockItems);
  assert.equal(groups[ItemType.WEAPON].title, 'Weapons');
  assert.equal(groups[ItemType.POTION].title, 'Potions');
});

test('groupByCategory silently drops items of unknown type', () => {
  const withResource = [
    ...mockItems,
    { name: 'Coal', keywords: ['coal'], type: ItemType.RESOURCE, entityReference: 'area:coal', metadata: {} },
  ];
  const groups = groupByCategory(withResource);
  assert.ok(!groups[ItemType.RESOURCE], 'RESOURCE type must not appear');
});

test('groupByCategory returns empty object for empty input', () => {
  const groups = groupByCategory([]);
  assert.equal(Object.keys(groups).length, 0);
});

// ---------------------------------------------------------------------------
// VendorCatalog — CATEGORY_TITLES
// ---------------------------------------------------------------------------

test('CATEGORY_TITLES does not include RESOURCE type', () => {
  assert.equal(CATEGORY_TITLES[ItemType.RESOURCE], undefined);
});

test('CATEGORY_TITLES covers the four standard shop types', () => {
  assert.ok(CATEGORY_TITLES[ItemType.WEAPON]);
  assert.ok(CATEGORY_TITLES[ItemType.ARMOR]);
  assert.ok(CATEGORY_TITLES[ItemType.POTION]);
  assert.ok(CATEGORY_TITLES[ItemType.CONTAINER]);
  assert.ok(CATEGORY_TITLES[ItemType.OBJECT]);
});

// ---------------------------------------------------------------------------
// VendorCatalog — getItems
// ---------------------------------------------------------------------------

test('getItems returns one Item per entry in vendorItems', () => {
  const vendorItems = {
    'area:ironsword': { cost: 30, currency: 'gold' },
    'area:healthpot': { cost: 10, currency: 'gold' },
  };

  let createCount = 0;
  const mockState = {
    AreaManager: {
      getAreaByReference: ref => ({ ref }),
    },
    ItemFactory: {
      create: (_area, _ref) => {
        createCount++;
        return { name: 'MockItem', keywords: [], type: ItemType.OBJECT, entityReference: _ref, metadata: {} };
      },
    },
  };

  const items = getItems(mockState, vendorItems);
  assert.equal(items.length, 2);
  assert.equal(createCount, 2);
});

test('getItems passes the correct entity reference to ItemFactory', () => {
  const vendorItems = { 'limbo:trainingsword': { cost: 30, currency: 'gold' } };
  const seen = [];

  const mockState = {
    AreaManager: { getAreaByReference: ref => ({ ref }) },
    ItemFactory: { create: (_area, ref) => { seen.push(ref); return { type: ItemType.WEAPON, keywords: [], metadata: {}, entityReference: ref }; } },
  };

  getItems(mockState, vendorItems);
  assert.deepEqual(seen, ['limbo:trainingsword']);
});

// ---------------------------------------------------------------------------
// VendorFormat — friendlyCurrencyName
// ---------------------------------------------------------------------------

test('friendlyCurrencyName capitalises a single word', () => {
  assert.equal(friendlyCurrencyName('gold'), 'Gold');
});

test('friendlyCurrencyName splits underscores and capitalises each word', () => {
  assert.equal(friendlyCurrencyName('gold_coin'), 'Gold Coin');
  assert.equal(friendlyCurrencyName('silver_piece'), 'Silver Piece');
});

test('friendlyCurrencyName handles multiple underscores', () => {
  assert.equal(friendlyCurrencyName('rare_guild_token'), 'Rare Guild Token');
});

// ---------------------------------------------------------------------------
// VendorFormat — makeTell
// ---------------------------------------------------------------------------

test('makeTell returns a function', () => {
  const mockState = { ChannelManager: { get: () => ({ send: () => {} }) } };
  const tell = makeTell(mockState, {}, { name: 'Player' });
  assert.equal(typeof tell, 'function');
});

test('makeTell invokes channel send with vendor as sender and prefixed message', () => {
  const calls = [];
  const mockVendor = { name: 'Wally' };
  const mockPlayer = { name: 'Alice' };
  const mockState = {
    ChannelManager: {
      get: channel => ({
        send: (state, sender, msg) => calls.push({ channel, sender, msg }),
      }),
    },
  };

  const tell = makeTell(mockState, mockVendor, mockPlayer);
  tell("I don't have that.");

  assert.equal(calls.length, 1);
  assert.equal(calls[0].sender, mockVendor);
  assert.ok(calls[0].msg.startsWith('Alice '), 'message must be prefixed with player name');
  assert.ok(calls[0].msg.includes("I don't have that."));
});
