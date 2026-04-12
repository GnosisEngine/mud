// test/integration/vendor-npcs.test.js
'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  useSuite,
  assertOutput,
  spawnNpc,
  cleanupNpc,
  giveGold,
  giveItem,
} = require('../harness/helpers');

const { setup, teardown, ctx } = useSuite('limbo:white');

before(setup);
after(teardown);

// ---------------------------------------------------------------------------
// shop (list / buy / sell / value)
// ---------------------------------------------------------------------------

describe('shop command — no vendor in room', () => {
  it('rejects all subcommands without a vendor', async() => {
    const s = ctx.session();

    const listResult = await s.run('shop list');
    assertOutput(listResult, /aren't in a shop/i, 'list: should require a vendor');

    const buyResult = await s.run('buy sword');
    assertOutput(buyResult, /aren't in a shop/i, 'buy alias: should require a vendor');

    s.cleanup();
  });
});

describe('shop list', () => {
  let vendor = null;

  beforeEach(() => {
    vendor = spawnNpc(ctx.state, ctx.room, 'limbo:wallythewonderful');
  });

  afterEach(() => {
    cleanupNpc(ctx.state, vendor);
    vendor = null;
  });

  it('renders the item list', async() => {
    const s = ctx.session();
    const result = await s.run('shop list');
    assert.ok(result.lines.length > 0, 'should produce item listing output');
    s.cleanup();
  });

  it('includes at least one item name', async() => {
    const s = ctx.session();
    const result = await s.run('shop list');
    assertOutput(result, /sword|vest|shield|potion/i, 'should list known wares');
    s.cleanup();
  });

  it('returns item detail for a known item query', async() => {
    const s = ctx.session();
    const result = await s.run('shop list sword');
    assertOutput(result, /cost/i, 'detail view should include cost line');
    s.cleanup();
  });

  it('rejects an unknown item query', async() => {
    const s = ctx.session();
    const result = await s.run('shop list xyzzy_not_real');
    assertOutput(result, /don't carry/i, "should say vendor doesn't carry it");
    s.cleanup();
  });
});

describe('shop buy', () => {
  let vendor = null;

  beforeEach(() => {
    vendor = spawnNpc(ctx.state, ctx.room, 'limbo:wallythewonderful');
  });

  afterEach(() => {
    cleanupNpc(ctx.state, vendor);
    vendor = null;
  });

  it('requires an item argument', async() => {
    const s = ctx.session();
    const result = await s.run('shop buy');
    assertOutput(result, /what do you want to buy/i, 'should ask what to buy');
    s.cleanup();
  });

  it('rejects an unknown item', async() => {
    const s = ctx.session();
    giveGold(s.player, 9999);
    const result = await s.run('buy xyzzy_not_real');
    assertOutput(result, /don't carry/i, "should say vendor doesn't carry it");
    s.cleanup();
  });

  it('rejects purchase when player cannot afford it', async() => {
    const s = ctx.session();
    const result = await s.run('buy sword');
    assertOutput(result, /can't afford/i, 'should report insufficient gold');
    s.cleanup();
  });

  it('adds the item to inventory and deducts gold on success', async() => {
    const s = ctx.session();
    giveGold(s.player, 9999);

    const invBefore = s.player.inventory?.size ?? 0;
    const goldBefore = s.player.getMeta('currencies.gold');

    const result = await s.run('buy sword');

    assertOutput(result, /spend|purchase/i, 'should confirm the purchase');
    assert.ok(s.player.inventory.size > invBefore, 'item should be in inventory');
    assert.ok(
      (s.player.getMeta('currencies.gold') || 0) < goldBefore,
      'gold should have been deducted'
    );

    s.cleanup();
  });
});

describe('shop sell', () => {
  let vendor = null;

  beforeEach(() => {
    vendor = spawnNpc(ctx.state, ctx.room, 'limbo:wallythewonderful');
  });

  afterEach(() => {
    cleanupNpc(ctx.state, vendor);
    vendor = null;
  });

  it('requires an item argument', async() => {
    const s = ctx.session();
    const result = await s.run('shop sell');
    assertOutput(result, /what did you want to sell/i, 'should ask what to sell');
    s.cleanup();
  });

  it('rejects selling an item not in inventory', async() => {
    const s = ctx.session();
    const result = await s.run('sell xyzzy_not_real');
    assertOutput(result, /don't have that/i, 'should say item was not found');
    s.cleanup();
  });

  it('rejects selling an item that has no sellable metadata', async() => {
    const s = ctx.session();
    giveItem(ctx.state, s.player, 'limbo:sliceofcheese');

    const result = await s.run('sell cheese');
    assertOutput(result, /can't sell that item/i, 'should reject non-sellable items');
    s.cleanup();
  });

  it('credits gold and removes the item when selling succeeds', async() => {
    const s = ctx.session();
    giveItem(ctx.state, s.player, 'limbo:scraps');

    const goldBefore = s.player.getMeta('currencies.gold') || 0;
    const invBefore = s.player.inventory?.size ?? 0;

    const result = await s.run('sell scraps');

    assertOutput(result, /sell/i, 'should confirm the sale');
    assert.ok(
      (s.player.getMeta('currencies.gold') || 0) > goldBefore,
      'gold should have been credited'
    );
    assert.ok(
      (s.player.inventory?.size ?? 0) < invBefore,
      'item should be removed from inventory'
    );
    s.cleanup();
  });
});

describe('shop value / appraise', () => {
  let vendor = null;

  beforeEach(() => {
    vendor = spawnNpc(ctx.state, ctx.room, 'limbo:wallythewonderful');
  });

  afterEach(() => {
    cleanupNpc(ctx.state, vendor);
    vendor = null;
  });

  it('requires an item argument', async() => {
    const s = ctx.session();
    const result = await s.run('shop value');
    assertOutput(result, /what did you want me to appraise/i);
    s.cleanup();
  });

  it('rejects appraising an item not in inventory', async() => {
    const s = ctx.session();
    const result = await s.run('value xyzzy_not_real');
    assertOutput(result, /don't have that/i);
    s.cleanup();
  });

  it('quotes a price for a sellable item', async() => {
    const s = ctx.session();
    giveItem(ctx.state, s.player, 'limbo:scraps');

    const result = await s.run('value scraps');
    assertOutput(result, /give you/i, 'should quote an offer price');
    s.cleanup();
  });
});
