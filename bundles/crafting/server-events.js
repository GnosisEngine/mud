// resources/server-events.js
'use strict';

const TerrainResolver = require('./lib/TerrainResolver');
const SpawnLoop = require('./lib/SpawnLoop');
const NpcDeathHandler = require('./lib/NpcDeathHandler');
const ResourceRot = require('./lib/ResourceRot');

const ROT_POLL_TICK_MS = 1000;

module.exports = {
  listeners: {
    'server:start': state => function () {
      const terrainBundle = state.BundleManager.getBundle('terrain');
      if (terrainBundle) {
        TerrainResolver.init(room => terrainBundle.getTerrainForRoom(room));
      }

      setInterval(() => SpawnLoop.tick(state), SpawnLoop.SPAWN_TICK_MS);

      setInterval(() => {
        const currentTick = state.ClockBundle.getCurrentTick();
        for (const [, player] of state.PlayerManager.players) {
          const { rotted } = ResourceRot.processEntity(player, currentTick);
          if (Object.keys(rotted).length) {
            player.emit('resource:rotted', { player, rotted });
          }
        }
      }, ROT_POLL_TICK_MS);

      state.MobManager.on('npcCreated', npc => {
        npc.on('killed', () => NpcDeathHandler.handleKilled(npc, state));
      });

      state.PlayerManager.on('playerEnter', player => {
        player.on('enter', () => {
          const currentTick = state.ClockBundle.getCurrentTick();
          const { rotted } = ResourceRot.processEntity(player, currentTick);
          if (Object.keys(rotted).length) {
            player.emit('resource:rotted', { player, rotted });
          }
        });
      });
    },
  },
};