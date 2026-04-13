'use strict';

const fs = require('fs');
const cp = require('child_process');
const os = require('os');
const path = require('path');

const gitRoot = cp.execSync('git rev-parse --show-toplevel').toString('utf8').trim();
const bundlesDir = path.join(gitRoot, 'bundles');
const npmCmd = os.platform().startsWith('win') ? 'npm.cmd' : 'npm';

if (!fs.existsSync(bundlesDir)) {
  console.error('No bundles directory found');
  process.exit(1);
}

const bundles = fs.readdirSync(bundlesDir).filter(name => {
  const bundlePath = path.join(bundlesDir, name);
  return fs.statSync(bundlePath).isDirectory();
});

if (bundles.length === 0) {
  console.log('No bundles found');
  process.exit(0);
}

for (const bundle of bundles) {
  const bundlePath = path.join(bundlesDir, bundle);
  const packageJson = path.join(bundlePath, 'package.json');

  if (!fs.existsSync(packageJson)) {
    console.log(`Skipping ${bundle} (no package.json)`);
    continue;
  }

  console.log(`Installing deps for ${bundle}...`);
  const result = cp.spawnSync(npmCmd, ['install', '--no-audit'], {
    cwd: bundlePath,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    console.error(`Failed to install deps for ${bundle}`);
  } else {
    console.log(`Done: ${bundle}`);
  }
}

console.log('All bundles processed');
