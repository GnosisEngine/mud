## Code Style Rules

- Always include `'use strict';` at the top of every file (global strict mode).
- Never use `var`. Use `const` or `let`.
- Prefer `const` for any variable that is never reassigned.
- Prefix intentionally unused function parameters with `_` (e.g. `_unused`). All other unused variables should be removed.
- Use 2-space indentation. `case` blocks inside `switch` are indented 1 level.
- Use single quotes for strings. Double quotes are only acceptable to avoid escaping (e.g. `"it's"`).
- Always end statements with a semicolon.
- Trailing commas are allowed (but not required) on the last item of multiline arrays/objects.
- Every file must end with a newline character.
- No trailing whitespace on any line.
- No space between a function name and its parameter list: `function foo()`, not `function foo ()`. Same for anonymous functions and methods.
- Always put a space before and after keywords: `if (`, `} else {`, `return x`, etc.
- Always put spaces around infix operators: `a + b`, `x === y`, `i++` is fine, but `a+b` is not.
- Always put spaces inside object literal curly braces: `{ key: value }`, not `{key: value}`.
- Never put spaces inside array brackets: `[1, 2, 3]`, not `[ 1, 2, 3 ]`.
- `console.*` and `process.exit()` are allowed.

## Bundle Design Rules

### 1. `constants.js`

`constants.js` is the single place in a bundle where values from `ranvier.json` are
pulled into named constants. No other file in the bundle should call `Config.get()`
directly — they import from `constants.js` instead.

#### Pattern

```js
// bundles/my-bundle/constants.js
'use strict';
const { Config } = require('ranvier');

const SOME_VALUE = Config.get('someKey');
const ANOTHER_VALUE = Config.get('anotherKey');

module.exports = { SOME_VALUE, ANOTHER_VALUE };
```

#### Rules

- Every `Config.get()` call is at module load time (top-level), never inside a
  function.
- Constants are named in `SCREAMING_SNAKE_CASE`.
- Only import the keys your bundle actually uses. Do not create a catch-all.

#### Relationship to `ranvier.json`

`ranvier.json` is the single source of truth for all tunable values (tick rates,
capacities, calendar config, etc.). `constants.js` is the bridge that names those
values for the bundle. If a value needs to change, it changes in `ranvier.json` only
— no bundle source file ever hardcodes a magic number that belongs there.

### 2. `events.js`

`events.js` declares the events a bundle can emit and provides typed helper
functions for emitting them. It is the contract between the bundle and any listener
that reacts to its domain.

#### Pattern

```js
// bundles/my-bundle/events.js
'use strict';

const { buildEmitHelpers } = require('../lib/lib/EventHelpers');

const EVENTS = Object.freeze({
  THING_HAPPENED: 'thing:happened',
  OTHER_THING:    'other:thing',
});

const SCHEMA = {
  [EVENTS.THING_HAPPENED]: {
    emitter: 'player',          // 'player' | 'room' | 'npc' | 'time-state' | etc.
    payload: { key: 'string', amount: 'number' },
    relay:   true,              // true = broadcast to room; false = targeted only
  },
  [EVENTS.OTHER_THING]: {
    emitter: 'room',
    payload: { items: 'object' },
    relay:   false,
  },
};

const emit = buildEmitHelpers(EVENTS, SCHEMA);

module.exports = { EVENTS, SCHEMA, emit };
```

#### Schema fields

| Field     | Purpose |
|-----------|---------|
| `emitter` | The type of object that owns the `.emit()` call — documents intent, not enforced at runtime |
| `payload` | Named payload keys and their expected types — positional order in the generated helper matches declaration order |
| `relay`   | Whether this event is intended to broadcast to a room vs. target a single entity |

#### Generated `emit` helpers

`buildEmitHelpers` converts each `SCREAMING_SNAKE_CASE` key into a camelCase
function. Payload keys become positional arguments in declaration order:

```js
// SCHEMA payload: { enforcerId: 'string', claimId: 'string', roomId: 'string', duration: 'number' }
emit.enforceReceived(targetPlayer, enforcerId, claimId, roomId, duration);

// SCHEMA payload: { rotted: 'object' }
emit.resourceRotted(player, rotted);
```

#### Exception: internal event buses

If a module uses its own internal event emitter (not a Ranvier entity), `emit`
helpers from `EventHelpers` do not apply. Export `EVENTS` and `SCHEMA` for
documentation and listener registration, but emit directly on the internal emitter:

```js
// time-state uses its own EventEmitter, not a player/room
timeState.on(EVENTS.DAY_ROLLOVER, tick => { ... });
```

#### Rules

- `EVENTS` is always `Object.freeze()`'d.
- Event name strings use `namespace:action` format (`resource:rotted`,
  `enforce:received`).
- One `events.js` per bundle. Cross-bundle event listening imports `EVENTS` from
  the source bundle rather than hardcoding string literals:

```js
const { EVENTS: CombatEvents } = require('../../combat/events');
npc.on(CombatEvents.KILLED, () => { ... });
```

### 3. `server-events/index.js`

`server-events/index.js` is the bundle's lifecycle hook. It runs code at engine
startup (and optionally shutdown) that cannot run at `require()` time because it
needs `state` — registered services, managers, intervals, and cross-bundle wiring
all happen here.

### Pattern

```js
// bundles/my-bundle/server-events/index.js
'use strict';

const SomeService = require('../lib/SomeService');
const { SOME_VALUE } = require('../constants');

module.exports = {
  listeners: {
    startup: state => () => {
      // synchronous setup
      state.MyService = SomeService.build();
    },

    shutdown: state => async () => {
      // optional cleanup
    },
  },
};
```

#### `startup` listener

- Signature is always `state => () => { ... }` (or `state => async () => { ... }`).
- `state` is the full Ranvier `GameState`. Services, managers, and intervals are
  registered onto it here.
- If the listener depends on another bundle's service that may not be ready yet
  (e.g. `state.WorldManager`), use `startupPoll` from `bundle-lib`:

```js
const startupPoll = require('../../lib/lib/StartupPoll');

startup: state => () => startupPoll(
  () => state.WorldManager,     // poll until truthy
  async () => {
    // safe to use state.WorldManager here
    TerrainResolver.init(room => state.WorldManager.getTerrainForRoom(room));
    setInterval(() => SpawnLoop.tick(state), SPAWN_TICK_MS);
  }
)
```

#### `shutdown` listener

Only needed when the bundle owns intervals or open file handles that must be
cleaned up. Store the stop handle on `state` at startup so shutdown can reach it:

```js
startup: state => async () => {
  const interval = setInterval(...);
  state._myBundleStop = () => clearInterval(interval);
},

shutdown: state => async () => {
  if (state._myBundleStop) state._myBundleStop();
},
```

#### Rules

- The file must be `server-events/index.js` — not `index.js` at the bundle root
  and not `server-events.js`. Ranvier will not pick up other names.
- Do not perform heavy logic inline. Delegate to lib classes; `server-events` is
  wiring only.
- Services registered on `state` use `PascalCase` keys (`state.WorldManager`,
  `state.TimeService`, `state.StorageManager`).
- Cross-bundle utility registration (e.g. `state.getTarget`) also lives here.

### 4. Commands and `state.getTarget()`

#### Command signature

Every command file exports an object with a `command` property whose value is a
curried function:

```js
module.exports = {
  usage: 'mycommand <args>',
  aliases: ['alias1'],
  command: state => (args, player) => {
    // implementation
  },
};
```

`state` is closed over at load time. `args` is the raw argument string the player
typed after the command word. `player` is the acting `Player` instance.

#### `state.getTarget(player, query, targets)`

`state.getTarget` is registered at startup by the `fancy-rooms` bundle. It performs
fuzzy substring matching across the entities in a room.

```
state.getTarget(player, query, targets, room?) → entity | null
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `player`    | `Player` | The player performing the search — always `player.room` |
| `query`   | `string` | The raw argument string from the player |
| `targets` | `string[]` | Entity types to search: any of `'player'`, `'npc'`, `'item'`, `'exit'` |
| `room`    | `Room` | The room to search — defaults to `player.room` |

Returns the highest-scoring match, or `null` if nothing scores above zero.

#### When to use `state.getTarget()` vs `ArgParser.parseDot()`

| Situation | Use |
|-----------|-----|
| Finding a player, NPC, item, or exit in the current room | `state.getTarget()` |
| Finding an item inside a container (inventory or container inventory) | `ArgParser.parseDot()` |
| Finding an item in the acting player's own inventory | `ArgParser.parseDot()` |

#### `self` special-case

Check `args === 'self'` before calling `state.getTarget()` whenever a command can
target the player themselves:

```js
command: state => (args, player) => {
  if (args === 'self') {
    // handle self-targeting
    return;
  }

  const target = state.getTarget(player, args, ['player']);
  if (!target) {
    return Broadcast.sayAt(player, "You can't find anyone named that.");
  }
  // ...
};
```

#### Targeting a single type

```js
// NPC or player in the room
const target = state.getTarget(player, args, ['npc', 'player']);

// Item in the room only
const item = state.getTarget(player, args, ['item']);

// Exit direction
const exit = state.getTarget(player, args, ['exit']);
```

#### Collapsing a player-then-NPC fallback

Do not chain two separate lookups. A single call with both types returns the
highest-scoring match across both sets:

```js
// Before
let target = ArgParser.parseDot(args, player.room.players);
if (!target) target = ArgParser.parseDot(args, player.room.npcs);

// After
const target = state.getTarget(player, args, ['player', 'npc']);
```

#### Full command example

```js
// bundles/my-bundle/commands/greet.js
'use strict';

const { Broadcast: B } = require('ranvier');

module.exports = {
  usage: 'greet <target>',
  command: state => (args, player) => {
    if (!args || !args.length) {
      return B.sayAt(player, 'Greet whom?');
    }

    if (args === 'self') {
      return B.sayAt(player, 'You wave at yourself. A little sad.');
    }

    const target = state.getTarget(player, args, ['player', 'npc']);
    if (!target) {
      return B.sayAt(player, "You don't see anyone like that here.");
    }

    B.sayAt(player, `You greet ${target.name} warmly.`);

    if (!target.isNpc) {
      B.sayAt(target, `${player.name} greets you warmly.`);
    }
  },
};
```

