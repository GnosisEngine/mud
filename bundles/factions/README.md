# factions bundle

The factions bundle gives Fief's three competing powers a persistent memory. Every player interaction in faction territory — gathering resources, killing guards, completing quests, paying tribute, breaking surrender — shifts that player's standing with the relevant faction across four independent axes. NPCs tagged to a faction read that standing at runtime and react accordingly.

---

## Installation

Add `"factions"` to the bundles array in `ranvier.json`. It must come after `"world"` since the NPC behavior queries `state.FactionManager`, which is registered during the factions startup sequence.

```json
"bundles": [
  "lib",
  "world",
  "factions",
  ...
]
```

---

## How reputation works

Each player has a separate reputation record with every faction. That record is four signed integers, each clamped to `[-100, 100]`.

| Axis | What it measures | Low bracket | High bracket |
|---|---|---|---|
| **affinity** | Basic disposition — does the faction want you around? | enemy | devoted |
| **honor** | Respect for conduct — did you fight fair, keep agreements? | contemptible | exemplary |
| **trust** | Reliability of intent — do they believe your word? | deceiver | confidant |
| **debt** | Economic balance — who owes whom? | indebted | patron |

Each axis maps to five named brackets using configurable thresholds (defaults: `[-50, -20, 20, 50]`). Scoring at a boundary falls into the lower bracket (`score ≤ threshold`).

**Renown** is derived, not stored: `|affinity| + |honor| + |trust| + |debt|`. A player whose renown is below the faction's `renownThreshold` is treated as a stranger regardless of their axis scores — the faction simply doesn't know them yet, and the `defaultStrangerPolicy` applies instead.

### What changes reputation

Every action that affects reputation maps to a named **event type**. Each event type carries default deltas for all four axes. Factions can override individual axes for specific event types in their YAML configuration.

| Event type | affinity | honor | trust | debt |
|---|---|---|---|---|
| `npc_killed` | −20 | −5 | −10 | 0 |
| `resource_stolen` | −10 | −15 | −15 | −10 |
| `resource_gathered` | −5 | −5 | −5 | −5 |
| `claim_violated` | −15 | −10 | −10 | −10 |
| `trade_completed` | +5 | +5 | +10 | +15 |
| `quest_completed` | +10 | +10 | +10 | +5 |
| `tribute_paid` | +5 | +5 | +5 | +20 |
| `surrender_honored` | +5 | +15 | +10 | 0 |
| `surrender_broken` | −15 | −25 | −30 | 0 |
| `prisoner_released` | +10 | +20 | +5 | 0 |
| `mercenary_contract_completed` | +10 | +10 | +15 | +5 |
| `mercenary_contract_broken` | −20 | −20 | −30 | −15 |
| `vendor_overcharged` | −5 | −10 | −10 | −5 |

---

## Defining factions — `data/factions.yml`

All faction definitions live in `bundles/factions/data/factions.yml`. The bundle ships with three factions as a starting point; edit them to match your world.

```yaml
factions:
  1:
    name: "The Ironmark Compact"
    color: "#8B2020"

    # Policy function to run for players the faction doesn't recognise yet.
    # Must be a filename from the policies/ directory (without .js extension).
    defaultStrangerPolicy: graduated_warning

    # Renown below this threshold → player is treated as a stranger.
    renownThreshold: 30

    # Per-axis thresholds that divide [-100, 100] into five brackets.
    # Four boundary values in ascending order. Omit to use defaults [-50, -20, 20, 50].
    thresholds:
      affinity: [-60, -25, 25, 60]
      honor:    [-50, -20, 20, 50]
      trust:    [-50, -20, 20, 50]
      debt:     [-50, -20, 20, 50]

    # Override specific axes for specific event types.
    # Unspecified axes keep the global defaults from constants.js.
    eventOverrides:
      npc_killed:
        honor: -15     # this faction cares more about honourable combat

    # Maps situation type strings to policy function names.
    # Situation strings are arbitrary labels — they only matter when something
    # calls executePolicy with that string.
    policies:
      resource_trespass: graduated_warning
      claim_violation:   immediate_hostile
      npc_killed:        mark_enemy
      trade_completed:   improve_relations
      quest_completed:   honor_reward
      surrender:         honor_check

    # How this faction views others. Only used when your code queries
    # getFactionRelation() — not enforced automatically.
    factionRelations:
      2: cold
      3: war
```

### Authoring notes

- `defaultStrangerPolicy` and all values under `policies:` **must be filenames in the `policies/` directory** (without `.js`). Using an action string like `attack` or `warn` here will silently do nothing — the NPC will receive null from `executePolicy` and take no action. The bundle logs a startup warning for any missing policy name.
- `thresholds` is per-axis. You only need to specify axes you want to customise; the rest inherit the global default.
- `eventOverrides` only needs to name the axes you want to change; unspecified axes use the global defaults from `constants.js`.
- Faction IDs are integers. The YAML key and the `faction` field on world tiles must match.

---

## Tagging NPCs

Add `faction-npc: true` to an NPC's `behaviors` block and set the relevant metadata keys.

```yaml
- id: iron_guard
  name: Iron Guard
  level: 5
  description: "A heavyset guard in Ironmark colours watches the road."
  keywords: [guard, iron, compact]
  attributes:
    health: 200
  behaviors:
    combat: true
    faction-npc: true
  metadata:
    faction: 1
    factionPolicy: resource_trespass
    factionAttackDelay: 3
```

| Metadata key | Type | Default | Description |
|---|---|---|---|
| `faction` | number | — | **Required.** Must match a faction id in `factions.yml`. |
| `factionPolicy` | string | `resource_trespass` | Situation type passed to `policies:` lookup when a known player enters. |
| `factionAttackDelay` | number | `2` | Seconds before `initiateCombat` fires when a policy returns `attack`. |

When a player enters the NPC's room the behavior checks their stance and runs the appropriate policy. If the player is a stranger, `defaultStrangerPolicy` runs instead. When the NPC is killed by a player it emits a `factionEvent` on the killer with event type `npc_killed`.

---

## Emitting faction events from other bundles

Other bundles report faction-relevant actions by emitting on the player. They never import `FactionService` or `ReputationStore` directly.

```js
// In any bundle that has access to the player object:
const { EVENTS } = require('../factions/events');

// Minimal payload — playerId and player are injected automatically
// by the factions player-events login listener.
player.emit(EVENTS.FACTION_EVENT, {
  factionId: room.faction,
  eventType: 'resource_gathered',
});
```

Or use the typed emit helper:

```js
const { emit } = require('../factions/events');
emit.factionEvent(player, room.faction, 'trade_completed');
```

The `factionId` must be a number matching an id in `factions.yml`. The `eventType` must be one of the named event types in `constants.js`. Invalid payloads are logged and dropped — they do not throw.

### Listening for stance changes

When processing an event causes any bracket to shift, the bundle emits `faction:stanceChanged` back on the player. NPC behaviors and other systems can react to this without polling.

```js
const { EVENTS } = require('../factions/events');

player.on(EVENTS.FACTION_STANCE_CHANGED, ({ factionId, before, after }) => {
  // before and after are bracket objects: { affinity, honor, trust, debt }
  if (after.affinity === 'hostile' && before.affinity === 'neutral') {
    // player just crossed into hostile territory with this faction
  }
});
```

---

## Writing policy functions

Policy functions live in `bundles/factions/policies/`. Each file exports a single function. The filename (without `.js`) is the policy name referenced in `factions.yml`.

```js
// bundles/factions/policies/my_policy.js
'use strict';

module.exports = function myPolicy(ctx) {
  const { affinity, honor, trust, debt } = ctx.profile.brackets;
  const { isStranger, renown } = ctx.profile;

  // Return an object with at minimum an action string.
  // message is optional — it is sent to the player via B.sayAt() when set.
  return {
    action: 'warn',
    message: '"Move along," the guard says flatly.',
  };
};
```

The context object:

```js
ctx = {
  profile: {
    axes:       { affinity, honor, trust, debt },   // raw integer scores
    brackets:   { affinity, honor, trust, debt },   // named bracket strings
    renown:     number,
    isStranger: boolean,
  },
  faction:  FactionDef,   // the full faction definition from FactionLoader
  player:   Player,       // Ranvier player entity
  npc:      Npc,          // the NPC running the behavior (when called from faction-npc)
  room:     Room,
  state:    GameState,
}
```

**Action strings the `faction-npc` behavior handles:**

| action | effect |
|---|---|
| `attack` | schedules `initiateCombat` after `factionAttackDelay` seconds |
| anything else | message only, no combat |

Any action string is valid — the faction-npc behavior only intercepts `attack`. Other consumers (`vendor-npcs`, `quests`, `mercenaries`) can define their own action vocabulary and handle it themselves.

**Bracket reference:**

| Axis | Low → High |
|---|---|
| affinity | `enemy` · `hostile` · `neutral` · `friendly` · `devoted` |
| honor | `contemptible` · `dishonorable` · `neutral` · `honorable` · `exemplary` |
| trust | `deceiver` · `suspicious` · `unknown` · `trusted` · `confidant` |
| debt | `indebted` · `owing` · `balanced` · `creditor` · `patron` |

---

## Querying reputation from other bundles

Once registered, `state.FactionManager` is available to all bundles.

```js
// Is this player an enemy of faction 1?
const stance = await state.FactionManager.getStance(player.name, 1);
if (stance && stance.brackets.affinity === 'enemy') {
  // refuse service, refuse entry, etc.
}

// Full profile with raw scores and all brackets
const profile = await state.FactionManager.getProfile(player.name, 1);

// Apply an event manually (e.g. from a quest completion handler)
const { action } = await state.FactionManager.applyEvent(player.name, 1, 'quest_completed');

// Faction-to-faction relation (for NPC dialogue, diplomacy systems, etc.)
const relation = state.FactionManager.getFactionRelation(1, 3); // 'war'

// Which faction owns this room?
const factionIds = state.FactionManager.getFactionsForRoom(player.room);

// Execute a named policy directly
const result = state.FactionManager.executePolicy('graduated_warning', ctx);
// result: { action: string, message?: string }
```

If `factions.yml` fails to load at startup, `state.FactionManager` is set to a null manager that returns safe empty values from every method — callers do not need to null-check it.

---

## Persistence

Reputation is stored in SQLite at `bundles/factions/data/factions.db` (production) or `bundles/factions/data/factions-test.db` (when `NODE_ENV=test`). The database is created automatically on first startup.

Two tables are maintained:

- **`reputation`** — one row per `(player_id, faction_id)` pair, holding the four current axis scores.
- **`reputation_events`** — append-only audit log of every score change, with per-axis deltas and a timestamp.

The event log is never compacted — it is a permanent record of every faction interaction a player has ever had.

---

## Bundle structure

```
bundles/factions/
├── behaviors/
│   └── npc/
│       └── faction-npc.js       NPC behavior: stance check on playerEnter, event on killed
├── data/
│   └── factions.yml             Faction definitions — edit this for your world
├── lib/
│   ├── FactionEvents.js         Handler factory for factionEvent player events
│   ├── FactionLoader.js         Parses and validates factions.yml
│   ├── FactionService.js        state.FactionManager — public API
│   ├── PolicyResolver.js        Bracket scoring, profile resolution, policy loading
│   └── ReputationStore.js       SQLite CRUD for reputation scores and event log
├── policies/
│   ├── graduated_warning.js     Escalates from warn to attack based on affinity/trust
│   ├── honor_check.js           Accepts/rejects surrenders based on honor/trust
│   ├── honor_reward.js          Quest reward calibrated to honor and debt
│   ├── immediate_hostile.js     Attacks on sight, softened slightly for high-honor players
│   ├── improve_relations.js     Trade/favor acknowledgement scaled by trust and debt
│   ├── mark_enemy.js            Records an NPC kill, flavour varies by prior standing
│   └── warn_once.js             Single warning before escalating
├── tests/
│   └── layer1–7.test.js         167 tests covering all layers
├── constants.js                 Event types with default deltas, bracket labels, score bounds
├── events.js                    EVENTS constants and emit helpers for cross-bundle use
├── player-events.js             Attaches factionEvent listener to player on login
└── server-events/
    └── index.js                 Startup / shutdown wiring
```