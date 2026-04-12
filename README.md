# Fief

A historically-grounded territorial economy MUD built on [RanvierMUD](https://ranviermud.com). Players compete through three factions to claim land, extract resources, enforce debts, and build economic power — from manual gathering to delegating NPCs to run operations on their behalf.

Connects over telnet or websocket. Requires a 24-bit ANSI terminal for full visual fidelity.

---

## Requirements

- [Node.js](https://nodejs.org) >= 18.x
- npm >= 9.x

---

## Setup

Clone the repo and install root dependencies plus all bundle dependencies:

```bash
git clone https://github.com/GnosisEngine/mud.git
cd mud
npm run setup
```

---

## Running

```bash
npm start
```

This starts the server on port **4000** (configurable). Connect with any telnet client or MUD client pointed at `localhost 4000`.

To run with verbose logging:

```bash
node ./ranvier -v
```

---

## Running Tests

Individual bundle test suites use Node's built-in test runner. From the repo root:

```bash
# Run a specific bundle's tests
node --test bundles/world/tests/*.test.js
node --test bundles/time/test/*.test.js
node --test bundles/crafting/test/*.test.js
node --test bundles/claims/tests/*.test.js
```

There is also a legacy integration test harness:

```bash
npm test
```

---

## Configuration

All server configuration lives in `ranvier.json` at the repo root.

### Server

| Key | Default | Description |
|-----|---------|-------------|
| `port` | `4000` | Port the server listens on |
| `startingRoom` | `limbo:white` | Area:room ref where new characters spawn |
| `maxIdleTime` | `20` | Minutes before an idle player is disconnected |
| `logoutGraceMs` | `30000` | Milliseconds a player's character persists in-world after disconnect |
| `dataDir` | `data` | Directory for player and account save files |
| `reportToAdmins` | `false` | Whether to broadcast errors to online admins |

### Players & Accounts

| Key | Default | Description |
|-----|---------|-------------|
| `minAccountNameLength` | `3` | Minimum character count for account names |
| `maxAccountNameLength` | `20` | Maximum character count for account names |
| `minPlayerNameLength` | `3` | Minimum character count for player names |
| `maxPlayerNameLength` | `20` | Maximum character count for player names |
| `maxCharacters` | `3` | Maximum characters per account |
| `defaultMaxPlayerInventory` | `16` | Default inventory slot limit per player |
| `carryCapacityMultiplier` | `10` | Resource carry capacity = strength × this value |

### Tick & Time

| Key | Default | Description |
|-----|---------|-------------|
| `msPerTick` | `250` | Milliseconds per engine tick |
| `ticksPerHour` | `60` | Game ticks that make up one in-game hour (1 tick = 1 real second at default `msPerTick`) |
| `ticksPerDay` | `1440` | Game ticks per in-game day |

### Calendar

The game uses a 13-month calendar of 28 days each, plus one intercalary holiday, totalling 365 days per year.

| Key | Default | Description |
|-----|---------|-------------|
| `daysPerWeek` | `7` | Days in a week |
| `daysPerMonth` | `28` | Days per month |
| `monthsPerYear` | `13` | Months per year |
| `daysPerYear` | `365` | Total days per year |
| `holidayDayOfYear` | `364` | Day-of-year index for the intercalary holiday |
| `holidayName` | `The Unmarked Day` | Name of the intercalary holiday |
| `monthNames` | *(see ranvier.json)* | Array of 13 month name strings |
| `dayNames` | *(see ranvier.json)* | Array of 7 day name strings |

### Resources & Economy

| Key | Default | Description |
|-----|---------|-------------|
| `resourceSpawnTickMs` | `30000` | Milliseconds between resource node spawn cycles |
| `rotPollTickMS` | `1000` | Milliseconds between perishable rot processing passes |
| `tradeTimeoutMs` | `10000` | Milliseconds before an unconfirmed trade offer expires |
| `compactThreshold` | `10000` | Claim log entries before compaction triggers on next boot |

### Combat

| Key | Default | Description |
|-----|---------|-------------|
| `skillLag` | `2000` | Milliseconds of lag applied after using a skill |
| `maxRoomWidth` | `72` | Maximum character width for room description rendering |

---

## Features

- **World** — procedural world generation from `world.json` (160 areas, ~3665 rooms) with cluster resolution, terrain mapping, and A* pathfinding between named regions
- **Time** — astronomical simulation with a 13-month calendar, 9 day phases, 8 moon phases, and a sky position system for sun and moon display
- **Claims** — territory claiming, collateral packages, enforcement, and submission with an append-only NDJSON event log and SQLite backing
- **Crafting & Resources** — resource gathering, per-unit perishable rot, carry weight, trading, theft, and NPC drop tables
- **Fancy Rooms** — Unicode box-drawing room borders with ANSI color gradients, time bar, exit peeking, and waypoint system
- **Combat** — narrative combat system with 600+ contextual strings, arc progression, and numberless health display
- **Channels** — in-game communication channels with configurable audiences
- **Classes** — player class system with passive and active skills
- **Effects** — buff/debuff effect framework
- **Quests** — quest system with start/progress/completion hooks on any game event
- **NPC Behaviors** — composable NPC behavior scripts
- **Vendor NPCs** — shopkeeper NPCs with buy/sell commands
- **Player Groups** — party/group system
- **Progressive Respawn** — area respawning with configurable rates
- **Moderation** — admin tooling for bans and in-game moderation
- **Telnet & WebSocket networking** — dual transport support; swap or extend without touching engine code

---

## Project Structure

```
bundles/        Individual game feature bundles (each self-contained)
data/           Player and account save files (gitignored in production)
log/            Server logs
test/           Integration test harness
util/           Setup and maintenance scripts
ranvier.json    Server configuration and bundle load order
```

Bundle load order in `ranvier.json` matters: `world` and `time` must load before bundles that depend on their services (`WorldManager`, `TimeService`). `claims` must load before `crafting`.