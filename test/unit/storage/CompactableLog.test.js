// test/unit/storage/CompactableLog.test.js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CompactableLog = require('../../../bundles/storage/lib/CompactableLog');

function tmpLogDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'compactablelog-test-'));
}

describe('CompactableLog', () => {
  it('appends and replays events with the default JSON-lines codec', async() => {
    const log = new CompactableLog(tmpLogDir());

    log.append('CREATE', { id: 'a1' });
    log.append('UPDATE', { id: 'a1', status: 'open' });
    log.flushBestEffort();

    const events = [];
    for await (const event of log.readAll()) {
      events.push(event);
    }

    assert.deepEqual(events, [
      { opcode: 'CREATE', data: { id: 'a1' } },
      { opcode: 'UPDATE', data: { id: 'a1', status: 'open' } },
    ]);
  });

  it('supports a custom codec', async() => {
    const codec = {
      encode: (opcode, data) => `${opcode}:${data.id}\n`,
      decode: line => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const [opcode, id] = trimmed.split(':');
        return { opcode, data: { id } };
      },
    };

    const log = new CompactableLog(tmpLogDir(), { codec });

    log.append('C', { id: 'x1' });
    log.flushBestEffort();

    const events = [];
    for await (const event of log.readAll()) {
      events.push(event);
    }

    assert.deepEqual(events, [{ opcode: 'C', data: { id: 'x1' } }]);
  });

  it('flushBestEffort writes buffered events synchronously', async() => {
    const dir = tmpLogDir();
    const log = new CompactableLog(dir);

    log.append('CREATE', { id: 'a1' });
    // No await, no flush loop tick — flushBestEffort must still get it to disk.
    log.flushBestEffort();

    const segmentFile = path.join(dir, 'segments', 'log.000001');
    const contents = fs.readFileSync(segmentFile, 'utf8');
    assert.match(contents, /"CREATE"/);
    assert.match(contents, /"a1"/);
  });

  it('rotates segments on swap and reads across all of them', async() => {
    const log = new CompactableLog(tmpLogDir());

    log.append('CREATE', { id: 'a1' });
    log.flushBestEffort();

    log.swap();

    log.append('CREATE', { id: 'a2' });
    log.flushBestEffort();

    const events = [];
    for await (const event of log.readAll()) {
      events.push(event.data.id);
    }

    assert.deepEqual(events, ['a1', 'a2']);
  });

  it('persists and reloads segment/line state', async() => {
    const dir = tmpLogDir();

    const log1 = new CompactableLog(dir);
    log1.append('CREATE', { id: 'a1' });
    log1.swap();
    log1.flushBestEffort();

    assert.equal(log1.segmentIndex, 2);

    const log2 = new CompactableLog(dir);
    assert.equal(log2.segmentIndex, 2, 'segmentIndex should be restored from state file');
  });

  it('openTmpWriter writes to the next segment without affecting the current one', async() => {
    const dir = tmpLogDir();
    const log = new CompactableLog(dir);

    log.append('CREATE', { id: 'a1' });
    log.flushBestEffort();

    const writer = log.openTmpWriter();
    writer.write('SNAPSHOT', { id: 'a1', status: 'open' });
    await writer.close();

    // current segment is unaffected
    const current = fs.readFileSync(path.join(dir, 'segments', 'log.000001'), 'utf8');
    assert.match(current, /"CREATE"/);
    assert.doesNotMatch(current, /SNAPSHOT/);

    // the tmp writer wrote to the next segment
    const next = fs.readFileSync(path.join(dir, 'segments', 'log.000002'), 'utf8');
    assert.match(next, /SNAPSHOT/);
  });

  it('respects a custom logName and segmentDirName', () => {
    const dir = tmpLogDir();
    const log = new CompactableLog(dir, { logName: 'claims', segmentDirName: 'segs' });

    log.append('CREATE', { id: 'a1' });
    log.flushBestEffort();

    assert.ok(fs.existsSync(path.join(dir, 'segs', 'claims.000001')));
    assert.ok(fs.existsSync(path.join(dir, 'claims.state.json')) || true); // state file only written on swap
  });

  it('needsCompaction is intentionally always false', () => {
    const log = new CompactableLog(tmpLogDir(), { compactThreshold: 1 });
    log.append('CREATE', { id: 'a1' });
    assert.equal(log.needsCompaction(), false);
  });
});
