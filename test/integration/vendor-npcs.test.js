// test/integration/vendor-npcs.test.js
'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  useSuite,
  assertOutput,
  assertNoOutput,
  spawnNpc,
  spawnBroker,
  cleanupNpc,
  patchClaims,
  patchNoClaims,
  restoreClaims,
  giveGold,
  giveItem,
} = require('../harness/helpers');

const { setup, teardown, ctx } = useSuite('limbo:white');

before(setup);
after(teardown);

// ---------------------------------------------------------------------------
// hire
// ---------------------------------------------------------------------------

describe('hire command', () => {
  it('requires an argument', async() => {
    const s = ctx.session();
    const result = await s.run('hire');
    assertOutput(result, /hire whom/i, 'should prompt for a target');
    s.cleanup();
  });

  it('rejects when no broker is in the room', async() => {
    const s = ctx.session();
    const result = await s.run('hire broker');
    assertOutput(result, /no mercenary broker here/i);
    s.cleanup();
  });

  it('rejects when the player has no territory claims', async() => {
    const s = ctx.session();
    const broker = spawnBroker(ctx.state, ctx.room);
    giveGold(s.player, 500);
    patchNoClaims(ctx.state);

    const result = await s.run('hire broker');
    assertOutput(result, /territory claim/i, 'should require at least one claim');

    restoreClaims(ctx.state);
    cleanupNpc(ctx.state, broker);
    s.cleanup();
  });

  it('rejects when the player cannot afford the hire cost', async() => {
    const s = ctx.session();
    const broker = spawnBroker(ctx.state, ctx.room);
    patchClaims(ctx.state, 'limbo:black');

    const result = await s.run('hire broker');
    assertOutput(result, /cannot afford/i, 'should report insufficient funds');

    restoreClaims(ctx.state);
    cleanupNpc(ctx.state, broker);
    s.cleanup();
  });

  it('succeeds and puts a contract in the player inventory', async() => {
    const s = ctx.session();
    const broker = spawnBroker(ctx.state, ctx.room);
    patchClaims(ctx.state, 'limbo:black');
    giveGold(s.player, 500);

    const inventoryBefore = s.player.inventory?.size ?? 0;
    const result = await s.run('hire broker');

    assertOutput(result, /en route/i, 'should confirm the merc is dispatched');
    assert.ok(
      (s.player.inventory?.size ?? 0) > inventoryBefore,
      'contract item should be added to inventory'
    );

    restoreClaims(ctx.state);
    cleanupNpc(ctx.state, broker);
    s.cleanup();
  });

  it('deducts the hire cost from player gold', async() => {
    const s = ctx.session();
    const broker = spawnBroker(ctx.state, ctx.room);
    patchClaims(ctx.state, 'limbo:black');
    giveGold(s.player, 200);

    await s.run('hire broker');

    const goldAfter = s.player.getMeta('currencies.gold') || 0;
    assert.ok(goldAfter < 200, 'hire cost should have been deducted');

    restoreClaims(ctx.state);
    cleanupNpc(ctx.state, broker);
    s.cleanup();
  });

  it('rejects a second hire when all claims are already garrisoned', async() => {
    const s = ctx.session();
    const broker = spawnBroker(ctx.state, ctx.room);
    patchClaims(ctx.state, 'limbo:black');
    giveGold(s.player, 500);

    await s.run('hire broker');

    giveGold(s.player, 500);
    patchClaims(ctx.state, 'limbo:black');
    const result = await s.run('hire broker');
    assertOutput(
      result,
      /garrisoned|more mercenaries than you have/i,
      'should block hire when all claims are covered'
    );

    restoreClaims(ctx.state);
    cleanupNpc(ctx.state, broker);
    s.cleanup();
  });
});

// ---------------------------------------------------------------------------
// mercs
// ---------------------------------------------------------------------------

describe('mercs command', () => {
  it('reports no active contracts when none exist', async() => {
    const s = ctx.session();
    const result = await s.run('mercs');
    assertOutput(result, /no active mercenary contracts/i);
    s.cleanup();
  });

  it('lists the contract after a successful hire', async() => {
    const s = ctx.session();
    const broker = spawnBroker(ctx.state, ctx.room);
    patchClaims(ctx.state, 'limbo:black');
    giveGold(s.player, 500);

    await s.run('hire broker');
    const result = await s.run('mercs');

    assertOutput(result, /en route/i, 'should list the merc as EN_ROUTE');
    assertOutput(result, /[A-Z][a-z]+ [A-Z][a-z]+/, 'should show a generated First Last name');

    restoreClaims(ctx.state);
    cleanupNpc(ctx.state, broker);
    s.cleanup();
  });

  it('shows garrison count relative to claim count', async() => {
    const s = ctx.session();
    const broker = spawnBroker(ctx.state, ctx.room);
    patchClaims(ctx.state, 'limbo:black');
    giveGold(s.player, 500);

    await s.run('hire broker');
    const result = await s.run('mercs');

    assertOutput(result, /garrisoned/i, 'should show garrison slot summary');

    restoreClaims(ctx.state);
    cleanupNpc(ctx.state, broker);
    s.cleanup();
  });
});

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

// ---------------------------------------------------------------------------
// dismiss
// ---------------------------------------------------------------------------

describe('dismiss command', () => {
  it('requires an argument', async() => {
    const s = ctx.session();
    const result = await s.run('dismiss');
    assertOutput(result, /dismiss which/i, 'should prompt for a target');
    s.cleanup();
  });

  it('rejects when the player holds no matching contract', async() => {
    const s = ctx.session();
    const result = await s.run('dismiss nobody');
    assertOutput(result, /no contract for|no mercenary contracts/i, 'should say no matching contract found');
    s.cleanup();
  });

  it('transitions a hired merc to returning when dismissed', async() => {
    const s = ctx.session();
    const broker = spawnBroker(ctx.state, ctx.room);
    patchClaims(ctx.state, 'limbo:black');
    giveGold(s.player, 500);

    await s.run('hire broker');

    // Derive the first word of the generated merc name from the contract item
    let mercFirstName = null;
    for (const [, item] of s.player.inventory) {
      const contract = item.getMeta ? item.getMeta('contract') : null;
      if (contract && contract.mercName) {
        mercFirstName = contract.mercName.split(' ')[0].toLowerCase();
        break;
      }
    }
    assert.ok(mercFirstName, 'contract item should carry a mercName');

    const result = await s.run(`dismiss ${mercFirstName}`);
    assertOutput(result, /returning home/i, 'should confirm the merc is returning');

    restoreClaims(ctx.state);
    cleanupNpc(ctx.state, broker);
    s.cleanup();
  });
});
