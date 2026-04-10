// resources/test/layer4.test.js
'use strict';

const assert = require('assert');
const RS = require('../lib/ResourceSplit');
const RC = require('../lib/ResourceContainer');
const RD = require('../lib/ResourceDefinitions');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); console.log('  \u2713 ' + name); passed++; }
  catch (e) { console.error('  \u2717 ' + name); console.error('    ' + e.message); failed++; }
}

function mockEntity(strength, resources) {
  strength = strength || 10;
  resources = resources || {};
  const store = { resources: Object.assign({}, resources) };
  return {
    getMeta: function(key) { return key.split('.').reduce(function(o,k){ return o != null ? o[k] : undefined; }, store); },
    setMeta: function(key, val) {
      const parts = key.split('.');
      let cur = store;
      for (let i = 0; i < parts.length - 1; i++) { if (cur[parts[i]] == null) cur[parts[i]] = {}; cur = cur[parts[i]]; }
      cur[parts[parts.length - 1]] = val;
    },
    getAttribute: function(attr) { return attr === 'strength' ? strength : 0; }
  };
}

function mockRoom() { return { id: 'test:room' }; }
function makeSplitResolver(splits) { return function() { return splits; }; }
function makeDropTracker() {
  const drops = [];
  return { dropper: function(room, key, amount) { drops.push({ room: room, key: key, amount: amount }); }, drops: drops };
}

// alluvial_gold: 1.4kg, non-perishable
// honey: 19.8kg, perishable  (requires expiryTick)
// wool: 231kg, very heavy, perishable

const HONEY_EXPIRY = 9999;
const honeyTicks = { honey: HONEY_EXPIRY };

console.log('\nLayer 4 - ResourceSplit\n');
console.log('solo gather - no split resolver');

test('all yield goes to gatherer when no splitResolver provided', function() {
  const player = mockEntity(10);
  RS.distribute(player, mockRoom(), { alluvial_gold: 5 });
  assert.strictEqual(RC.getAmount(player, 'alluvial_gold'), 5);
});

test('all yield goes to gatherer when splitResolver returns null', function() {
  const player = mockEntity(10);
  RS.distribute(player, mockRoom(), { alluvial_gold: 5 }, { splitResolver: function() { return null; } });
  assert.strictEqual(RC.getAmount(player, 'alluvial_gold'), 5);
});

test('all yield goes to gatherer when splitResolver returns empty array', function() {
  const player = mockEntity(10);
  RS.distribute(player, mockRoom(), { alluvial_gold: 5 }, { splitResolver: function() { return []; } });
  assert.strictEqual(RC.getAmount(player, 'alluvial_gold'), 5);
});

test('multiple non-perishable resource types distributed to solo gatherer', function() {
  const player = mockEntity(10);
  RS.distribute(player, mockRoom(), { alluvial_gold: 4, rock_salt: 2 });
  assert.strictEqual(RC.getAmount(player, 'alluvial_gold'), 4);
  assert.strictEqual(RC.getAmount(player, 'rock_salt'), 2);
});

test('perishable distributed to solo gatherer with expiryTicks', function() {
  const player = mockEntity(10);
  RS.distribute(player, mockRoom(), { honey: 3 }, { expiryTicks: honeyTicks });
  assert.strictEqual(RC.getAmount(player, 'honey'), 3);
  assert.ok(RC.getHeld(player).honey.every(t => t === HONEY_EXPIRY));
});

test('perishable without expiryTicks is silently skipped', function() {
  const player = mockEntity(10);
  RS.distribute(player, mockRoom(), { honey: 3 });
  assert.strictEqual(RC.getAmount(player, 'honey'), 0);
});

console.log('\nsplit gather - basic distribution');

test('50/50 split distributes evenly', function() {
  const player = mockEntity(10);
  const other = mockEntity(10);
  RS.distribute(player, mockRoom(), { alluvial_gold: 10 }, {
    splitResolver: makeSplitResolver([{ entity: other, percentage: 0.5 }])
  });
  assert.strictEqual(RC.getAmount(player, 'alluvial_gold'), 5);
  assert.strictEqual(RC.getAmount(other, 'alluvial_gold'), 5);
});

test('70/30 split distributes correctly', function() {
  const player = mockEntity(10);
  const other = mockEntity(10);
  RS.distribute(player, mockRoom(), { alluvial_gold: 10 }, {
    splitResolver: makeSplitResolver([{ entity: other, percentage: 0.3 }])
  });
  assert.strictEqual(RC.getAmount(player, 'alluvial_gold'), 7);
  assert.strictEqual(RC.getAmount(other, 'alluvial_gold'), 3);
});

test('three-way split distributes to all parties', function() {
  const player = mockEntity(10);
  const b = mockEntity(10);
  const c = mockEntity(10);
  RS.distribute(player, mockRoom(), { alluvial_gold: 9 }, {
    splitResolver: makeSplitResolver([{ entity: b, percentage: 0.33 }, { entity: c, percentage: 0.33 }])
  });
  assert.ok(RC.getAmount(b, 'alluvial_gold') >= 2);
  assert.ok(RC.getAmount(c, 'alluvial_gold') >= 2);
});

test('mixed types split correctly including perishable', function() {
  const player = mockEntity(10);
  const other = mockEntity(10);
  RS.distribute(player, mockRoom(), { alluvial_gold: 10, honey: 2 }, {
    splitResolver: makeSplitResolver([{ entity: other, percentage: 0.5 }]),
    expiryTicks: honeyTicks,
  });
  assert.strictEqual(RC.getAmount(player, 'alluvial_gold'), 5);
  assert.strictEqual(RC.getAmount(other, 'alluvial_gold'), 5);
  assert.strictEqual(RC.getAmount(player, 'honey'), 1);
  assert.strictEqual(RC.getAmount(other, 'honey'), 1);
});

test('split perishable units all carry the correct expiry tick', function() {
  const player = mockEntity(10);
  const other = mockEntity(10);
  RS.distribute(player, mockRoom(), { honey: 4 }, {
    splitResolver: makeSplitResolver([{ entity: other, percentage: 0.5 }]),
    expiryTicks: honeyTicks,
  });
  assert.ok(RC.getHeld(player).honey.every(t => t === HONEY_EXPIRY));
  assert.ok(RC.getHeld(other).honey.every(t => t === HONEY_EXPIRY));
});

console.log('\nremainder handling');

test('floor remainder goes to gatherer', function() {
  const player = mockEntity(10);
  const other = mockEntity(10);
  RS.distribute(player, mockRoom(), { alluvial_gold: 3 }, {
    splitResolver: makeSplitResolver([{ entity: other, percentage: 0.5 }])
  });
  const p = RC.getAmount(player, 'alluvial_gold');
  const o = RC.getAmount(other, 'alluvial_gold');
  assert.strictEqual(p + o, 3);
  assert.ok(p >= o);
});

test('total distributed always equals total yielded', function() {
  const player = mockEntity(10);
  const b = mockEntity(10);
  const c = mockEntity(10);
  RS.distribute(player, mockRoom(), { alluvial_gold: 7, honey: 3 }, {
    splitResolver: makeSplitResolver([{ entity: b, percentage: 0.33 }, { entity: c, percentage: 0.33 }]),
    expiryTicks: honeyTicks,
  });
  const totalGold = RC.getAmount(player, 'alluvial_gold') + RC.getAmount(b, 'alluvial_gold') + RC.getAmount(c, 'alluvial_gold');
  const totalHoney = RC.getAmount(player, 'honey') + RC.getAmount(b, 'honey') + RC.getAmount(c, 'honey');
  assert.strictEqual(totalGold, 7);
  assert.strictEqual(totalHoney, 3);
});

console.log('\noverflow - recipient cannot carry');

test('overflow drops to room when gatherer is at capacity', function() {
  const player = mockEntity(7);
  RC.add(player, 'alluvial_gold', 50);
  const tracker = makeDropTracker();
  const room = mockRoom();
  RS.distribute(player, room, { alluvial_gold: 5 }, { roomDropper: tracker.dropper });
  assert.strictEqual(tracker.drops.length, 1);
  assert.strictEqual(tracker.drops[0].key, 'alluvial_gold');
  assert.strictEqual(tracker.drops[0].amount, 5);
  assert.strictEqual(tracker.drops[0].room, room);
});

test('overflow drops to room when split recipient is at capacity', function() {
  const player = mockEntity(10);
  const other = mockEntity(1);
  const tracker = makeDropTracker();
  RC.add(other, 'alluvial_gold', 7);
  RS.distribute(player, mockRoom(), { alluvial_gold: 10 }, {
    splitResolver: makeSplitResolver([{ entity: other, percentage: 0.5 }]),
    roomDropper: tracker.dropper
  });
  const dropped = tracker.drops.find(function(d) { return d.key === 'alluvial_gold'; });
  assert.ok(dropped, 'expected a room drop for alluvial_gold');
});

test('overflow roomDropper receives correct room reference', function() {
  const player = mockEntity(7);
  RC.add(player, 'alluvial_gold', 50);
  const tracker = makeDropTracker();
  const room = mockRoom();
  RS.distribute(player, room, { honey: 5 }, { roomDropper: tracker.dropper, expiryTicks: honeyTicks });
  for (const drop of tracker.drops) { assert.strictEqual(drop.room, room); }
});

test('no roomDropper calls when all recipients can carry', function() {
  const player = mockEntity(10);
  const other = mockEntity(10);
  const tracker = makeDropTracker();
  RS.distribute(player, mockRoom(), { alluvial_gold: 4 }, {
    splitResolver: makeSplitResolver([{ entity: other, percentage: 0.5 }]),
    roomDropper: tracker.dropper
  });
  assert.strictEqual(tracker.drops.length, 0);
});

console.log('\nedge cases');

test('zero-amount yields do not create ghost keys', function() {
  const player = mockEntity(10);
  RS.distribute(player, mockRoom(), { alluvial_gold: 0 });
  assert.ok(!('alluvial_gold' in RC.getHeld(player)));
});

test('empty yields object does nothing', function() {
  const player = mockEntity(10);
  RS.distribute(player, mockRoom(), {});
  assert.deepStrictEqual(RC.getHeld(player), {});
});

test('missing roomDropper option does not throw on overflow', function() {
  const player = mockEntity(7);
  RC.add(player, 'alluvial_gold', 50);
  assert.doesNotThrow(function() { RS.distribute(player, mockRoom(), { honey: 10 }, { expiryTicks: honeyTicks }); });
});

test('splitResolver is called with room argument', function() {
  const player = mockEntity(10);
  const room = mockRoom();
  let received = null;
  RS.distribute(player, room, { alluvial_gold: 4 }, { splitResolver: function(r) { received = r; return null; } });
  assert.strictEqual(received, room);
});

console.log('\nreturn value - allocation array');

test('solo gather returns array with one entry for gatherer', function() {
  const player = mockEntity(10);
  const result = RS.distribute(player, mockRoom(), { alluvial_gold: 5 });
  assert.ok(Array.isArray(result));
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].entity, player);
  assert.strictEqual(result[0].amounts.alluvial_gold, 5);
});

test('split gather returns entries for both gatherer and recipient', function() {
  const player = mockEntity(10);
  const other = mockEntity(10);
  const result = RS.distribute(player, mockRoom(), { alluvial_gold: 10 }, {
    splitResolver: makeSplitResolver([{ entity: other, percentage: 0.5 }])
  });
  assert.ok(Array.isArray(result));
  assert.strictEqual(result.length, 2);
  const pe = result.find(function(e) { return e.entity === player; });
  const oe = result.find(function(e) { return e.entity === other; });
  assert.ok(pe); assert.ok(oe);
  assert.strictEqual(pe.amounts.alluvial_gold, 5);
  assert.strictEqual(oe.amounts.alluvial_gold, 5);
});

test('allocation amounts for perishable reflect actual count added', function() {
  const player = mockEntity(10);
  const other = mockEntity(10);
  const result = RS.distribute(player, mockRoom(), { honey: 4 }, {
    splitResolver: makeSplitResolver([{ entity: other, percentage: 0.5 }]),
    expiryTicks: honeyTicks,
  });
  const pe = result.find(function(e) { return e.entity === player; });
  const oe = result.find(function(e) { return e.entity === other; });
  assert.strictEqual((pe ? pe.amounts.honey : 0) + (oe ? oe.amounts.honey : 0), 4);
});

test('overflow to room is NOT included in allocation', function() {
  const player = mockEntity(7);
  RC.add(player, 'alluvial_gold', 50);
  const tracker = makeDropTracker();
  const result = RS.distribute(player, mockRoom(), { alluvial_gold: 5 }, { roomDropper: tracker.dropper });
  assert.strictEqual(tracker.drops.length, 1);
  assert.strictEqual(result.length, 0);
});

test('empty yields returns empty array', function() {
  const player = mockEntity(10);
  assert.deepStrictEqual(RS.distribute(player, mockRoom(), {}), []);
});

test('allocation amounts reflect what was actually added including remainder', function() {
  const player = mockEntity(10);
  const other = mockEntity(10);
  const result = RS.distribute(player, mockRoom(), { alluvial_gold: 3 }, {
    splitResolver: makeSplitResolver([{ entity: other, percentage: 0.5 }])
  });
  const pe = result.find(function(e) { return e.entity === player; });
  const oe = result.find(function(e) { return e.entity === other; });
  const pAmt = pe ? pe.amounts.alluvial_gold : 0;
  const oAmt = oe ? oe.amounts.alluvial_gold : 0;
  assert.strictEqual(pAmt + oAmt, 3);
});

test('multiple resource types each appear in allocation', function() {
  const player = mockEntity(10);
  const result = RS.distribute(player, mockRoom(), { alluvial_gold: 3, honey: 1 }, { expiryTicks: honeyTicks });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].amounts.alluvial_gold, 3);
  assert.strictEqual(result[0].amounts.honey, 1);
});

console.log('\n' + (passed + failed) + ' tests: ' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed > 0 ? 1 : 0);
