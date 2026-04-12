// test/integration/vendor-npcs.test.js
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  useSuite,
  assertOutput,
  spawnBroker,
  cleanupNpc,
  patchClaims,
  patchNoClaims,
  restoreClaims,
  giveGold,
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
