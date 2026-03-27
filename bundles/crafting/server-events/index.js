// resources/server-events/index.js
'use strict';

const TerrainResolver = require('../lib/TerrainResolver');
const SpawnLoop = require('../lib/SpawnLoop');
const NpcDeathHandler = require('../lib/NpcDeathHandler');
const ResourceRot = require('../lib/ResourceRot');
const startupPoll = require('../../lib/lib/StartupPoll');

const ROT_POLL_TICK_MS = 1000;

module.exports = {
  listeners: {
    startup: state => () => startupPoll(
      () => state.WorldManager,
      async () => {
        TerrainResolver.init(room => state.WorldManager.getTerrainForRoom(room));

        setInterval(() => SpawnLoop.tick(state), SpawnLoop.SPAWN_TICK_MS);

        setInterval(() => {
          // @TODO
          // const currentTick = state.ClockBundle.getCurrentTick();
          // for (const [, player] of state.PlayerManager.players) {
          //   const { rotted } = ResourceRot.processEntity(player, currentTick);
          //   if (Object.keys(rotted).length) {
          //     player.emit('resource:rotted', { player, rotted });
          //   }
          // }
        }, ROT_POLL_TICK_MS);

        // @todo
        // state.MobManager.on('npcCreated', npc => {
        //   npc.on('killed', () => NpcDeathHandler.handleKilled(npc, state));
        // });

        state.PlayerManager.on('playerEnter', player => {
          // @TODO
          // player.on('enter', () => {
          //   const currentTick = state.ClockBundle.getCurrentTick();
          //   const { rotted } = ResourceRot.processEntity(player, currentTick);
          //   if (Object.keys(rotted).length) {
          //     player.emit('resource:rotted', { player, rotted });
          //   }
          // });
        });
      }
    )
  }
};
