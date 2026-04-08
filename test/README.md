# Fief Integration Test Harness

Boots the full Ranvier engine (no TCP server) and drives real game commands
against real loaded world data. Every test gets a fresh `GameState` via
`GameHarness.boot()`.

## How it works

```
GameHarness.boot()
  └── loads ranvier.json / ranvier.conf.js
  └── constructs full GameState (all managers)
  └── BundleManager.loadBundles()   ← real bundle load, real areas, real commands
  └── returns GameState             ← NO TCP server, NO intervals

TestSession.create(state, roomRef)
  └── new Player({ name, socket: MockTransport })
  └── player.__hydrated = true
  └── player.moveTo(room) equivalent (addPlayer)
  └── returns session

session.run('look')
  └── CommandManager.find('look').execute(args, player, 'look')
  └── MockTransport.write() buffers all Broadcast output
  └── await setImmediate (flush event loop)
  └── returns { raw, text, lines }
      raw   — string with ANSI codes intact
      text  — ANSI stripped, \r\n normalised
      lines — text split by \n, empty lines removed
```

## Running

```bash
# from repo root
node --test test/integration/commands.test.js

# or via convenience runner
node test/integration/run.js

# with verbose output
node --test --test-reporter=tap test/integration/commands.test.js

# targeting a specific room by ref
FIEF_ROOT=/path/to/fief node --test test/integration/commands.test.js
```

## Writing new tests

```js
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { boot } = require('../harness/GameHarness');
const { TestSession } = require('../harness/TestSession');

let state;
before(async () => { state = await boot(); });

describe('my command', () => {
  it('does the thing', async () => {
    const s = TestSession.create(state, 'myarea:myroom');
    const { text, lines } = await s.run('mycommand arg1 arg2');

    assert.ok(lines.length > 0);
    assert.match(text, /expected output/i);

    s.cleanup();
  });
});
```

## Output shape

`session.run()` returns:

| field   | type       | description                              |
|---------|------------|------------------------------------------|
| `raw`   | `string`   | all bytes written to transport, ANSI intact |
| `text`  | `string`   | ANSI stripped, `\r\n` → `\n`            |
| `lines` | `string[]` | `text.split('\n')`, empty lines removed  |

Use `raw` for visual snapshot diffs, `text`/`lines` for semantic assertions.

## Cleanup

Call `session.cleanup()` after each test. It removes the player from the room
and `PlayerManager` and sets `__pruned = true` to stop event propagation.

## Notes

- Boot is slow (~same as `node ranvier` startup). Use `before()` at suite
  level, not per-test.
- `setImmediate` after execute flushes one event loop tick. If a command
  defers work via `Promise.resolve()` chains you may need additional yields —
  wrap in a helper:
  ```js
  async function flush(n = 3) {
    for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r));
  }
  ```
- Commands that write to room occupants (broadcasts to all players) will
  also appear in the session's transport if the test player is in that room.
- The TCP server is never started. Intervals (entity ticks, player ticks)
  are never started. This keeps tests deterministic.