// bundles/time-bundle/lib/time-store.js

const fs = require('fs');
const path = require('path');

const DEFAULT_PATH = path.join(__dirname, '../../../data/tick.json');

let savePath = DEFAULT_PATH;

function configure(filePath) {
  savePath = filePath;
}

function load() {
  try {
    const raw = fs.readFileSync(savePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.tick === 'number' && Number.isFinite(parsed.tick) && parsed.tick >= 0) {
      return parsed.tick;
    }
    return 0;
  } catch (_) {
    return 0;
  }
}

function save(tick) {
  const dir = path.dirname(savePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(savePath, JSON.stringify({ tick }), 'utf8');
}

module.exports = { configure, load, save };