// bundles/quests/test/events.test.js
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


console.log('\n── EVENTS constants ──────────────────────────────');

test('EVENTS.QUEST_START is questStart',               () => eq(EVENTS.QUEST_START,         'questStart'));
test('EVENTS.QUEST_PROGRESS is questProgress',         () => eq(EVENTS.QUEST_PROGRESS,      'questProgress'));
test('EVENTS.QUEST_TURN_IN_READY is questTurnInReady', () => eq(EVENTS.QUEST_TURN_IN_READY, 'questTurnInReady'));
test('EVENTS.QUEST_COMPLETE is questComplete',         () => eq(EVENTS.QUEST_COMPLETE,      'questComplete'));
test('EVENTS.QUEST_REWARD is questReward',             () => eq(EVENTS.QUEST_REWARD,        'questReward'));
test('EVENTS.GOAL_PROGRESS is progress',               () => eq(EVENTS.GOAL_PROGRESS,       'progress'));
test('EVENTS.CURRENCY is currency',                    () => eq(EVENTS.CURRENCY,            'currency'));
test('EVENTS is frozen',                               () => assert.ok(Object.isFrozen(EVENTS)));


console.log('\n── SCHEMA entries ────────────────────────────────');

test('every EVENTS value has a SCHEMA entry', () => {
  for (const eventName of Object.values(EVENTS)) {
    assert.ok(SCHEMA[eventName], `missing schema entry for '${eventName}'`);
  }
});

test('quest* events have emitter: ranvier', () => {
  const engineEvents = [
    EVENTS.QUEST_START, EVENTS.QUEST_PROGRESS, EVENTS.QUEST_TURN_IN_READY,
    EVENTS.QUEST_COMPLETE, EVENTS.QUEST_REWARD,
  ];
  for (const name of engineEvents) {
    eq(SCHEMA[name].emitter, 'ranvier');
  }
});

test('GOAL_PROGRESS emitter is goal',    () => eq(SCHEMA[EVENTS.GOAL_PROGRESS].emitter, 'goal'));
test('CURRENCY emitter is player',       () => eq(SCHEMA[EVENTS.CURRENCY].emitter,      'player'));
test('QUEST_PROGRESS relay is true',     () => eq(SCHEMA[EVENTS.QUEST_PROGRESS].relay,  true));
test('CURRENCY relay is true',           () => eq(SCHEMA[EVENTS.CURRENCY].relay,        true));
test('QUEST_START relay is false',       () => eq(SCHEMA[EVENTS.QUEST_START].relay,     false));

test('CURRENCY payload keys are currency and amount', () => {
  eq(Object.keys(SCHEMA[EVENTS.CURRENCY].payload), ['currency', 'amount']);
});


console.log('\n── emit object — only currency helper generated ──');

test('emit.currency is a function',        () => assert.ok(typeof emit.currency === 'function'));
test('no emit.questStart generated',       () => eq(emit.questStart,       undefined));
test('no emit.questProgress generated',    () => eq(emit.questProgress,    undefined));
test('no emit.questTurnInReady generated', () => eq(emit.questTurnInReady, undefined));
test('no emit.questComplete generated',    () => eq(emit.questComplete,    undefined));
test('no emit.questReward generated',      () => eq(emit.questReward,      undefined));
test('no emit.goalProgress generated',     () => eq(emit.goalProgress,     undefined));


console.log('\n── emit.currency ─────────────────────────────────');

test('emits currency on player with currency and amount payload', () => {
  const player = makeEmitter();
  emit.currency(player, 'gold_coins', 100);
  eq(player.calls, [['currency', { currency: 'gold_coins', amount: 100 }]]);
});

test('amount zero is valid', () => {
  const player = makeEmitter();
  emit.currency(player, 'silver', 0);
  eq(player.calls, [['currency', { currency: 'silver', amount: 0 }]]);
});

test('currency string is not modified', () => {
  const player = makeEmitter();
  emit.currency(player, 'iron_ingots', 5);
  eq(player.calls[0][1].currency, 'iron_ingots');
});

test('fires on target player, not other emitters', () => {
  const a = makeEmitter();
  const b = makeEmitter();
  emit.currency(a, 'gold', 10);
  eq(a.calls.length, 1);
  eq(b.calls.length, 0);
});


console.log('\n');
console.log(`  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
