// bundles/world/test/layer9.test.js
'use strict';

const assert  = require('assert');
const fs      = require('fs');
const os      = require('os');
const path    = require('path');
const { write, getOutputPath } = require('../lib/AreaWriter');

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

function throws(fn, fragment) {
  let threw = false;
  try { fn(); } catch (e) {
    threw = true;
    if (fragment && !e.message.includes(fragment)) {
      throw new Error(`Expected error containing "${fragment}", got: "${e.message}"`);
    }
  }
  if (!threw) throw new Error('Expected function to throw but it did not');
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aw-test-'));
}

const MANIFEST = 'title: "Test Area"\n';
const ROOMS    = '- id: r_0_0\n  title: Bogland\n';

console.log('\nLayer 9 — AreaWriter\n');

// ---------------------------------------------------------------------------

console.log('getOutputPath');

test('joins outputRoot and folderName', () => {
  const result = getOutputPath('/some/root', 'c13');
  assert.strictEqual(result, path.join('/some/root', 'c13'));
});

test('works with roads folder name', () => {
  const result = getOutputPath('/root', 'roads');
  assert.strictEqual(result, path.join('/root', 'roads'));
});

test('empty outputRoot throws', () => {
  throws(() => getOutputPath('', 'c13'), 'outputRoot');
});

test('empty folderName throws', () => {
  throws(() => getOutputPath('/root', ''), 'folderName');
});

test('non-string outputRoot throws', () => {
  throws(() => getOutputPath(null, 'c13'), 'outputRoot');
});

test('non-string folderName throws', () => {
  throws(() => getOutputPath('/root', null), 'folderName');
});

// ---------------------------------------------------------------------------

console.log('\nwrite — directory creation');

test('creates output directory if it does not exist', () => {
  const root = tmpDir();
  write(root, 'c13', MANIFEST, ROOMS);
  assert.ok(fs.existsSync(path.join(root, 'c13')));
});

test('creates nested directories recursively', () => {
  const root = tmpDir();
  write(path.join(root, 'deep', 'nested'), 'c1', MANIFEST, ROOMS);
  assert.ok(fs.existsSync(path.join(root, 'deep', 'nested', 'c1')));
});

test('does not throw if directory already exists', () => {
  const root = tmpDir();
  write(root, 'c13', MANIFEST, ROOMS);
  write(root, 'c13', MANIFEST, ROOMS);
});

// ---------------------------------------------------------------------------

console.log('\nwrite — file contents');

test('writes manifest.yml', () => {
  const root = tmpDir();
  write(root, 'c13', MANIFEST, ROOMS);
  assert.ok(fs.existsSync(path.join(root, 'c13', 'manifest.yml')));
});

test('writes rooms.yml', () => {
  const root = tmpDir();
  write(root, 'c13', MANIFEST, ROOMS);
  assert.ok(fs.existsSync(path.join(root, 'c13', 'rooms.yml')));
});

test('manifest.yml content matches input', () => {
  const root = tmpDir();
  write(root, 'c13', MANIFEST, ROOMS);
  const content = fs.readFileSync(path.join(root, 'c13', 'manifest.yml'), 'utf8');
  assert.strictEqual(content, MANIFEST);
});

test('rooms.yml content matches input', () => {
  const root = tmpDir();
  write(root, 'c13', MANIFEST, ROOMS);
  const content = fs.readFileSync(path.join(root, 'c13', 'rooms.yml'), 'utf8');
  assert.strictEqual(content, ROOMS);
});

test('write is idempotent — second write overwrites first', () => {
  const root      = tmpDir();
  const manifest2 = 'title: "Updated"\n';
  write(root, 'c13', MANIFEST,  ROOMS);
  write(root, 'c13', manifest2, ROOMS);
  const content = fs.readFileSync(path.join(root, 'c13', 'manifest.yml'), 'utf8');
  assert.strictEqual(content, manifest2);
});

test('different folder names write to different directories', () => {
  const root = tmpDir();
  write(root, 'c13',   'title: "A"\n', ROOMS);
  write(root, 'roads', 'title: "B"\n', ROOMS);
  const a = fs.readFileSync(path.join(root, 'c13',   'manifest.yml'), 'utf8');
  const b = fs.readFileSync(path.join(root, 'roads', 'manifest.yml'), 'utf8');
  assert.strictEqual(a, 'title: "A"\n');
  assert.strictEqual(b, 'title: "B"\n');
});

test('empty rooms string writes an empty rooms.yml', () => {
  const root = tmpDir();
  write(root, 'c1', MANIFEST, '');
  const content = fs.readFileSync(path.join(root, 'c1', 'rooms.yml'), 'utf8');
  assert.strictEqual(content, '');
});

// ---------------------------------------------------------------------------

console.log('\nwrite — validation');

test('non-string manifestYaml throws', () => {
  const root = tmpDir();
  throws(() => write(root, 'c1', null, ROOMS), 'manifestYaml');
});

test('non-string roomsYaml throws', () => {
  const root = tmpDir();
  throws(() => write(root, 'c1', MANIFEST, null), 'roomsYaml');
});

// ---------------------------------------------------------------------------

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);