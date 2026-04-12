// test/integration/crafting.test.js
'use strict';

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  useSuite,
  assertOutput,
} = require('../harness/helpers');

const { setup, teardown, ctx } = useSuite('limbo:black');

// Crafting lib modules call Config.get() at require-time. They must be loaded
// after GameHarness.boot() has called Config.load(), so we defer them here.
let Attribute, ResourceContainer, TerrainResolver, SpawnLoop, SpawnTable, TradeLogic;
let WorldLoader, ClusterResolver, TileIndex, WorldService;

before(async() => {
  await setup();
  ({ Attribute } = require('ranvier').Attribute);
  ResourceContainer = require('../../bundles/crafting/lib/ResourceContainer');
  TerrainResolver    = require('../../bundles/crafting/lib/TerrainResolver');
  SpawnLoop          = require('../../bundles/crafting/lib/SpawnLoop');
  SpawnTable         = require('../../bundles/crafting/lib/SpawnTable');
  TradeLogic         = require('../../bundles/crafting/lib/TradeLogic');
  WorldLoader        = require('../../bundles/world/lib/WorldLoader');
  ({ resolve: ClusterResolver } = require('../../bundles/world/lib/ClusterResolver'));
  ({ build: TileIndex }        = require('../../bundles/world/lib/TileIndex'));
  ({ build: WorldService }     = require('../../bundles/world/lib/WorldService'));
});

after(teardown);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function giveStrength(player, amount = 100) {
  if (!player.hasAttribute('strength')) {
    player.addAttribute(new Attribute('strength', amount));
  }
}

function spawnNode(state, room, resourceKey) {
  const area = state.AreaManager.getArea('craft');
  if (!area) throw new Error('spawnNode: craft area not loaded');
  const item = state.ItemFactory.create(area, `craft:${resourceKey}`);
  item.hydrate(state);
  room.addItem(item);
  state.ItemManager.add(item);
  return item;
}

function countNodes(room, resourceKey) {
  const RESOURCE_TYPE = 6;
  let n = 0;
  for (const item of room.items) {
    if (item.type !== RESOURCE_TYPE) continue;
    const meta = item.getMeta && item.getMeta('resource');
    if (meta && meta.resourceKey === resourceKey) n++;
  }
  return n;
}

function removeAllResourceNodes(state, room) {
  const RESOURCE_TYPE = 6;
  const toRemove = [];
  for (const item of room.items) {
    if (item.type === RESOURCE_TYPE) toRemove.push(item);
  }
  for (const item of toRemove) {
    room.removeItem(item);
    state.ItemManager.remove(item);
  }
}

// ---------------------------------------------------------------------------
// resources command
// ---------------------------------------------------------------------------

describe('resources command', () => {
  it('shows empty message when carrying nothing', async() => {
    const s = ctx.session();
    giveStrength(s.player);
    const result = await s.run('resources');
    assertOutput(result, /aren't carrying any resources/i);
    s.cleanup();
  });

  it('lists a held non-perishable resource with amount and weight', async() => {
    const s = ctx.session();
    giveStrength(s.player);
    ResourceContainer.add(s.player, 'alluvial_gold', 5);
    const result = await s.run('resources');
    assertOutput(result, /alluvial gold/i);
    assertOutput(result, /x5/);
    assertOutput(result, /kg/i);
    ResourceContainer.clearAll(s.player);
    s.cleanup();
  });

  it('shows current weight against carry capacity', async() => {
    const s = ctx.session();
    giveStrength(s.player);
    ResourceContainer.add(s.player, 'alluvial_gold', 2);
    const result = await s.run('resources');
    assertOutput(result, /weight:/i);
    ResourceContainer.clearAll(s.player);
    s.cleanup();
  });

  it('lists a held perishable resource correctly', async() => {
    const s = ctx.session();
    giveStrength(s.player);
    ResourceContainer.add(s.player, 'brine', 3, 99999);
    const result = await s.run('resources');
    assertOutput(result, /brine/i);
    assertOutput(result, /x3/);
    ResourceContainer.clearAll(s.player);
    s.cleanup();
  });
});

// ---------------------------------------------------------------------------
// gather command
// ---------------------------------------------------------------------------

describe('gather command', () => {
  afterEach(() => {
    removeAllResourceNodes(ctx.state, ctx.room);
  });

  it('prompts when called with no argument', async() => {
    const s = ctx.session();
    giveStrength(s.player);
    const result = await s.run('gather');
    assertOutput(result, /gather what/i);
    s.cleanup();
  });

  it('reports not found for an unrecognised keyword', async() => {
    const s = ctx.session();
    giveStrength(s.player);
    const result = await s.run('gather xyzzy');
    assertOutput(result, /don't see anything/i);
    s.cleanup();
  });

  it('gathers a non-perishable resource node and removes it from the room', async() => {
    const s = ctx.session();
    giveStrength(s.player);
    spawnNode(ctx.state, ctx.room, 'alluvial_gold');
    assert.equal(countNodes(ctx.room, 'alluvial_gold'), 1, 'node should be present before gather');

    const result = await s.run('gather gold');
    assertOutput(result, /you gather/i);
    assertOutput(result, /alluvial gold/i);

    assert.equal(countNodes(ctx.room, 'alluvial_gold'), 0, 'node should be removed after gather');

    const held = ResourceContainer.getHeld(s.player);
    assert.ok(typeof held.alluvial_gold === 'number', 'non-perishable resource should be stored as a number');
    assert.ok(held.alluvial_gold > 0, 'player should have received at least one unit');

    ResourceContainer.clearAll(s.player);
    s.cleanup();
  });

  it('gathers a perishable resource and stores it as a tick array', async() => {
    const s = ctx.session();
    giveStrength(s.player);
    spawnNode(ctx.state, ctx.room, 'brine');

    const result = await s.run('gather brine');
    assertOutput(result, /you gather/i);
    assertOutput(result, /brine/i);

    const held = ResourceContainer.getHeld(s.player);
    assert.ok(Array.isArray(held.brine), 'perishable resource should be stored as an expiry-tick array');
    assert.ok(held.brine.length > 0, 'player should hold at least one brine unit');
    assert.ok(held.brine[0] > 0, 'expiry tick should be a positive integer');

    ResourceContainer.clearAll(s.player);
    s.cleanup();
  });

  it('cannot see a skill-gated node without the required skill', async() => {
    const s = ctx.session();
    giveStrength(s.player);
    spawnNode(ctx.state, ctx.room, 'argentite');

    const result = await s.run('gather argentite');
    assertOutput(result, /don't see anything/i);

    s.cleanup();
  });

  it('can gather a skill-gated node once the required skill is granted', async() => {
    const s = ctx.session();
    giveStrength(s.player);
    spawnNode(ctx.state, ctx.room, 'argentite');

    if (!s.player.skills) s.player.skills = new Set();
    s.player.skills.add('mining');

    const result = await s.run('gather argentite');
    assertOutput(result, /you gather/i);
    assertOutput(result, /argentite/i);

    ResourceContainer.clearAll(s.player);
    s.cleanup();
  });

  it('removes the depleted node and echoes a depletion message', async() => {
    const s = ctx.session();
    giveStrength(s.player);
    spawnNode(ctx.state, ctx.room, 'alluvial_gold');

    const result = await s.run('gather gold');
    assertOutput(result, /depleted|picked clean|gravel/i);
    assert.equal(countNodes(ctx.room, 'alluvial_gold'), 0, 'node should be gone after gather');

    ResourceContainer.clearAll(s.player);
    s.cleanup();
  });
});

// ---------------------------------------------------------------------------
// Spawn behavior
// ---------------------------------------------------------------------------

describe('spawn behavior', () => {
  let _savedWorldManager = null;
  let _savedMetadata = null;
  let _savedCoordinates;

  // Build a minimal WorldManager that maps (0,0) to the given terrain name.
  // Uses WorldLoader.parse → ClusterResolver → TileIndex → WorldService so
  // the full production pipeline runs — no lambdas, no bypasses.
  // The tile uses feature 2 (wilderness) so ClusterResolver does not filter it
  // out (feature 0 / none tiles are excluded from resolved output).
  // For 'default' terrain we use id 0 directly to avoid duplicate legend names.
  function buildWorldManager(terrainName) {
    const isDefault = terrainName === 'default';
    const terrainLegend = isDefault
      ? { '0': 'default' }
      : { '0': 'default', '1': terrainName };
    const tileTerrainId = isDefault ? 0 : 1;

    const loaded = WorldLoader.parse({
      metadata: { width: 1, height: 1 },
      legends: {
        terrain:  terrainLegend,
        features: { '0': 'none', '1': 'road', '2': 'wilderness', '3': 'supply', '4': 'outpost' },
      },
      clusters: { '0': { id: 0, name: 'Test Cluster', rooms: [] } },
      map: [{ coords: [0, 0], terrain: tileTerrainId, feature: 2, cluster: 0 }],
    });

    const resolved = ClusterResolver(loaded.tiles, loaded.clusters, loaded.legends);
    const index    = TileIndex(resolved.tiles);
    return WorldService(loaded, resolved, index);
  }

  // Pin the test room to tile (0,0) and swap in a terrain-aware WorldManager.
  // Caller is responsible for also setting area.metadata.zoneType if needed.
  function injectTerrain(terrainName) {
    _savedWorldManager    = ctx.state.WorldManager;
    ctx.state.WorldManager = buildWorldManager(terrainName);
    _savedCoordinates      = ctx.room.coordinates;
    ctx.room.coordinates   = { x: 0, y: 0 };
    TerrainResolver.init(room => ctx.state.WorldManager.getTerrainForRoom(room));
  }

  afterEach(() => {
    if (_savedWorldManager !== null) {
      ctx.state.WorldManager = _savedWorldManager;
      _savedWorldManager = null;
    }
    ctx.room.coordinates = _savedCoordinates;
    _savedCoordinates = undefined;
    const area = ctx.state.AreaManager.getArea('limbo');
    if (area && _savedMetadata !== null) {
      area.metadata = _savedMetadata;
      _savedMetadata = null;
    }
    TerrainResolver.reset();
    removeAllResourceNodes(ctx.state, ctx.room);
  });

  it('bog spawn table lists bog_iron as its highest-weight entry', () => {
    const candidates = SpawnTable.getSpawnCandidates('bog');
    assert.ok(candidates.length > 0, 'bog spawn table should have entries');
    const bogIron = candidates.find(c => c.resourceKey === 'bog_iron');
    assert.ok(bogIron, 'bog_iron should be present in the bog spawn table');
    const maxWeight = Math.max(...candidates.map(c => c.spawnWeight));
    assert.equal(bogIron.spawnWeight, maxWeight, 'bog_iron should be the highest-weight entry in bog terrain');
  });

  it('does not spawn resources into an area with no zoneType set', () => {
    const area = ctx.state.AreaManager.getArea('limbo');
    assert.ok(area, 'limbo area should be loaded');
    assert.ok(!area.metadata || !area.metadata.zoneType, 'limbo should not have a zoneType by default');

    injectTerrain('bog');

    const before = ctx.room.items.size;
    SpawnLoop.tick(ctx.state);
    assert.equal(ctx.room.items.size, before, 'no items should spawn into a non-zoneType area');
  });

  it('spawns bog-terrain resources into a SUPPLY area', () => {
    const area = ctx.state.AreaManager.getArea('limbo');
    assert.ok(area, 'limbo area should be loaded');
    _savedMetadata = area.metadata;
    area.metadata  = { zoneType: 'SUPPLY' };

    injectTerrain('bog');

    for (let i = 0; i < 30; i++) SpawnLoop.tick(ctx.state);

    const bogIronCount = countNodes(ctx.room, 'bog_iron');
    assert.ok(bogIronCount > 0, 'bog_iron should have spawned into a SUPPLY area with bog terrain');
  });

  it('spawns default-terrain resources into a WILDERNESS area', () => {
    const area = ctx.state.AreaManager.getArea('limbo');
    _savedMetadata = area.metadata;
    area.metadata  = { zoneType: 'WILDERNESS' };

    injectTerrain('default');

    for (let i = 0; i < 30; i++) SpawnLoop.tick(ctx.state);

    const defaultCandidates = SpawnTable.getSpawnCandidates('default');
    const spawnedInRoom = defaultCandidates.some(c => countNodes(ctx.room, c.resourceKey) > 0);
    assert.ok(spawnedInRoom, 'at least one default-terrain resource should have spawned into a WILDERNESS area');
  });

  it('respects maxDensity and does not exceed node cap for a resource', () => {
    const area = ctx.state.AreaManager.getArea('limbo');
    _savedMetadata = area.metadata;
    area.metadata  = { zoneType: 'SUPPLY' };

    injectTerrain('default');

    const maxDensity = SpawnTable.getMaxDensityForResource('default', 'alluvial_gold');
    assert.ok(maxDensity >= 1, 'maxDensity should be at least 1');

    for (let i = 0; i < 60; i++) SpawnLoop.tick(ctx.state);

    const count = countNodes(ctx.room, 'alluvial_gold');
    assert.ok(
      count <= maxDensity,
      `alluvial_gold node count (${count}) should not exceed maxDensity (${maxDensity})`
    );
  });
});

// ---------------------------------------------------------------------------
// Rot behavior
// ---------------------------------------------------------------------------

describe('rot behavior', () => {
  it('removes all perishable units whose expiry tick has passed', () => {
    const s = ctx.session();
    giveStrength(s.player);
    ResourceContainer.add(s.player, 'brine', 3, 100);

    const { rotted } = ResourceContainer.processRot(s.player, 200);
    assert.equal(rotted.brine, 3, 'all 3 brine units should be in the rotted map');
    assert.equal(ResourceContainer.getAmount(s.player, 'brine'), 0, 'player should hold no brine after rot');
    s.cleanup();
  });

  it('preserves perishable units whose expiry tick has not yet been reached', () => {
    const s = ctx.session();
    giveStrength(s.player);
    ResourceContainer.add(s.player, 'brine', 2, 1000);

    const { rotted } = ResourceContainer.processRot(s.player, 100);
    assert.equal(Object.keys(rotted).length, 0, 'rotted map should be empty');
    assert.equal(ResourceContainer.getAmount(s.player, 'brine'), 2, 'both brine units should remain');
    ResourceContainer.clearAll(s.player);
    s.cleanup();
  });

  it('only removes the expired units from a mixed-expiry batch', () => {
    const s = ctx.session();
    giveStrength(s.player);
    ResourceContainer.add(s.player, 'brine', 1, 50);
    ResourceContainer.add(s.player, 'brine', 1, 500);

    const { rotted } = ResourceContainer.processRot(s.player, 200);
    assert.equal(rotted.brine, 1, 'exactly one brine unit should have rotted');
    assert.equal(ResourceContainer.getAmount(s.player, 'brine'), 1, 'one brine unit should remain');
    ResourceContainer.clearAll(s.player);
    s.cleanup();
  });

  it('does not affect non-perishable resources regardless of tick', () => {
    const s = ctx.session();
    giveStrength(s.player);
    ResourceContainer.add(s.player, 'alluvial_gold', 5);

    const { rotted } = ResourceContainer.processRot(s.player, 999999);
    assert.ok(!rotted.alluvial_gold, 'alluvial_gold should not appear in the rotted map');
    assert.equal(ResourceContainer.getAmount(s.player, 'alluvial_gold'), 5, 'gold should be unaffected');
    ResourceContainer.clearAll(s.player);
    s.cleanup();
  });

  it('handles a player with no perishable resources cleanly', () => {
    const s = ctx.session();
    giveStrength(s.player);
    ResourceContainer.add(s.player, 'alluvial_gold', 3);

    const { rotted } = ResourceContainer.processRot(s.player, 50000);
    assert.equal(Object.keys(rotted).length, 0, 'rotted map should be empty when there are no perishables');
    ResourceContainer.clearAll(s.player);
    s.cleanup();
  });

  it('handles a completely empty inventory cleanly', () => {
    const s = ctx.session();
    const { rotted } = ResourceContainer.processRot(s.player, 50000);
    assert.equal(Object.keys(rotted).length, 0, 'rotted map should be empty for a player with nothing');
    s.cleanup();
  });
});

// ---------------------------------------------------------------------------
// trade command
// ---------------------------------------------------------------------------

describe('trade command', () => {
  afterEach(() => {
    TradeLogic.clearAll();
  });

  it('shows usage when called with no arguments', async() => {
    const s = ctx.session();
    const result = await s.run('trade');
    assertOutput(result, /usage|trade <player>/i);
    s.cleanup();
  });

  it('reports no pending trade on accept when none was initiated', async() => {
    const s = ctx.session();
    const result = await s.run('trade accept');
    assertOutput(result, /no pending trade/i);
    s.cleanup();
  });

  it('reports no pending trade on reject when none was initiated', async() => {
    const s = ctx.session();
    const result = await s.run('trade reject');
    assertOutput(result, /no pending trade/i);
    s.cleanup();
  });

  it('rejects trading with an offline player', async() => {
    const s = ctx.session();
    const result = await s.run('trade GhostPlayer 5 alluvial_gold');
    assertOutput(result, /no player named/i);
    s.cleanup();
  });

  it('rejects trading with yourself', async() => {
    const s = ctx.session();
    giveStrength(s.player);
    ResourceContainer.add(s.player, 'alluvial_gold', 5);
    const result = await s.run(`trade ${s.player.name} 5 alluvial_gold`);
    assertOutput(result, /can't trade with yourself/i);
    ResourceContainer.clearAll(s.player);
    s.cleanup();
  });

  it('rejects an offer containing an invalid resource key', async() => {
    const { a, b } = ctx.twoSessions();
    giveStrength(a.player);
    const result = await a.run(`trade ${b.player.name} 5 not_a_real_resource`);
    assertOutput(result, /invalid offer/i);
    a.cleanup();
    b.cleanup();
  });

  it('rejects an offer when the initiator lacks sufficient resources', async() => {
    const { a, b } = ctx.twoSessions();
    giveStrength(a.player);
    giveStrength(b.player);
    const result = await a.run(`trade ${b.player.name} 5 alluvial_gold`);
    assertOutput(result, /don't have enough/i);
    a.cleanup();
    b.cleanup();
  });

  it('sends the offer to the target and notifies the initiator', async() => {
    const { a, b } = ctx.twoSessions();
    giveStrength(a.player);
    giveStrength(b.player);
    ResourceContainer.add(a.player, 'alluvial_gold', 10);
    b.transport.drain();

    const result = await a.run(`trade ${b.player.name} 5 alluvial_gold`);
    assertOutput(result, /trade offer sent/i);

    const bMsg = b.transport.drain();
    assert.ok(/offers you|trade accept|trade reject/i.test(bMsg), 'target should receive the trade offer message');

    ResourceContainer.clearAll(a.player);
    a.cleanup();
    b.cleanup();
  });

  it('transfers resources when the target accepts', async() => {
    const { a, b } = ctx.twoSessions();
    giveStrength(a.player);
    giveStrength(b.player);
    ResourceContainer.add(a.player, 'alluvial_gold', 10);

    await a.run(`trade ${b.player.name} 5 alluvial_gold`);
    b.transport.drain();

    const result = await b.run('trade accept');
    assertOutput(result, /trade complete/i);

    assert.equal(ResourceContainer.getAmount(a.player, 'alluvial_gold'), 5, 'initiator should have 5 gold remaining');
    assert.equal(ResourceContainer.getAmount(b.player, 'alluvial_gold'), 5, 'target should have received 5 gold');

    ResourceContainer.clearAll(a.player);
    ResourceContainer.clearAll(b.player);
    a.cleanup();
    b.cleanup();
  });

  it('leaves resources unchanged when the target rejects', async() => {
    const { a, b } = ctx.twoSessions();
    giveStrength(a.player);
    giveStrength(b.player);
    ResourceContainer.add(a.player, 'alluvial_gold', 10);

    await a.run(`trade ${b.player.name} 5 alluvial_gold`);
    b.transport.drain();

    const result = await b.run('trade reject');
    assertOutput(result, /decline|reject/i);

    assert.equal(ResourceContainer.getAmount(a.player, 'alluvial_gold'), 10, 'initiator should still hold all 10 gold');
    assert.equal(ResourceContainer.getAmount(b.player, 'alluvial_gold'), 0, 'target should have received nothing');

    ResourceContainer.clearAll(a.player);
    a.cleanup();
    b.cleanup();
  });

  it('rejects a duplicate offer between the same two players', async() => {
    const { a, b } = ctx.twoSessions();
    giveStrength(a.player);
    giveStrength(b.player);
    ResourceContainer.add(a.player, 'alluvial_gold', 20);

    await a.run(`trade ${b.player.name} 5 alluvial_gold`);
    const result = await a.run(`trade ${b.player.name} 5 alluvial_gold`);
    assertOutput(result, /already pending/i);

    ResourceContainer.clearAll(a.player);
    a.cleanup();
    b.cleanup();
  });
});

// ---------------------------------------------------------------------------
// craft command
// ---------------------------------------------------------------------------

describe('craft command', () => {
  it('shows usage when called with no arguments', async() => {
    const s = ctx.session();
    const result = await s.run('craft');
    assertOutput(result, /missing craft command|help craft/i);
    s.cleanup();
  });

  it('craft list shows available crafting categories', async() => {
    const s = ctx.session();
    const result = await s.run('craft list');
    assertOutput(result, /potion/i);
    s.cleanup();
  });

  it('craft list 1 shows items in the Potion category', async() => {
    const s = ctx.session();
    const result = await s.run('craft list 1');
    assertOutput(result, /healing draught/i);
    s.cleanup();
  });

  it('craft list 1 1 shows the health potion recipe ingredients', async() => {
    const s = ctx.session();
    const result = await s.run('craft list 1 1');
    assertOutput(result, /medicinal herbs/i);
    assertOutput(result, /honey/i);
    s.cleanup();
  });

  it('craft list rejects an out-of-range category number', async() => {
    const s = ctx.session();
    const result = await s.run('craft list 99');
    assertOutput(result, /invalid category/i);
    s.cleanup();
  });

  it('craft create reports the missing ingredient when player has none', async() => {
    const s = ctx.session();
    giveStrength(s.player);
    const result = await s.run('craft create 1 1');
    assertOutput(result, /you need.*more/i);
    s.cleanup();
  });

  it('craft create reports partial shortfall when player has some but not enough', async() => {
    const s = ctx.session();
    giveStrength(s.player);
    ResourceContainer.add(s.player, 'medicinal_herbs', 1, 999999);
    const result = await s.run('craft create 1 1');
    assertOutput(result, /you need.*more/i);
    ResourceContainer.clearAll(s.player);
    s.cleanup();
  });

  it('craft create produces the item and consumes ingredients when resources are sufficient', async() => {
    const s = ctx.session();
    giveStrength(s.player);
    ResourceContainer.add(s.player, 'medicinal_herbs', 3, 999999);
    ResourceContainer.add(s.player, 'honey', 1, 999999);

    const invBefore = s.player.inventory.size;
    const result = await s.run('craft create 1 1');
    assertOutput(result, /you create/i);

    assert.ok(s.player.inventory.size > invBefore, 'a new item should appear in inventory');
    assert.equal(ResourceContainer.getAmount(s.player, 'medicinal_herbs'), 0, 'medicinal_herbs should be consumed');
    assert.equal(ResourceContainer.getAmount(s.player, 'honey'), 0, 'honey should be consumed');

    s.cleanup();
  });

  it('craft create rejects an invalid category number', async() => {
    const s = ctx.session();
    const result = await s.run('craft create 99 1');
    assertOutput(result, /invalid category/i);
    s.cleanup();
  });

  it('craft create rejects an invalid item number within a valid category', async() => {
    const s = ctx.session();
    const result = await s.run('craft create 1 99');
    assertOutput(result, /invalid item/i);
    s.cleanup();
  });
});
