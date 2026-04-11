// bundles/vendor-npcs/tests/layer4.test.js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Config } = require('ranvier');

Config.load({
  dataDir: 'data',
  daysPerMonth: 28,
  mercMoveIntervalMs: 15000,
  mercFleeIntervalMs: 3000,
  mercMaxPenaltyStacks: 3,
});

const { computePath, nextStep, MAX_LOOKAHEAD } = require('../lib/MercPathfinder');

// ---------------------------------------------------------------------------
// Helper builders
// ---------------------------------------------------------------------------

function makeRoom(x, y, entityReference, exits = []) {
  return {
    coordinates: { x, y, z: 0 },
    entityReference,
    exits,
    getExits: () => exits,
    getDoor: () => null,
  };
}

function makeRoomNoDoor(x, y, entityReference, exitRooms = []) {
  const exits = exitRooms.map(r => ({ roomId: r.entityReference, direction: 'north' }));
  return {
    coordinates: { x, y, z: 0 },
    entityReference,
    exits,
    getExits: () => exits,
    getDoor: (_other) => null,
  };
}

function makeWorldManager(pathResult) {
  return {
    getPath: (_start, _end) => pathResult,
  };
}

function makeState(roomMap) {
  return {
    RoomManager: {
      getRoom: ref => roomMap[ref] || null,
    },
  };
}

function makeNpc(room) {
  return { room };
}

// ---------------------------------------------------------------------------
// computePath
// ---------------------------------------------------------------------------

test('computePath returns null when fromRoom has no coordinates', () => {
  const from = { coordinates: null, entityReference: 'a:start' };
  const to = makeRoom(5, 5, 'a:end');
  const wm = makeWorldManager({ coords: [[5, 5]] });
  assert.equal(computePath(from, to, wm), null);
});

test('computePath returns null when toRoom has no coordinates', () => {
  const from = makeRoom(0, 0, 'a:start');
  const to = { coordinates: null, entityReference: 'a:end' };
  const wm = makeWorldManager({ coords: [[5, 5]] });
  assert.equal(computePath(from, to, wm), null);
});

test('computePath returns null when worldManager returns null', () => {
  const from = makeRoom(0, 0, 'a:start');
  const to = makeRoom(5, 5, 'a:end');
  const wm = makeWorldManager(null);
  assert.equal(computePath(from, to, wm), null);
});

test('computePath returns null when worldManager returns empty coords', () => {
  const from = makeRoom(0, 0, 'a:start');
  const to = makeRoom(5, 5, 'a:end');
  const wm = makeWorldManager({ coords: [] });
  assert.equal(computePath(from, to, wm), null);
});

test('computePath passes the correct [x, y] arrays to worldManager.getPath', () => {
  const calls = [];
  const from = makeRoom(3, 7, 'a:start');
  const to = makeRoom(10, 2, 'a:end');
  const wm = {
    getPath: (start, end) => { calls.push({ start, end }); return { coords: [[10, 2]] }; },
  };

  computePath(from, to, wm);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].start, [3, 7]);
  assert.deepEqual(calls[0].end, [10, 2]);
});

test('computePath strips the leading coord when it matches the fromRoom position', () => {
  const from = makeRoom(0, 0, 'a:start');
  const to = makeRoom(2, 0, 'a:end');
  // WorldManager includes start coord at index 0
  const wm = makeWorldManager({ coords: [[0, 0], [1, 0], [2, 0]] });

  const path = computePath(from, to, wm);

  assert.ok(Array.isArray(path));
  assert.equal(path.length, 2);
  assert.deepEqual(path[0], [1, 0]);
  assert.deepEqual(path[1], [2, 0]);
});

test('computePath does not strip first coord when it does not match fromRoom', () => {
  const from = makeRoom(0, 0, 'a:start');
  const to = makeRoom(2, 0, 'a:end');
  // WorldManager path starts at the first step, not the start room
  const wm = makeWorldManager({ coords: [[1, 0], [2, 0]] });

  const path = computePath(from, to, wm);

  assert.ok(Array.isArray(path));
  assert.equal(path.length, 2);
  assert.deepEqual(path[0], [1, 0]);
});

test('computePath returns a single-element array for a one-step journey', () => {
  const from = makeRoom(0, 0, 'a:start');
  const to = makeRoom(1, 0, 'a:end');
  const wm = makeWorldManager({ coords: [[0, 0], [1, 0]] });

  const path = computePath(from, to, wm);

  assert.ok(Array.isArray(path));
  assert.equal(path.length, 1);
  assert.deepEqual(path[0], [1, 0]);
});

// ---------------------------------------------------------------------------
// nextStep — basic movement
// ---------------------------------------------------------------------------

test('nextStep returns null when pathIndex is at or beyond path length', () => {
  const roomA = makeRoomNoDoor(0, 0, 'a:a');
  const npc = makeNpc(roomA);
  const path = [[1, 0]];

  assert.equal(nextStep(npc, path, 1, makeState({})), null);
  assert.equal(nextStep(npc, path, 5, makeState({})), null);
});

test('nextStep returns the matching room and advances pathIndex by 1', () => {
  const roomB = makeRoom(1, 0, 'a:b');
  const roomA = {
    coordinates: { x: 0, y: 0, z: 0 },
    entityReference: 'a:a',
    getExits: () => [{ roomId: 'a:b', direction: 'east' }],
    getDoor: () => null,
  };
  const npc = makeNpc(roomA);
  const path = [[1, 0]];
  const state = makeState({ 'a:b': roomB });

  const result = nextStep(npc, path, 0, state);

  assert.ok(result !== null);
  assert.equal(result.room.entityReference, 'a:b');
  assert.equal(result.newIndex, 1);
});

test('nextStep skips coords with no matching exit and finds a later match', () => {
  const roomC = makeRoom(2, 0, 'a:c');
  const roomA = {
    coordinates: { x: 0, y: 0, z: 0 },
    entityReference: 'a:a',
    // Only exit goes to roomC at [2,0], not [1,0]
    getExits: () => [{ roomId: 'a:c', direction: 'east' }],
    getDoor: () => null,
  };
  const npc = makeNpc(roomA);
  const path = [[1, 0], [2, 0]];
  const state = makeState({ 'a:c': roomC });

  const result = nextStep(npc, path, 0, state);

  assert.ok(result !== null);
  assert.equal(result.room.entityReference, 'a:c');
  assert.equal(result.newIndex, 2);
});

test('nextStep returns null when no exit matches within MAX_LOOKAHEAD', () => {
  const roomA = {
    coordinates: { x: 0, y: 0, z: 0 },
    entityReference: 'a:a',
    getExits: () => [{ roomId: 'a:distant', direction: 'east' }],
    getDoor: () => null,
  };
  const distantRoom = makeRoom(99, 99, 'a:distant');
  const npc = makeNpc(roomA);

  // Path has coords that don't match the only exit
  const path = Array.from({ length: MAX_LOOKAHEAD + 2 }, (_, i) => [i + 1, 0]);
  const state = makeState({ 'a:distant': distantRoom });

  const result = nextStep(npc, path, 0, state);
  assert.equal(result, null);
});

// ---------------------------------------------------------------------------
// nextStep — door handling
// ---------------------------------------------------------------------------

test('nextStep skips an exit blocked by a locked door', () => {
  const roomB = makeRoom(1, 0, 'a:b');
  const roomC = makeRoom(2, 0, 'a:c');
  const roomA = {
    coordinates: { x: 0, y: 0, z: 0 },
    entityReference: 'a:a',
    getExits: () => [
      { roomId: 'a:b', direction: 'east' },
      { roomId: 'a:c', direction: 'north' },
    ],
    getDoor: (other) => other.entityReference === 'a:b' ? { locked: true, closed: true } : null,
  };
  const npc = makeNpc(roomA);
  const path = [[1, 0], [2, 0]];
  const state = makeState({ 'a:b': roomB, 'a:c': roomC });

  const result = nextStep(npc, path, 0, state);

  // roomB is locked, so should skip to roomC
  assert.ok(result !== null);
  assert.equal(result.room.entityReference, 'a:c');
  assert.equal(result.newIndex, 2);
});

test('nextStep skips an exit blocked by a closed (but unlocked) door', () => {
  const roomB = makeRoom(1, 0, 'a:b');
  const roomA = {
    coordinates: { x: 0, y: 0, z: 0 },
    entityReference: 'a:a',
    getExits: () => [{ roomId: 'a:b', direction: 'east' }],
    getDoor: () => ({ locked: false, closed: true }),
  };
  const npc = makeNpc(roomA);
  const path = [[1, 0]];
  const state = makeState({ 'a:b': roomB });

  const result = nextStep(npc, path, 0, state);
  assert.equal(result, null);
});

test('nextStep also checks the destination room getDoor (reverse door check)', () => {
  const roomB = {
    coordinates: { x: 1, y: 0, z: 0 },
    entityReference: 'a:b',
    getDoor: (_other) => ({ locked: true, closed: true }),
  };
  const roomA = {
    coordinates: { x: 0, y: 0, z: 0 },
    entityReference: 'a:a',
    getExits: () => [{ roomId: 'a:b', direction: 'east' }],
    getDoor: (_other) => null,
  };
  const npc = makeNpc(roomA);
  const path = [[1, 0]];
  const state = makeState({ 'a:b': roomB });

  const result = nextStep(npc, path, 0, state);
  assert.equal(result, null);
});

// ---------------------------------------------------------------------------
// nextStep — exits with no coordinates
// ---------------------------------------------------------------------------

test('nextStep skips exits whose destination room has no coordinates', () => {
  const roomNoCoords = { coordinates: null, entityReference: 'a:nocoord', getDoor: () => null };
  const roomB = makeRoom(1, 0, 'a:b');
  const roomA = {
    coordinates: { x: 0, y: 0, z: 0 },
    entityReference: 'a:a',
    getExits: () => [
      { roomId: 'a:nocoord', direction: 'north' },
      { roomId: 'a:b', direction: 'east' },
    ],
    getDoor: () => null,
  };
  const npc = makeNpc(roomA);
  const path = [[1, 0]];
  const state = makeState({ 'a:nocoord': roomNoCoords, 'a:b': roomB });

  const result = nextStep(npc, path, 0, state);

  assert.ok(result !== null);
  assert.equal(result.room.entityReference, 'a:b');
});

test('nextStep returns null when the exit room does not exist in RoomManager', () => {
  const roomA = {
    coordinates: { x: 0, y: 0, z: 0 },
    entityReference: 'a:a',
    getExits: () => [{ roomId: 'a:ghost', direction: 'east' }],
    getDoor: () => null,
  };
  const npc = makeNpc(roomA);
  const path = [[1, 0]];
  const state = makeState({});

  const result = nextStep(npc, path, 0, state);
  assert.equal(result, null);
});

// ---------------------------------------------------------------------------
// nextStep — multi-exit disambiguation
// ---------------------------------------------------------------------------

test('nextStep picks the correct exit when multiple exits exist', () => {
  const roomB = makeRoom(1, 0, 'a:b');
  const roomC = makeRoom(0, 1, 'a:c');
  const roomA = {
    coordinates: { x: 0, y: 0, z: 0 },
    entityReference: 'a:a',
    getExits: () => [
      { roomId: 'a:b', direction: 'east' },
      { roomId: 'a:c', direction: 'north' },
    ],
    getDoor: () => null,
  };
  const npc = makeNpc(roomA);
  const state = makeState({ 'a:b': roomB, 'a:c': roomC });

  const resultEast = nextStep(npc, [[1, 0]], 0, state);
  assert.equal(resultEast.room.entityReference, 'a:b');

  const resultNorth = nextStep(npc, [[0, 1]], 0, state);
  assert.equal(resultNorth.room.entityReference, 'a:c');
});

// ---------------------------------------------------------------------------
// MAX_LOOKAHEAD constant
// ---------------------------------------------------------------------------

test('MAX_LOOKAHEAD is a positive integer', () => {
  assert.ok(Number.isInteger(MAX_LOOKAHEAD));
  assert.ok(MAX_LOOKAHEAD > 0);
});
