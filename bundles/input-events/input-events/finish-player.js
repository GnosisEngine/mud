'use strict';

// bundles/input-events/input-events/finish-player.js

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

const fs = require('fs');
const path = require('path');
const { Config, Player, Logger, PlayerRoles } = require('ranvier');

const _dataDir = path.resolve(__dirname, '../../../data/player');

/**
 * Returns true if no player files exist yet — i.e. this is the first
 * character ever created and should bootstrap as ADMIN.
 * @returns {boolean}
 */
function _isFirstCharacter() {
  try {
    const files = fs.readdirSync(_dataDir);
    return files.filter(f => f.endsWith('.json')).length === 0;
  } catch (_) {
    // directory doesn't exist yet — definitely the first character
    return true;
  }
}

/**
 * Finish player creation. Add the character to the account then add the player
 * to the game world
 */
module.exports = {
  event: state => {
    const startingRoomRef = Config.get('startingRoom');
    if (!startingRoomRef) {
      Logger.error('No startingRoom defined in ranvier.json');
    }

    return async(socket, args) => {
      let player = new Player({
        name: args.name,
        account: args.account,
      });


      // TIP:DefaultAttributes: This is where you can change the default attributes for players
      const defaultAttributes = {
        health: 100,
        strength: 20,
        agility: 20,
        intellect: 20,
        stamina: 20,
        armor: 0,
        critical: 0
      };

      for (const attr in defaultAttributes) {
        player.addAttribute(state.AttributeFactory.create(attr, defaultAttributes[attr]));
      }

      args.account.addCharacter(args.name);
      args.account.save();

      player.setMeta('class', args.playerClass);

      if (_isFirstCharacter()) {
        player.role = PlayerRoles.ADMIN;
        Logger.log(`Bootstrap: assigning ADMIN role to first character '${player.name}'.`);
      }

      const room = state.RoomManager.getRoom(startingRoomRef);
      player.room = room;
      await state.PlayerManager.save(player);

      // reload from manager so events are set
      player = await state.PlayerManager.loadPlayer(state, player.account, player.name);
      player.socket = socket;

      socket.emit('done', socket, { player });
    };
  }
};
