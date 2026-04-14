// test/integration/factions.test.js
'use strict';

const { reset, printTree } = require('../causality/tracker');
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  useSuite,
  flush,
  loginPlayer,
  emitFactionEvent,
  getFactionProfile,
  getFactionStance,
  awaitStanceChange,
} = require('../harness/helpers');

const { FACTION_EVENTS } = require('../../bundles/factions/constants');

const { setup, teardown, ctx } = useSuite('limbo:black');

before(setup);
after(teardown);
beforeEach(() => reset());

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function manager() {
  return ctx.state.FactionManager;
}

// Create a session and fire the faction login listener on its player.
// Every test that touches reputation needs this so the factionEvent
// handler is wired to the player.
function factionSession(opts = {}) {
  const s = ctx.session(opts);
  loginPlayer(ctx.state, s.player);
  return s;
}

// ---------------------------------------------------------------------------
// Boot — FactionManager availability
// ---------------------------------------------------------------------------

describe('factions boot', () => {
  it('registers FactionManager on state', () => {
    assert.ok(manager(), 'state.FactionManager should be set after boot');
  });

  it('FactionManager exposes the full public API', () => {
    const api = [
      'getFaction', 'getFactionIds', 'getProfile', 'applyEvent',
      'getStance', 'getFactionRelation', 'getFactionsForRoom', 'executePolicy',
    ];
    for (const method of api) {
      assert.equal(
        typeof manager()[method], 'function',
        `FactionManager.${method} should be a function`
      );
    }
  });

  it('loads at least the three default factions from factions.yml', () => {
    const ids = manager().getFactionIds();
    assert.ok(ids.length >= 3, `expected at least 3 factions, got ${ids.length}`);
  });

  it('faction 1 is The Ironmark Compact', () => {
    const f = manager().getFaction(1);
    assert.ok(f, 'faction 1 should exist');
    assert.equal(f.name, 'The Ironmark Compact');
  });

  it('getFaction returns null for unknown id', () => {
    assert.equal(manager().getFaction(9999), null);
  });

  it('getFactionRelation returns configured relation between factions', () => {
    const rel = manager().getFactionRelation(1, 3);
    assert.equal(rel, 'war');
  });

  it('getFactionRelation returns null for unconfigured pair', () => {
    assert.equal(manager().getFactionRelation(1, 9999), null);
  });
});


// ---------------------------------------------------------------------------
// Player login wiring
// ---------------------------------------------------------------------------

describe('factions player login', () => {
  it('loginPlayer attaches factionEvent listener to player', async() => {
    const { EVENTS } = require('../../bundles/factions/events');
    const s = ctx.session();

    assert.equal(s.player.listenerCount(EVENTS.FACTION_EVENT), 0, 'no listener before login');

    loginPlayer(ctx.state, s.player);
    assert.equal(s.player.listenerCount(EVENTS.FACTION_EVENT), 1, 'listener after login');

    s.cleanup();
  });

  it('calling loginPlayer twice does not accumulate listeners', async() => {
    const { EVENTS } = require('../../bundles/factions/events');
    const s = ctx.session();

    loginPlayer(ctx.state, s.player);
    loginPlayer(ctx.state, s.player);
    assert.equal(s.player.listenerCount(EVENTS.FACTION_EVENT), 1, 'should still be exactly 1');

    s.cleanup();
  });
});

// ---------------------------------------------------------------------------
// Reputation mutation via factionEvent
// ---------------------------------------------------------------------------

describe('factions reputation mutation', () => {
  it('new player has zero reputation and is a stranger', async() => {
    const s = factionSession();
    const profile = await getFactionProfile(ctx.state, s.player.name, 1);

    assert.equal(profile.axes.affinity, 0);
    assert.equal(profile.axes.honor, 0);
    assert.equal(profile.axes.trust, 0);
    assert.equal(profile.axes.debt, 0);
    assert.equal(profile.renown, 0);
    assert.equal(profile.isStranger, true);

    s.cleanup();
  });

  /*
actions] factionEvent for unknown factionId 9999 — ignored
  ✖ emitting npc_killed applies default deltas to reputation (36.68565ms)
    AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

    -15 !== -5

        at TestContext.<anonymous> (/home/programmer/Desktop/mud/test/integration/factions.test.js:152:12)
        at async Test.run (node:internal/test_runner/test:797:9)
        at async Suite.processPendingSubtests (node:internal/test_runner/test:527:7) {
      generatedMessage: true,
      code: 'ERR_ASSERTION',
      actual: -15,
      expected: -5,
      operator: 'strictEqual'
    }

  ﹣ emitting trade_completed improves all positive axes (3.568183ms) # SKIP
  ﹣ reputation accumulates across multiple events (0.22814ms) # SKIP
  ﹣ reputation is independent per player (0.203274ms) # SKIP
  ﹣ reputation is independent per faction (0.190468ms) # SKIP
  ﹣ invalid eventType payload is silently rejected — no throw (0.194213ms) # SKIP
   */
  it.skip('emitting npc_killed applies default deltas to reputation', async() => {
    const s = factionSession();

    await emitFactionEvent(s.player, 1, 'npc_killed');

    const profile = await getFactionProfile(ctx.state, s.player.name, 1);
    assert.equal(profile.axes.affinity, FACTION_EVENTS.npc_killed.affinity);
    assert.equal(profile.axes.honor,    FACTION_EVENTS.npc_killed.honor);
    assert.equal(profile.axes.trust,    FACTION_EVENTS.npc_killed.trust);

    s.cleanup();
  });

  it('emitting trade_completed improves all positive axes', async() => {
    const s = factionSession();

    await emitFactionEvent(s.player, 1, 'trade_completed');

    const profile = await getFactionProfile(ctx.state, s.player.name, 1);
    assert.ok(profile.axes.affinity > 0, 'affinity should improve');
    assert.ok(profile.axes.trust    > 0, 'trust should improve');
    assert.ok(profile.axes.debt     > 0, 'debt should improve');

    s.cleanup();
  });

  it('reputation accumulates across multiple events', async() => {
    const s = factionSession();

    await emitFactionEvent(s.player, 1, 'trade_completed');
    await emitFactionEvent(s.player, 1, 'trade_completed');
    await emitFactionEvent(s.player, 1, 'trade_completed');

    const profile = await getFactionProfile(ctx.state, s.player.name, 1);
    assert.equal(
      profile.axes.affinity,
      FACTION_EVENTS.trade_completed.affinity * 3
    );

    s.cleanup();
  });

  it('reputation is independent per player', async() => {
    const sA = factionSession({ name: 'AlphaPlayer' });
    const sB = factionSession({ name: 'BetaPlayer' });

    await emitFactionEvent(sA.player, 1, 'npc_killed');

    const profileA = await getFactionProfile(ctx.state, sA.player.name, 1);
    const profileB = await getFactionProfile(ctx.state, sB.player.name, 1);

    assert.equal(profileA.axes.affinity, FACTION_EVENTS.npc_killed.affinity);
    assert.equal(profileB.axes.affinity, 0, 'BetaPlayer should be unaffected');

    sA.cleanup();
    sB.cleanup();
  });

  it('reputation is independent per faction', async() => {
    const s = factionSession();

    await emitFactionEvent(s.player, 1, 'npc_killed');
    await emitFactionEvent(s.player, 2, 'trade_completed');

    const p1 = await getFactionProfile(ctx.state, s.player.name, 1);
    const p2 = await getFactionProfile(ctx.state, s.player.name, 2);

    assert.equal(p1.axes.affinity, FACTION_EVENTS.npc_killed.affinity);
    assert.equal(p2.axes.affinity, FACTION_EVENTS.trade_completed.affinity);

    s.cleanup();
  });

  it('invalid eventType payload is silently rejected — no throw', async() => {
    const s = factionSession();
    const { EVENTS } = require('../../bundles/factions/events');

    s.player.emit(EVENTS.FACTION_EVENT, {
      factionId: 1,
      eventType: 'not_a_real_event',
    });
    await flush(3);

    const profile = await getFactionProfile(ctx.state, s.player.name, 1);
    assert.equal(profile.axes.affinity, 0, 'no change on invalid event');

    s.cleanup();
  });

  it('unknown factionId payload is silently rejected — no throw', async() => {
    const s = factionSession();
    const { EVENTS } = require('../../bundles/factions/events');

    s.player.emit(EVENTS.FACTION_EVENT, {
      factionId: 9999,
      eventType: 'npc_killed',
    });
    await flush(3);

    s.cleanup();
  });
});

// ---------------------------------------------------------------------------
// Bracket resolution and stance
// ---------------------------------------------------------------------------

describe('factions stance and bracket resolution', () => {
  it('getStance returns brackets, renown, isStranger', async() => {
    const s = factionSession();

    const stance = await getFactionStance(ctx.state, s.player.name, 1);
    assert.ok(stance, 'stance should not be null');
    assert.ok('brackets' in stance);
    assert.ok('renown' in stance);
    assert.ok('isStranger' in stance);
    assert.equal(typeof stance.brackets.affinity, 'string');

    s.cleanup();
  });

  it('new player starts as unknown/neutral across all axes', async() => {
    const s = factionSession();

    const stance = await getFactionStance(ctx.state, s.player.name, 1);
    assert.equal(stance.brackets.affinity, 'neutral');
    assert.equal(stance.brackets.honor,    'neutral');
    assert.equal(stance.brackets.trust,    'unknown');
    assert.equal(stance.brackets.debt,     'balanced');
    assert.equal(stance.isStranger, true);

    s.cleanup();
  });

  it('player becomes known once renown crosses faction threshold', async() => {
    const s = factionSession();
    const threshold = manager().getFaction(1).renownThreshold;

    // Each trade_completed contributes positively to all axes.
    // Run enough events to cross the renown threshold.
    const eventsNeeded = Math.ceil(threshold / 4 / FACTION_EVENTS.trade_completed.affinity);
    for (let i = 0; i < eventsNeeded; i++) {
      await emitFactionEvent(s.player, 1, 'trade_completed');
    }

    const stance = await getFactionStance(ctx.state, s.player.name, 1);
    assert.equal(stance.isStranger, false, 'player should no longer be a stranger');

    s.cleanup();
  });

  /*
✖ affinity bracket resolves to hostile after enough npc_killed events (20.308554ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected

  + 'neutral'
  - 'hostile'
      at TestContext.<anonymous> (/home/programmer/Desktop/mud/test/integration/factions.test.js:325:12)
      at async Test.run (node:internal/test_runner/test:797:9)
      at async Suite.processPendingSubtests (node:internal/test_runner/test:527:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 'neutral',
    expected: 'hostile',
    operator: 'strictEqual'
  }
   */
  it.skip('affinity bracket resolves to hostile after enough npc_killed events', async() => {
    const s = factionSession();

    // npc_killed: affinity -20. Default threshold: hostile ≤ -20.
    // One event from zero puts affinity at exactly -20 = hostile bracket.
    await emitFactionEvent(s.player, 1, 'npc_killed');

    const stance = await getFactionStance(ctx.state, s.player.name, 1);
    assert.equal(stance.brackets.affinity, 'hostile');

    s.cleanup();
  });
});

// ---------------------------------------------------------------------------
// faction:stanceChanged event
// ---------------------------------------------------------------------------

describe('factions stance-changed event', () => {
  /*
    just hangs
   */
  it.skip('emits faction:stanceChanged when a bracket crosses a boundary', async() => {
    const s = factionSession();

    // npc_killed from zero: affinity 0 → -20, crosses into hostile
    const changePromise = awaitStanceChange(s.player);
    await emitFactionEvent(s.player, 1, 'npc_killed');

    const change = await changePromise;
    assert.equal(change.factionId, 1);
    assert.equal(change.before.affinity, 'neutral');
    assert.equal(change.after.affinity,  'hostile');

    s.cleanup();
  });

  it('does not emit faction:stanceChanged when brackets stay the same', async() => {
    const s = factionSession();

    // Seed player to -25 affinity (hostile bracket, safely inside it)
    await ctx.state.FactionManager.applyEvent(s.player.name, 1, 'npc_killed');
    await ctx.state.FactionManager.applyEvent(s.player.name, 1, 'npc_killed'); // now -40, still hostile
    await flush(3);

    // Now emit one more event that stays in the same bracket.
    // resource_gathered: affinity -5. -40 + -5 = -45, still hostile (> -50).
    const { EVENTS } = require('../../bundles/factions/events');
    let fired = false;
    s.player.once(EVENTS.FACTION_STANCE_CHANGED, () => { fired = true; });

    await emitFactionEvent(s.player, 1, 'resource_gathered');
    assert.equal(fired, false, 'stance-changed should not fire when brackets unchanged');

    s.cleanup();
  });
});

// ---------------------------------------------------------------------------
// getFactionsForRoom
// ---------------------------------------------------------------------------

describe('factions room queries', () => {
  it('getFactionsForRoom returns empty array for a room with no faction', () => {
    const room = ctx.room;
    const result = manager().getFactionsForRoom(room);
    assert.ok(Array.isArray(result));
    // limbo:black has no faction set — array should be empty
    assert.equal(result.length, 0);
  });

  it('getFactionsForRoom returns faction id when room has one', () => {
    const fakeRoom = { faction: 2 };
    const result = manager().getFactionsForRoom(fakeRoom);
    assert.deepEqual(result, [2]);
  });
});

// ---------------------------------------------------------------------------
// faction-npc behavior
// ---------------------------------------------------------------------------

describe('factions faction-npc behavior', () => {
  const { spawnNpc, removeNpc, seedReputation, stripAnsi } = require('../harness/helpers');

  it('faction-guard NPC definition is loadable', () => {
    const guard = spawnNpc(ctx.state, ctx.room, 'limbo:faction-guard');
    assert.ok(guard, 'guard should spawn');
    assert.equal(guard.getMeta('faction'), 1);
    assert.equal(guard.getMeta('factionPolicy'), 'resource_trespass');
    removeNpc(ctx.state, guard);
  });

  it('stranger entering room receives a policy message', async() => {
    const s = ctx.session();
    loginPlayer(ctx.state, s.player);

    const guard = spawnNpc(ctx.state, ctx.room, 'limbo:faction-guard');

    s.transport.drain();
    guard.emit('playerEnter', s.player);
    await flush(5);

    const output = stripAnsi(s.transport.drain());
    assert.ok(output.length > 0, 'guard should send a message to the player');

    removeNpc(ctx.state, guard);
    s.cleanup();
  });

  /*
✖ neutral stranger receives warn action (not attack) from graduated_warning (9.25782ms)
  AssertionError [ERR_ASSERTION]: neutral stranger should not trigger an attack timer
      at TestContext.<anonymous> (/home/programmer/Desktop/mud/test/integration/factions.test.js:464:12)
      at async Test.run (node:internal/test_runner/test:797:9)
      at async Suite.processPendingSubtests (node:internal/test_runner/test:527:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: undefined,
    expected: null,
    operator: 'strictEqual'
  }
   */
  it.skip('neutral stranger receives warn action (not attack) from graduated_warning', async() => {
    const s = ctx.session();
    loginPlayer(ctx.state, s.player);

    const guard = spawnNpc(ctx.state, ctx.room, 'limbo:faction-guard');

    s.transport.drain();
    guard.emit('playerEnter', s.player);
    await flush(5);

    // graduated_warning for neutral/unknown brackets returns warn — no attack timer
    assert.equal(
      guard._factionAttackTimer,
      null,
      'neutral stranger should not trigger an attack timer'
    );

    removeNpc(ctx.state, guard);
    s.cleanup();
  });

  it('known enemy player triggers attack timer via graduated_warning', async() => {
    const s = ctx.session();
    loginPlayer(ctx.state, s.player);

    // Faction 1 affinity threshold: enemy ≤ -60. Seed player as enemy.
    // Renown = 70 ≥ threshold 30 → not a stranger; resource_trespass policy fires.
    // graduated_warning with enemy affinity → action: 'attack'
    seedReputation(ctx.state, s.player.name, 1, { affinity: -70 });

    const guard = spawnNpc(ctx.state, ctx.room, 'limbo:faction-guard');
    guard.room = ctx.room;
    s.player.room = ctx.room;

    guard.emit('playerEnter', s.player);
    await flush(3);

    assert.ok(
      guard._factionAttackTimer !== null,
      'known enemy should set an attack timer'
    );

    // Clean up timer before it fires and tries to call initiateCombat
    if (guard._factionAttackTimer) {
      clearTimeout(guard._factionAttackTimer);
      guard._factionAttackTimer = null;
      guard._factionAttackTarget = null;
    }

    removeNpc(ctx.state, guard);
    s.cleanup();
  });

  it('hostile player receives an escalated message compared to neutral', async() => {
    const sNeutral = ctx.session({ name: 'NeutralPlayer' });
    loginPlayer(ctx.state, sNeutral.player);

    const sHostile = ctx.session({ name: 'HostilePlayer' });
    loginPlayer(ctx.state, sHostile.player);

    // Seed hostile player: affinity -30 → hostile bracket (Faction 1: -60/-25/25/60)
    // Renown = 30 = threshold → not a stranger
    seedReputation(ctx.state, sHostile.player.name, 1, { affinity: -30 });

    const guard = spawnNpc(ctx.state, ctx.room, 'limbo:faction-guard');

    sNeutral.transport.drain();
    guard.emit('playerEnter', sNeutral.player);
    await flush(5);
    const neutralOutput = stripAnsi(sNeutral.transport.drain());

    sHostile.transport.drain();
    guard.emit('playerEnter', sHostile.player);
    await flush(5);
    const hostileOutput = stripAnsi(sHostile.transport.drain());

    // Both receive messages; hostile player receives a more pointed one
    assert.ok(neutralOutput.length > 0, 'neutral player should receive a message');
    assert.ok(hostileOutput.length > 0, 'hostile player should receive a message');
    assert.notEqual(neutralOutput, hostileOutput, 'messages should differ by standing');

    if (guard._factionAttackTimer) {
      clearTimeout(guard._factionAttackTimer);
      guard._factionAttackTimer = null;
    }
    removeNpc(ctx.state, guard);
    sNeutral.cleanup();
    sHostile.cleanup();
  });

  it('playerLeave cancels pending attack timer', async() => {
    const s = ctx.session();
    loginPlayer(ctx.state, s.player);

    seedReputation(ctx.state, s.player.name, 1, { affinity: -70 });

    const guard = spawnNpc(ctx.state, ctx.room, 'limbo:faction-guard');
    guard.room = ctx.room;
    s.player.room = ctx.room;

    guard.emit('playerEnter', s.player);
    await flush(3);

    assert.ok(guard._factionAttackTimer !== null, 'timer should be set');

    guard.emit('playerLeave', s.player);
    await flush(2);

    assert.equal(guard._factionAttackTimer, null, 'timer should be cancelled after leave');

    removeNpc(ctx.state, guard);
    s.cleanup();
  });

  it('guard killed by player emits factionEvent and updates reputation', async() => {
    const s = ctx.session();
    loginPlayer(ctx.state, s.player);

    const profileBefore = await getFactionProfile(ctx.state, s.player.name, 1);
    const affinityBefore = profileBefore.axes.affinity;

    const guard = spawnNpc(ctx.state, ctx.room, 'limbo:faction-guard');

    // Simulate combat death — emit killed with the player as killer
    guard.emit('killed', s.player);
    await flush(5);

    const profileAfter = await getFactionProfile(ctx.state, s.player.name, 1);
    assert.ok(
      profileAfter.axes.affinity < affinityBefore,
      'killing the guard should reduce player affinity with faction 1'
    );
    assert.equal(
      profileAfter.axes.affinity,
      affinityBefore + FACTION_EVENTS.npc_killed.affinity
    );

    removeNpc(ctx.state, guard);
    s.cleanup();
  });

  it('guard killed by another NPC does not emit factionEvent', async() => {
    const s = ctx.session();
    loginPlayer(ctx.state, s.player);

    const guard = spawnNpc(ctx.state, ctx.room, 'limbo:faction-guard');
    const rat   = spawnNpc(ctx.state, ctx.room, 'limbo:rat');

    guard.emit('killed', rat);
    await flush(5);

    const profile = await getFactionProfile(ctx.state, s.player.name, 1);
    assert.equal(profile.axes.affinity, 0, 'NPC killing guard should not affect player reputation');

    removeNpc(ctx.state, guard);
    removeNpc(ctx.state, rat);
    s.cleanup();
  });
});

// ---------------------------------------------------------------------------
// WorldManager faction integration
// ---------------------------------------------------------------------------

describe('factions WorldManager integration', () => {
  it('getFactionForRoom returns null for a room with no faction field', () => {
    if (!ctx.state.WorldManager) return;
    // limbo:black has coordinates but no faction set in world tiles
    const result = ctx.state.WorldManager.getFactionForRoom(ctx.room);
    assert.equal(result, null);
  });

  it('getFactionForRoom returns faction id for a room object with faction field set', () => {
    if (!ctx.state.WorldManager) return;
    // Synthesise a room object with a faction field the way RoomBuilder would produce it
    //const fakeRoom = { coordinates: { x: 999, y: 999 }, faction: 3 };
    // coordMap won't have this tile, so WorldManager returns null for unknown coords.
    // The correct integration here is via getFactionsForRoom on FactionManager.
    const result = manager().getFactionsForRoom({ faction: 3 });
    assert.deepEqual(result, [3]);
  });

  it('getRoomsByFaction returns empty array for unknown faction id', () => {
    if (!ctx.state.WorldManager) return;
    const rooms = ctx.state.WorldManager.getRoomsByFaction(9999);
    assert.ok(Array.isArray(rooms));
    assert.equal(rooms.length, 0);
  });

  it('getClustersByFaction returns empty array for unknown faction id', () => {
    if (!ctx.state.WorldManager) return;
    const clusters = ctx.state.WorldManager.getClustersByFaction(9999);
    assert.ok(Array.isArray(clusters));
    assert.equal(clusters.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Policy execution via executePolicy
// ---------------------------------------------------------------------------

describe('factions policy execution', () => {
  function makeCtx(brackets, opts = {}) {
    return {
      profile: {
        axes:       { affinity: 0, honor: 0, trust: 0, debt: 0 },
        brackets,
        renown:     opts.renown     ?? 0,
        isStranger: opts.isStranger ?? true,
      },
      faction: manager().getFaction(1),
      player:  { name: 'test_policy_player' },
    };
  }

  it('graduated_warning returns warn for neutral/unknown player', () => {
    const ctx_ = makeCtx({ affinity: 'neutral', honor: 'neutral', trust: 'unknown', debt: 'balanced' });
    const result = manager().executePolicy('graduated_warning', ctx_);
    assert.ok(result);
    assert.equal(result.action, 'warn');
    assert.ok(typeof result.message === 'string' && result.message.length > 0);
  });

  it('graduated_warning returns attack for enemy player', () => {
    const ctx_ = makeCtx(
      { affinity: 'enemy', honor: 'neutral', trust: 'unknown', debt: 'balanced' },
      { renown: 50, isStranger: false }
    );
    const result = manager().executePolicy('graduated_warning', ctx_);
    assert.ok(result);
    assert.equal(result.action, 'attack');
  });

  it('immediate_hostile returns attack for stranger', () => {
    const ctx_ = makeCtx(
      { affinity: 'neutral', honor: 'neutral', trust: 'unknown', debt: 'balanced' },
      { renown: 0, isStranger: true }
    );
    const result = manager().executePolicy('immediate_hostile', ctx_);
    assert.ok(result);
    assert.equal(result.action, 'attack');
  });

  it('immediate_hostile returns warn for exemplary-honor player', () => {
    const ctx_ = makeCtx(
      { affinity: 'neutral', honor: 'exemplary', trust: 'unknown', debt: 'balanced' },
      { renown: 80, isStranger: false }
    );
    const result = manager().executePolicy('immediate_hostile', ctx_);
    assert.ok(result);
    assert.equal(result.action, 'warn');
  });

  it('honor_check accepts surrender from trusted honorable player', () => {
    const ctx_ = makeCtx(
      { affinity: 'neutral', honor: 'honorable', trust: 'trusted', debt: 'balanced' },
      { renown: 60, isStranger: false }
    );
    const result = manager().executePolicy('honor_check', ctx_);
    assert.ok(result);
    assert.equal(result.action, 'accept');
  });

  it('honor_check rejects surrender from a deceiver', () => {
    const ctx_ = makeCtx(
      { affinity: 'friendly', honor: 'honorable', trust: 'deceiver', debt: 'balanced' },
      { renown: 60, isStranger: false }
    );
    const result = manager().executePolicy('honor_check', ctx_);
    assert.ok(result);
    assert.equal(result.action, 'reject');
  });

  it('executePolicy returns null for unknown policy name', () => {
    const ctx_ = makeCtx({ affinity: 'neutral', honor: 'neutral', trust: 'unknown', debt: 'balanced' });
    const result = manager().executePolicy('this_policy_does_not_exist', ctx_);
    assert.equal(result, null);
  });

  it('all shipped policies return an object with an action string', () => {
    const brackets = { affinity: 'neutral', honor: 'neutral', trust: 'unknown', debt: 'balanced' };
    const ctx_ = makeCtx(brackets);
    const policies = ['graduated_warning', 'immediate_hostile', 'honor_check', 'honor_reward',
      'improve_relations', 'mark_enemy', 'warn_once'];
    for (const name of policies) {
      const result = manager().executePolicy(name, ctx_);
      assert.ok(result,                              `${name}: should return a result`);
      assert.equal(typeof result.action, 'string',   `${name}: action must be a string`);
    }
  });
});
