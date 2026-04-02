// bundles/world/test/layer8.test.js
'use strict';

const assert = require('assert');
const { serializeManifest, serializeRooms, quoteIfNeeded } = require('../lib/YamlSerializer');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

function makeRoom(overrides = {}) {
  return {
    id:          'r_42_17',
    title:       'Bogland',
    coordinates: [42, 17, 0],
    metadata:    { terrain: 'bog', worldCoords: [42, 17] },
    description: 'Dark water seeps between hummocks of peat moss.',
    ...overrides,
  };
}

console.log('\nLayer 8 — YamlSerializer\n');

// ---------------------------------------------------------------------------

console.log('quoteIfNeeded');

test('plain word is unquoted', () => {
  assert.strictEqual(quoteIfNeeded('Bogland'), 'Bogland');
});

test('empty string returns double-quoted empty', () => {
  assert.strictEqual(quoteIfNeeded(''), '""');
});

test('string with ": " is quoted', () => {
  const result = quoteIfNeeded('key: value');
  assert.ok(result.startsWith('"') && result.endsWith('"'));
});

test('string starting with # is quoted', () => {
  const result = quoteIfNeeded('#comment');
  assert.ok(result.startsWith('"'));
});

test('string with newline is quoted', () => {
  const result = quoteIfNeeded('line1\nline2');
  assert.ok(result.startsWith('"'));
});

test('string starting with - is quoted', () => {
  const result = quoteIfNeeded('- item');
  assert.ok(result.startsWith('"'));
});

test('string starting with { is quoted', () => {
  assert.ok(quoteIfNeeded('{foo}').startsWith('"'));
});

test('string starting with [ is quoted', () => {
  assert.ok(quoteIfNeeded('[list]').startsWith('"'));
});

test('em-dash in cluster name does not need quoting', () => {
  const result = quoteIfNeeded('Crimson — Main Outpost');
  assert.strictEqual(result, 'Crimson — Main Outpost');
});

test('cross-area roomId with colon is quoted', () => {
  const result = quoteIfNeeded('c13:r_42_17');
  assert.ok(result.startsWith('"') && result.endsWith('"'));
});

test('quoted string wraps in double quotes', () => {
  const result = quoteIfNeeded('needs: quoting');
  assert.ok(result.startsWith('"'));
  assert.ok(result.endsWith('"'));
});

test('embedded double quotes are escaped', () => {
  const result = quoteIfNeeded('say "hello"');
  assert.ok(result.includes('\\"'));
});

// ---------------------------------------------------------------------------

console.log('\nserializeManifest');

test('outputs title line', () => {
  const out = serializeManifest({ title: 'Oak Wilds', zoneType: 'SUPPLY' });
  assert.ok(out.includes('title:'));
  assert.ok(out.includes('Oak Wilds'));
});

test('outputs zoneType when present', () => {
  const out = serializeManifest({ title: 'Oak Wilds', zoneType: 'SUPPLY' });
  assert.ok(out.includes('zoneType: SUPPLY'));
});

test('zoneType is nested under metadata', () => {
  const out = serializeManifest({ title: 'Oak Wilds', zoneType: 'SUPPLY' });
  assert.ok(out.includes('metadata:'));
  const lines = out.split('\n');
  const zoneTypeLine = lines.find(l => l.includes('zoneType'));
  assert.ok(zoneTypeLine.startsWith('  '), 'zoneType should be indented under metadata');
});

test('omits metadata block when zoneType is null', () => {
  const out = serializeManifest({ title: 'Roads', zoneType: null });
  assert.ok(!out.includes('metadata'));
  assert.ok(!out.includes('zoneType'));
});

test('omits metadata block when zoneType is undefined', () => {
  const out = serializeManifest({ title: 'Roads' });
  assert.ok(!out.includes('metadata'));
});

test('all three zoneType values serialize correctly', () => {
  assert.ok(serializeManifest({ title: 'x', zoneType: 'SUPPLY' }).includes('SUPPLY'));
  assert.ok(serializeManifest({ title: 'x', zoneType: 'WILDERNESS' }).includes('WILDERNESS'));
  assert.ok(serializeManifest({ title: 'x', zoneType: 'OUTPOST' }).includes('OUTPOST'));
});

test('title with em-dash serializes cleanly', () => {
  const out = serializeManifest({ title: 'Crimson — Main Outpost', zoneType: 'OUTPOST' });
  assert.ok(out.includes('Crimson — Main Outpost'));
});

test('manifest ends with newline', () => {
  const out = serializeManifest({ title: 'Test', zoneType: null });
  assert.ok(out.endsWith('\n'));
});

// ---------------------------------------------------------------------------

console.log('\nserializeRooms');

test('empty array returns empty string', () => {
  assert.strictEqual(serializeRooms([]), '');
});

test('null input returns empty string', () => {
  assert.strictEqual(serializeRooms(null), '');
});

test('single room serializes id field', () => {
  const out = serializeRooms([makeRoom()]);
  assert.ok(out.includes('r_42_17'));
});

test('single room serializes title field', () => {
  const out = serializeRooms([makeRoom()]);
  assert.ok(out.includes('Bogland'));
});

test('single room serializes coordinates inline', () => {
  const out = serializeRooms([makeRoom()]);
  assert.ok(out.includes('[42, 17, 0]'));
});

test('single room serializes metadata.terrain', () => {
  const out = serializeRooms([makeRoom()]);
  assert.ok(out.includes('terrain: bog'));
});

test('single room serializes metadata.worldCoords', () => {
  const out = serializeRooms([makeRoom()]);
  assert.ok(out.includes('worldCoords: [42, 17]'));
});

test('description is always double-quoted', () => {
  const out = serializeRooms([makeRoom()]);
  const descLine = out.split('\n').find(l => l.trim().startsWith('description:'));
  assert.ok(descLine.includes('"'), 'description should be quoted');
});

test('room without exits has no exits block', () => {
  const out = serializeRooms([makeRoom()]);
  assert.ok(!out.includes('exits:'));
});

test('room with exits serializes exits block', () => {
  const room = makeRoom({ exits: [{ direction: 'north', roomId: 'c2:r_42_18' }] });
  const out  = serializeRooms([room]);
  assert.ok(out.includes('exits:'));
  assert.ok(out.includes('direction: north'));
});

test('exit roomId with colon is quoted', () => {
  const room = makeRoom({ exits: [{ direction: 'east', roomId: 'c13:r_43_17' }] });
  const out  = serializeRooms([room]);
  const roomIdLine = out.split('\n').find(l => l.includes('roomId:'));
  assert.ok(roomIdLine.includes('"c13:r_43_17"'));
});

test('multiple exits all appear in output', () => {
  const room = makeRoom({
    exits: [
      { direction: 'north', roomId: 'c2:r_42_16' },
      { direction: 'east',  roomId: 'roads:r_43_17' },
      { direction: 'south', roomId: 'c2:r_42_18' },
    ],
  });
  const out = serializeRooms([room]);
  assert.ok(out.includes('direction: north'));
  assert.ok(out.includes('direction: east'));
  assert.ok(out.includes('direction: south'));
});

test('multiple rooms are separated in output', () => {
  const rooms = [makeRoom({ id: 'r_0_0' }), makeRoom({ id: 'r_1_0' })];
  const out   = serializeRooms(rooms);
  assert.ok(out.includes('r_0_0'));
  assert.ok(out.includes('r_1_0'));
});

test('output ends with newline', () => {
  const out = serializeRooms([makeRoom()]);
  assert.ok(out.endsWith('\n'));
});

test('rooms list starts with "- id:"', () => {
  const out = serializeRooms([makeRoom()]);
  assert.ok(out.trimStart().startsWith('- id:'));
});

// ---------------------------------------------------------------------------

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);