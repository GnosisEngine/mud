# crafting bundle

A full resource economy bundle for RanvierMUD covering resource spawning, gathering, trading, and crafting. Designed for Fief's frontier-world setting where resources have weight, spoilage timers, skill gates, and territorial tax routing.

---

## System Overview

### Resource Definitions (`data/resources.json`)

Every gatherable material in the game is defined here. Each entry requires:

- `title` — display name
- `quality` — one of `common`, `uncommon`, `rare`, `epic`, `legendary`, `currency`
- `weight` — numeric kg value used for carry capacity
- `rotTicks` — number of ticks until the resource spoils, or `null` for non-perishables
- `requires.skills` — array of skill IDs the player must have to see nodes of this type
- `requires.effects` — array of effect IDs the player must have active to see nodes of this type

`ResourceDefinitions` validates the entire file on load and will throw on startup if any entry is malformed.

### Spawn Tables (`data/spawn-tables.json`)

Maps terrain types to weighted lists of resources that can spawn there. Each entry in a terrain table requires:

- `resourceKey` — must match a key in `resources.json`
- `spawnWeight` — relative probability weight for this resource on that terrain
- `min` / `max` — quantity range per spawn event
- `maxDensity` — maximum concurrent nodes of this resource allowed in a single room

A `default` terrain entry is required as a fallback. `ResourceDefinitions` validates spawn tables against resource keys on load.

### Resource Nodes (`areas/craft/items.yml`)

Each resource key needs a corresponding YAML item definition with:

- `type: RESOURCE`
- `metadata.resource.resourceKey` — must match the key in `resources.json`
- `metadata.resource.materials` — per-material `min`/`max` yield ranges (what the player actually receives when they gather)
- `metadata.resource.depletedMessage` — flavour text shown when the node is stripped
- `metadata.noPickup: true` — nodes cannot be picked up directly

The item `id` must match the resource key exactly, as `SpawnLoop` constructs item refs as `craft:<resourceKey>`.

### Spawning (`lib/SpawnLoop.js`)

Runs on a 30-second interval. On each tick it walks every area flagged with `zoneType: SUPPLY` or `WILDERNESS` in their `manifest.yml`. For each room it:

1. Resolves the room's terrain type via the injected `TerrainResolver`
2. Draws a weighted-random resource from the spawn table for that terrain
3. Checks whether the room already has `maxDensity` nodes of that resource
4. Creates and hydrates a RESOURCE item from the `craft` area and adds it to the room

### Gathering (`commands/gather.js`, `lib/GatherLogic.js`)

`gather <keyword>` searches the current room for a RESOURCE item matching the keyword. It then:

1. Checks visibility — if the resource requires skills or effects the player doesn't have, the node appears not to exist
2. Rolls a random yield from the node's `materials` ranges
3. Distributes the yield between the gathering player and any claim holders in the room via `ResourceSplit` (claim split percentages are injected at startup)
4. Stamps a rot expiry entry on each perishable resource received
5. Removes the node from the room
6. Reports gathered amounts to the player

If the player is over carry capacity, overflow is dropped to the ground with a message.

### Resource Inventory (`commands/resources.js`, `lib/ResourceContainer.js`)

Resources are stored in `player.metadata.resources` as a `{ resourceKey: amount }` map. Carry capacity is `strength × 10` kg. The `resources` command (alias: `materials`) displays the full inventory with per-item weights and total vs. capacity.

`ResourceContainer` provides `add`, `remove`, `transfer`, `steal`, `getHeld`, `canAdd`, `getDrops`, and `clearAll`. All mutations validate key existence, positive amounts, and capacity before writing.

### Resource Rot (`lib/ResourceRot.js`)

Perishable resources have rot entries stored in `player.metadata.resourceRot` as a list of `{ key, amount, expiresAt }` records. On each rot poll tick, expired entries are walked and the corresponding amounts are removed from the player's inventory. Players who are offline accumulate rot entries; these are processed in bulk on their next login.

### Trading (`commands/trade.js`, `lib/TradeLogic.js`)

`trade <player> <amount> <resource> [, <amount> <resource> ...]` initiates a pending trade offer. The target player sees the offer and has 10 seconds to `trade accept` or `trade reject`. Acceptance triggers an atomic `ResourceContainer.transfer`. Only one pending trade is allowed between any given pair of players at a time.

### Crafting (`commands/craft.js`, `data/recipes.json`)

`craft list` — lists crafting categories (Potion, Weapon, Armor), then items within a category, then the recipe for a specific item.

`craft create <category#> <item#>` — verifies the player holds all required resources, consumes them, and places the crafted item in inventory.

Recipes in `recipes.json` reference output items by their full Ranvier item ref (`area:itemId`) and specify required resource keys and amounts.

---

## Data Authoring Reference

### Adding a new resource

1. Add an entry to `data/resources.json` with all required fields.
2. Add one or more entries to terrain tables in `data/spawn-tables.json`.
3. Add an item definition to `areas/craft/items.yml` with matching `id` and `metadata.resource.resourceKey`.

### Adding a new recipe

Add an entry to `data/recipes.json`:

```json
{
  "item": "area:itemId",
  "recipe": {
    "resource_key": 3,
    "other_resource_key": 1
  }
}
```

The `item` ref must point to a valid item in a loaded area. All resource keys in `recipe` must exist in `resources.json`.

### Making a world area spawn resources

Add `zoneType` to the area's `manifest.yml`:

```yaml
title: My Area
metadata:
  zoneType: SUPPLY
```

Valid values are `SUPPLY` (PvPvE gathering zones) and `WILDERNESS` (PvE zones). Areas without this field are skipped by the spawn loop.

---

## TODO

### YAML / Data Fixes

- [x] Add `metadata.resource.resourceKey` field to every item in `areas/craft/items.yml` — required for density counting in `SpawnLoop` and visibility gating in `ResourceVisibility`
- [x] Replace demo items (`greenplant`, `redrose`) with item definitions for all 32 resources in `resources.json`, with IDs matching their resource keys exactly
- [x] Replace demo recipe in `recipes.json` — current recipe uses `plant_material` and `rose_petal` which don't exist in `resources.json`; replace with valid resource keys
- [x] Replace `limbo:potionhealth1` recipe output with a real item ref from Fief's world areas

### Code Fixes

- [x] Fix `RESOURCES_AREA_NAME` in `SpawnLoop.js` — currently `'resources'`, must be `'craft'` to match the actual area folder name
- [x] Fix `startupPoll` require path in `server-events/index.js` — `../../lib/lib/StartupPoll` has a doubled `lib/lib` and will throw on startup
- [x] Fix item reuse bug in `craft.js` `create` subcommand — `getCraftingCategories` creates and hydrates item instances for display; the same instance is then handed to the player on craft. A fresh `ItemFactory.create` + `hydrate` must happen at craft time

### Integration Work

- [x] Wire rot poll loop in `server-events/index.js` — uncomment and replace `state.ClockBundle.getCurrentTick()` with `state.TimeService.getCurrentTick()` to match the `time-bundle` API
- [ ] Wire login rot processing in the `playerEnter` listener — same `TimeService.getCurrentTick()` call; processes offline rot accumulation on login
- [ ] Wire NPC death drops — uncomment and fix the `npcCreated` / `killed` listener block in `server-events`; confirm the correct Ranvier NPC death event name
- [ ] Fix claims split resolver pattern in `gather.js` — replace the `state.BundleManager.getBundle('claims')` runtime lookup (non-standard Ranvier API) with the injected resolver pattern: inject `getSplitForRoom` at startup via `startupPoll` + `state.ClaimsReady` sentinel
- [ ] Implement `TerrainResolver` injection in `server-events` — replace the assumed `state.WorldManager.getTerrainForRoom(room)` with the actual terrain lookup from Fief's world/room metadata
- [ ] Apply `zoneType` metadata to all appropriate world area `manifest.yml` files so the spawn loop can find them