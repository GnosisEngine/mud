// bundles/websocket-networking/test/EventRelay.test.js
'use strict';

const assert = require('assert');
const { build } = require('../lib/EventRelay');

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

const SCHEMA_A = {
  'experience':     { emitter: 'player', payload: { amount: 'number'  }, relay: true  },
  'move':           { emitter: 'player', payload: { roomExit: 'object' }, relay: false },
  'level':          { emitter: 'player', payload: {},                    relay: true  },
  'resource:rotted':{ emitter: 'player', payload: { rotted: 'object'  }, relay: true  },
};

const SCHEMA_B = {
  'questProgress':  { emitter: 'ranvier', payload: { quest: 'object' }, relay: true  },
  'currency':       { emitter: 'player',  payload: { currency: 'string', amount: 'number' }, relay: true },
  'dayPhaseChange': { emitter: 'time-state', payload: { phase: 'object' }, relay: true },
};

const SCHEMA_C = {
  'deathblow': { emitter: 'player', payload: { target: 'object', skipParty: 'boolean' }, relay: true  },
  'killed':    { emitter: 'player', payload: { killer: 'object' },                       relay: false },
};

console.log('\nbuild — filtering');

test('includes relay:true + emitter:player entries', () => {
  const listeners = build([SCHEMA_A]);
  assert.ok('experience' in listeners);
  assert.ok('level' in listeners);
  assert.ok('resource:rotted' in listeners);
});

test('excludes relay:false entries', () => {
  const listeners = build([SCHEMA_A]);
  assert.ok(!('move' in listeners));
});

test('excludes emitter:ranvier even when relay:true', () => {
  const listeners = build([SCHEMA_B]);
  assert.ok(!('questProgress' in listeners));
});

test('excludes emitter:time-state even when relay:true', () => {
  const listeners = build([SCHEMA_B]);
  assert.ok(!('dayPhaseChange' in listeners));
});

test('includes emitter:player relay:true from SCHEMA_B', () => {
  const listeners = build([SCHEMA_B]);
  assert.ok('currency' in listeners);
});

test('excludes relay:false from SCHEMA_C', () => {
  const listeners = build([SCHEMA_C]);
  assert.ok(!('killed' in listeners));
  assert.ok('deathblow' in listeners);
});

console.log('\nbuild — multiple schemas');

test('merges entries from multiple schemas', () => {
  const listeners = build([SCHEMA_A, SCHEMA_B, SCHEMA_C]);
  assert.ok('experience'      in listeners);
  assert.ok('level'           in listeners);
  assert.ok('resource:rotted' in listeners);
  assert.ok('currency'        in listeners);
  assert.ok('deathblow'       in listeners);
});

test('total count matches qualifying entries across all schemas', () => {
  const listeners = build([SCHEMA_A, SCHEMA_B, SCHEMA_C]);
  // experience, level, resource:rotted, currency, deathblow = 5
  eq(Object.keys(listeners).length, 5);
});

test('empty schema array returns empty listeners', () => {
  eq(build([]), {});
});

test('schema with no qualifying entries returns empty listeners', () => {
  const schema = {
    'move':          { emitter: 'player',     relay: false },
    'questProgress': { emitter: 'ranvier',    relay: true  },
    'dayPhase':      { emitter: 'time-state', relay: true  },
  };
  eq(build([schema]), {});
});

console.log('\nbuild — listener factory shape');

test('each value is a zero-arg factory returning a function', () => {
  const listeners = build([SCHEMA_A]);
  for (const factory of Object.values(listeners)) {
    eq(typeof factory, 'function');
    eq(factory.length, 0);
    eq(typeof factory(), 'function');
  }
});

console.log('\nbuild — listener runtime behaviour');

test('listener calls socket.command with sendData, eventName, payload', () => {
  const listeners = build([SCHEMA_A]);
  const commands = [];
  const ctx = {
    socket: { command: (...a) => commands.push(a) }
  };
  const payload = { amount: 100 };
  listeners['experience']().call(ctx, payload);
  eq(commands, [['sendData', 'experience', payload]]);
});

test('listener forwards payload by reference, not cloned', () => {
  const listeners = build([SCHEMA_A]);
  const commands = [];
  const ctx = { socket: { command: (...a) => commands.push(a) } };
  const payload = { rotted: { wood: 3 } };
  listeners['resource:rotted']().call(ctx, payload);
  assert.ok(commands[0][2] === payload);
});

test('zero-payload event forwards undefined payload', () => {
  const listeners = build([SCHEMA_A]);
  const commands = [];
  const ctx = { socket: { command: (...a) => commands.push(a) } };
  listeners['level']().call(ctx, undefined);
  eq(commands, [['sendData', 'level', undefined]]);
});

test('event name in sendData matches schema key exactly', () => {
  const listeners = build([SCHEMA_A]);
  const commands = [];
  const ctx = { socket: { command: (...a) => commands.push(a) } };
  listeners['resource:rotted']().call(ctx, {});
  eq(commands[0][1], 'resource:rotted');
});

test('each listener closes over its own event name', () => {
  const listeners = build([SCHEMA_A, SCHEMA_B]);
  const results = [];
  const ctx = { socket: { command: (_, name) => results.push(name) } };
  listeners['experience']().call(ctx, {});
  listeners['currency']().call(ctx, {});
  eq(results, ['experience', 'currency']);
});

test('later schema does not overwrite earlier for same event name', () => {
  const s1 = { 'ping': { emitter: 'player', relay: true, payload: {} } };
  const s2 = { 'ping': { emitter: 'player', relay: true, payload: {} } };
  const commands = [];
  const ctx = { socket: { command: (...a) => commands.push(a) } };
  const listeners = build([s1, s2]);
  listeners['ping']().call(ctx, { v: 1 });
  eq(commands.length, 1);
  eq(commands[0][1], 'ping');
});

console.log('\n');
console.log(`  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
