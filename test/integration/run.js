// test/integration/run.js
'use strict';

// Convenience runner: node test/integration/run.js
//
// Discovers and runs all *.test.js files in the integration directory.
// Equivalent to: node --test test/integration/**/*.test.js
//
// Set FIEF_ROOT if running from outside the repo root:
//   FIEF_ROOT=/path/to/fief node test/integration/run.js

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function findTestFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('_')) {
      files.push(...findTestFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.test.js') && !entry.name.startsWith('_')) {
      files.push(full);
    }
  }
  return files;
}

const testFiles = findTestFiles(__dirname);

if (testFiles.length === 0) {
  console.error('No *.test.js files found under', __dirname);
  process.exit(1);
}

console.log(`Running ${testFiles.length} test file(s):\n${testFiles.map(f => '  ' + path.relative(process.cwd(), f)).join('\n')}\n`);

const patchPath = path.resolve(__dirname, '../causality/patch.js');

const result = spawnSync(
  process.execPath,
  ['--require', patchPath, '--test', ...testFiles],
  {
    stdio: 'inherit',
    env: { ...process.env },
  }
);

process.exit(result.status ?? 1);
