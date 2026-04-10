// bundles/commands/test/events.test.js
'use strict';

const assert = require('assert');
const { EVENTS, SCHEMA, emit } = require('../events');

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓  ${label}`);
    passed++;
  } catch (e) {
    console.error(`  ✗  ${label}`);
    console.error(`     ${e.message}`);
    failed++;
  }
}

function eq(a, b) { assert.deepStrictEqual(a, b); }

function makeEmitter() {
  const calls = [];
  return { emit: (...a) => calls.push(a), calls };
}

// ---------------------------------------------------------------------------

console.log('\n── EVENTS constants ──────────────────────────────');

test('EVENTS.GET is get',                       () => eq(EVENTS.GET,              'get'));
test('EVENTS.DROP is drop',                     () => eq(EVENTS.DROP,             'drop'));
test('EVENTS.PUT is put',                       () => eq(EVENTS.PUT,              'put'));
test('EVENTS.PLAYER_DROP_ITEM is playerDropItem', () => eq(EVENTS.PLAYER_DROP_ITEM, 'playerDropItem'));
test('EVENTS is frozen',                        () => assert.ok(Object.isFrozen(EVENTS)));

// ---------------------------------------------------------------------------

console.log('\n── SCHEMA entries ────────────────────────────────');

test('every EVENTS value has a SCHEMA entry', () => {
  for (const eventName of Object.values(EVENTS)) {
    assert.ok(SCHEMA[eventName], `missing schema entry for '${eventName}'`);
  }
});

test('get payload key is item',                        () => eq(Object.keys(SCHEMA[EVENTS.GET]),  ['emitter', 'payload', 'relay']));
test('get payload has item key',                       () => eq(Object.keys(SCHEMA[EVENTS.GET].payload), ['item']));
test('drop payload has item key',                      () => eq(Object.keys(SCHEMA[EVENTS.DROP].payload), ['item']));
test('put payload has item and toContainer keys',      () => eq(Object.keys(SCHEMA[EVENTS.PUT].payload), ['item', 'toContainer']));
test('playerDropItem payload has player and item keys',() => eq(Object.keys(SCHEMA[EVENTS.PLAYER_DROP_ITEM].payload), ['player', 'item']));

// ---------------------------------------------------------------------------

console.log('\n── emit.get (player perspective) ─────────────────');

test('emits get on player with item payload', () => {
  const player = makeEmitter();
  const item = { entityReference: 'zone:sword' };
  emit.get(player, item);
  eq(player.calls, [['get', { item }]]);
});

// ---------------------------------------------------------------------------

console.log('\n── emit.getOnItem (item perspective) ─────────────');

test('emits get on item with player payload', () => {
  const item = makeEmitter();
  const player = { name: 'Aldric' };
  emit.getOnItem(item, player);
  eq(item.calls, [['get', { player }]]);
});

test('getOnItem uses same event string as get', () => {
  const item = makeEmitter();
  emit.getOnItem(item, { name: 'Berta' });
  eq(item.calls[0][0], EVENTS.GET);
});

// ---------------------------------------------------------------------------

console.log('\n── emit.drop (player perspective) ────────────────');

test('emits drop on player with item payload', () => {
  const player = makeEmitter();
  const item = { entityReference: 'zone:torch' };
  emit.drop(player, item);
  eq(player.calls, [['drop', { item }]]);
});

// ---------------------------------------------------------------------------

console.log('\n── emit.dropOnItem (item perspective) ────────────');

test('emits drop on item with player payload', () => {
  const item = makeEmitter();
  const player = { name: 'Aldric' };
  emit.dropOnItem(item, player);
  eq(item.calls, [['drop', { player }]]);
});

test('dropOnItem uses same event string as drop', () => {
  const item = makeEmitter();
  emit.dropOnItem(item, { name: 'Berta' });
  eq(item.calls[0][0], EVENTS.DROP);
});

// ---------------------------------------------------------------------------

console.log('\n── emit.put (player perspective) ─────────────────');

test('emits put on player with item and toContainer payload', () => {
  const player = makeEmitter();
  const item      = { entityReference: 'zone:apple' };
  const container = { entityReference: 'zone:chest' };
  emit.put(player, item, container);
  eq(player.calls, [['put', { item, toContainer: container }]]);
});

// ---------------------------------------------------------------------------

console.log('\n── emit.putOnItem (item perspective) ─────────────');

test('emits put on item with player and toContainer payload', () => {
  const item      = makeEmitter();
  const player    = { name: 'Aldric' };
  const container = { entityReference: 'zone:chest' };
  emit.putOnItem(item, player, container);
  eq(item.calls, [['put', { player, toContainer: container }]]);
});

test('putOnItem uses same event string as put', () => {
  const item = makeEmitter();
  emit.putOnItem(item, { name: 'X' }, { entityReference: 'y' });
  eq(item.calls[0][0], EVENTS.PUT);
});

// ---------------------------------------------------------------------------

console.log('\n── emit.playerDropItem ────────────────────────────');

test('emits playerDropItem on npc with player and item payload', () => {
  const npc    = makeEmitter();
  const player = { name: 'Aldric' };
  const item   = { entityReference: 'zone:coin' };
  emit.playerDropItem(npc, player, item);
  eq(npc.calls, [['playerDropItem', { player, item }]]);
});

// ---------------------------------------------------------------------------

console.log('\n── payload object identity ───────────────────────');

test('item reference in get payload is not cloned', () => {
  const player = makeEmitter();
  const item = { entityReference: 'zone:sword' };
  emit.get(player, item);
  assert.ok(player.calls[0][1].item === item);
});

test('player reference in getOnItem payload is not cloned', () => {
  const item   = makeEmitter();
  const player = { name: 'Aldric' };
  emit.getOnItem(item, player);
  assert.ok(item.calls[0][1].player === player);
});

// ---------------------------------------------------------------------------

console.log('\n');
console.log(`  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
