// bundles/vendor-npcs/tests/layer1.test.js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { Config } = require('ranvier');

Config.load({
  dataDir: 'data',
  daysPerMonth: 28,
  mercMoveIntervalMs: 15000,
  mercFleeIntervalMs: 3000,
  mercMaxPenaltyStacks: 3,
});

const {
  DATA_DIR,
  MERC_MOVE_INTERVAL_MS,
  MERC_FLEE_INTERVAL_MS,
  MERC_MAX_PENALTY_STACKS,
  TWO_GAME_MONTHS_MS,
  PENALTY_COOLDOWN_MS,
} = require('../constants');

test('DATA_DIR is a non-empty string', () => {
  assert.equal(typeof DATA_DIR, 'string');
  assert.ok(DATA_DIR.length > 0);
});

test('TWO_GAME_MONTHS_MS equals 2 × 28 × 24 × 60 × 1000', () => {
  assert.equal(TWO_GAME_MONTHS_MS, 2 * 28 * 24 * 60 * 1000);
  assert.equal(TWO_GAME_MONTHS_MS, 80_640_000);
});

test('PENALTY_COOLDOWN_MS equals TWO_GAME_MONTHS_MS', () => {
  assert.equal(PENALTY_COOLDOWN_MS, TWO_GAME_MONTHS_MS);
});

test('MERC_FLEE_INTERVAL_MS is less than MERC_MOVE_INTERVAL_MS', () => {
  assert.ok(MERC_FLEE_INTERVAL_MS < MERC_MOVE_INTERVAL_MS,
    `flee (${MERC_FLEE_INTERVAL_MS}ms) must be faster than move (${MERC_MOVE_INTERVAL_MS}ms)`);
});

test('MERC_MOVE_INTERVAL_MS is a positive integer', () => {
  assert.ok(Number.isInteger(MERC_MOVE_INTERVAL_MS));
  assert.ok(MERC_MOVE_INTERVAL_MS > 0);
});

test('MERC_FLEE_INTERVAL_MS is a positive integer', () => {
  assert.ok(Number.isInteger(MERC_FLEE_INTERVAL_MS));
  assert.ok(MERC_FLEE_INTERVAL_MS > 0);
});

test('MERC_MAX_PENALTY_STACKS is a positive integer', () => {
  assert.ok(Number.isInteger(MERC_MAX_PENALTY_STACKS));
  assert.ok(MERC_MAX_PENALTY_STACKS > 0);
});

const AREAS_DIR = path.resolve(__dirname, '../areas/mercs');

test('manifest.yml exists and names the area', () => {
  const content = fs.readFileSync(path.join(AREAS_DIR, 'manifest.yml'), 'utf8');
  assert.ok(content.includes('name: mercs'), 'manifest must declare name: mercs');
});

test('items.yml defines merc-contract as OBJECT type', () => {
  const content = fs.readFileSync(path.join(AREAS_DIR, 'items.yml'), 'utf8');
  assert.ok(content.includes('id: merc-contract'), 'must define id: merc-contract');
  assert.ok(content.includes('type: OBJECT'), 'contract must be type OBJECT');
  assert.ok(content.includes('contract:'), 'must include contract: metadata block');
});

test('npcs.yml defines mercenary stub with required safety flags', () => {
  const content = fs.readFileSync(path.join(AREAS_DIR, 'npcs.yml'), 'utf8');
  assert.ok(content.includes('id: mercenary'), 'must define id: mercenary');
  assert.ok(content.includes('noRespawn: true'), 'must carry noRespawn: true');
  assert.ok(content.includes('merc-patrol: true'), 'must register merc-patrol behavior');
  assert.ok(content.includes('combat: true'), 'must register combat behavior');
});

test('npcs.yml merc stub includes all runtime state fields', () => {
  const content = fs.readFileSync(path.join(AREAS_DIR, 'npcs.yml'), 'utf8');
  assert.ok(content.includes('contractId:'), 'merc metadata must include contractId field');
  assert.ok(content.includes('targetRoomId:'), 'merc metadata must include targetRoomId field');
  assert.ok(content.includes('homeRoomId:'), 'merc metadata must include homeRoomId field');
  assert.ok(content.includes('status: idle'), 'merc default status must be idle');
});