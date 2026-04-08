// bundles/time-bundle/test/time-store.test.js

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('../lib/time-store');

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

function tempPath() {
  return path.join(os.tmpdir(), `time-store-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

function cleanup(p) {
  try { fs.unlinkSync(p); } catch (_) { }
}

console.log('\nload');

test('returns 0 when file does not exist', () => {
  const p = tempPath();
  store.configure(p);
  eq(store.load(), 0);
});

test('returns saved tick after save + load', () => {
  const p = tempPath();
  store.configure(p);
  store.save(42);
  eq(store.load(), 42);
  cleanup(p);
});

test('returns large tick value correctly', () => {
  const p = tempPath();
  store.configure(p);
  store.save(99999999);
  eq(store.load(), 99999999);
  cleanup(p);
});

test('returns 0 for empty file', () => {
  const p = tempPath();
  fs.writeFileSync(p, '', 'utf8');
  store.configure(p);
  eq(store.load(), 0);
  cleanup(p);
});

test('returns 0 for invalid JSON', () => {
  const p = tempPath();
  fs.writeFileSync(p, '{ not valid json', 'utf8');
  store.configure(p);
  eq(store.load(), 0);
  cleanup(p);
});

test('returns 0 when tick field is missing', () => {
  const p = tempPath();
  fs.writeFileSync(p, JSON.stringify({ other: 123 }), 'utf8');
  store.configure(p);
  eq(store.load(), 0);
  cleanup(p);
});

test('returns 0 when tick is negative', () => {
  const p = tempPath();
  fs.writeFileSync(p, JSON.stringify({ tick: -5 }), 'utf8');
  store.configure(p);
  eq(store.load(), 0);
  cleanup(p);
});

test('returns 0 when tick is NaN', () => {
  const p = tempPath();
  fs.writeFileSync(p, JSON.stringify({ tick: null }), 'utf8');
  store.configure(p);
  eq(store.load(), 0);
  cleanup(p);
});

test('returns 0 when tick is a string', () => {
  const p = tempPath();
  fs.writeFileSync(p, JSON.stringify({ tick: '1234' }), 'utf8');
  store.configure(p);
  eq(store.load(), 0);
  cleanup(p);
});

test('returns 0 when tick is Infinity', () => {
  const p = tempPath();
  fs.writeFileSync(p, '{"tick":1e999}', 'utf8');
  store.configure(p);
  eq(store.load(), 0);
  cleanup(p);
});

console.log('\nsave');

test('save creates the file', () => {
  const p = tempPath();
  store.configure(p);
  store.save(1);
  eq(fs.existsSync(p), true);
  cleanup(p);
});

test('save creates intermediate directories', () => {
  const dir = path.join(os.tmpdir(), `time-store-dir-${Date.now()}`);
  const p = path.join(dir, 'nested', 'tick.json');
  store.configure(p);
  store.save(7);
  eq(store.load(), 7);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('save overwrites previous value', () => {
  const p = tempPath();
  store.configure(p);
  store.save(10);
  store.save(20);
  eq(store.load(), 20);
  cleanup(p);
});

test('save tick 0 is stored and loaded correctly', () => {
  const p = tempPath();
  store.configure(p);
  store.save(0);
  eq(store.load(), 0);
  cleanup(p);
});

test('file content is valid JSON with a tick field', () => {
  const p = tempPath();
  store.configure(p);
  store.save(55);
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  eq(raw.tick, 55);
  cleanup(p);
});

console.log('\nconfigure');

test('configure changes the active save path', () => {
  const p1 = tempPath();
  const p2 = tempPath();
  store.configure(p1);
  store.save(111);
  store.configure(p2);
  store.save(222);
  store.configure(p1);
  eq(store.load(), 111);
  store.configure(p2);
  eq(store.load(), 222);
  cleanup(p1);
  cleanup(p2);
});

console.log('\n');
console.log(`  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);