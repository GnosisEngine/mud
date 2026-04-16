'use strict';

const { Broadcast: B, Item, ItemType } = require('ranvier');
// const ArgParser = require('../../lib/lib/ArgParser');
const ItemUtil = require('../../lib/lib/ItemUtil');
const { decorate } = require('../lib/RoomDecorator');
const { getItemEmoji, getNpcEmoji } = require('../lib/EmojiMapper');
const Colors = require('../../colors/lib/Colors');
const {
  isDoorBlocked,
  isPlayerEntity,
  isContainerEmpty,
  isContainerClosed,
  isRotting,
  hasMinimap,
  hasBehavior,
  isExit
} = require('../logic');

//  rot quantiles

function rotDescription(entity) {
  if (!entity.timeUntilDecay) return null;
  const sec = entity.timeUntilDecay / 1000;
  if (sec > 3600) return `${entity.name} looks perfectly fresh — no sign of decay yet.`;
  if (sec > 1800) return `${entity.name} carries a faint, stale smell. It won't last forever.`;
  if (sec > 600)  return `${entity.name} is visibly decaying. Dark patches spread across its surface.`;
  if (sec > 120)  return `${entity.name} is heavily rotted, reeking and barely holding together.`;
  return `${entity.name} is on the verge of collapse — crumbling and putrid.`;
}

//  radiance quantiles

function radianceDescription(charges) {
  if (charges >= 10) return 'It blazes with radiant energy, almost too bright to look at directly.';
  if (charges >= 6)  return 'It glows with a steady, warm light — plenty of power within.';
  if (charges >= 3)  return 'Its glow flickers occasionally, like a candle in a draft.';
  if (charges === 2) return 'A dim, unsteady glimmer clings to it. Nearly spent.';
  if (charges === 1) return 'A single faint pulse of light remains. One use left at most.';
  return 'It is cold and dark. Whatever radiance it once held is gone.';
}

//  entity look

function lookEntity(state, player, args) {
  const room = player.room;

  args = args.split(' ');
  let search = null;
  if (args.length > 1) {
    search = args[0] === 'in' ? args[1] : args[0];
  } else {
    search = args[0];
  }

  const entity = state.getTarget(player, search);

  if (!entity) {
    return B.sayAt(player, "You don't see anything like that here.");
  }

  if (isPlayerEntity(state, player, { entity })) {
    B.sayAt(player, `You see fellow player ${entity.name}.`);
    return;
  }

  if (isExit(state, player, { exit:  entity })) {
    const exitRoom = state.RoomManager.getRoom(entity.roomId);
    if (!exitRoom) return B.sayAt(player, "You can't make out anything in that direction.");

    const door = room.getDoor(exitRoom) || (exitRoom && exitRoom.getDoor(room));
    if (isDoorBlocked(state, player, { door })) {
      return B.sayAt(player, 'The door is closed.');
    }

    B.sayAt(player, decorate(exitRoom, undefined, { state }) + '\r\n');
    return;
  }

  B.sayAt(player, entity.description, 80);

  if (entity instanceof Item) {
    switch (entity.type) {
      case ItemType.WEAPON:
      case ItemType.ARMOR:
        return B.sayAt(player, ItemUtil.renderItem(state, entity, player));
      case ItemType.CONTAINER: {
        if (isContainerEmpty(state, player, { container: entity })) {
          return B.sayAt(player, `${entity.name} is empty.`);
        }
        if (isContainerClosed(state, player, { container: entity })) {
          return B.sayAt(player, 'It is closed.');
        }
        B.at(player, 'Contents');
        if (isFinite(entity.inventory.getMax())) {
          B.at(player, ` (${entity.inventory.size}/${entity.inventory.getMax()})`);
        }
        B.sayAt(player, ':');
        for (const [, item] of entity.inventory) {
          B.sayAt(player, '  ' + ItemUtil.display(item));
        }
        break;
      }
    }
  }

  if (isRotting(state, player, { entity })) {
    B.sayAt(player, rotDescription(entity));
  }

  const usable = hasBehavior(state, entity, { behavior: 'usable' });
  if (usable) {
    if (usable.spell) {
      const useSpell = state.SpellManager.get(usable.spell);
      if (useSpell) {
        useSpell.options = usable.options;
        B.sayAt(player, useSpell.info(player));
      }
    }

    if (usable.effect && usable.config.description) {
      B.sayAt(player, usable.config.description);
    }

    if (usable.charges) {
      B.sayAt(player, radianceDescription(usable.charges));
    }
  }
}

// room renderers

function describeItem(item) {
  const isResource = (item.hasBehavior && item.hasBehavior('resource')) || (item.getMeta && !!item.getMeta('resource'));
  const emoji = isResource ? '🪨 ' : getItemEmoji(item.keywords);
  const name = item.roomDesc || item.name;
  return `${Colors.rgb(180, 180, 160)} ${emoji} ${name}${Colors.RESET}`;
}

function describeNpc(npc, player, state) {
  const emoji = getNpcEmoji(npc.keywords);
  const name = npc.roomDesc || npc.name;
  const tags = npc.keywords || [];
  const color = tags.includes('friendly') ? Colors.named.green
    : tags.includes('hostile') || tags.includes('aggro') ? Colors.named.red
      : tags.includes('vendor') || tags.includes('shop') ? Colors.named.blue
        : Colors.named.orange;

  let badges = '';

  if (npc.quests) {
    const hasNew = npc.quests.find(ref => state.QuestFactory.canStart(player, ref));
    const hasReady = npc.quests.find(ref =>
      player.questTracker.isActive(ref) &&
      player.questTracker.get(ref).getProgress().percent >= 100
    );
    const hasActive = npc.quests.find(ref =>
      player.questTracker.isActive(ref) &&
      player.questTracker.get(ref).getProgress().percent < 100
    );
    if (hasNew)    badges += ' ❗';
    if (hasActive) badges += ' 📋';
    if (hasReady)  badges += ' ❓';
  }

  if (npc.isInCombat()) badges += ' ⚔️';

  return `${Colors.rgb(...color)} ${emoji} ${name}${badges}${Colors.RESET}`;
}

function describePlayer(other) {
  const combat = other.isInCombat() ? ' ⚔️' : '';
  return `${Colors.rgb(180, 220, 255)} 🧍 ${other.name}${combat}${Colors.RESET}`;
}

//  command

module.exports = {
  aliases: ['l'],
  usage: 'look [target]',

  command(state) {
    return (args, player) => {
      if (!!args) {
        lookEntity(state, player, args);
        return;
      }

      const room = player.room;
      if (!room) return player.socket.write('You are nowhere.\r\n');

      const waypoints = (player.metadata && player.metadata.waypoints) || [];
      const matchedWp = room.coordinates
        ? waypoints.find(w =>
          w.areaId === room.area.name &&
          w.coordinates.x === room.coordinates.x &&
          w.coordinates.y === room.coordinates.y &&
          w.coordinates.z === room.coordinates.z
        )
        : null;

      player.socket.write(decorate(room, undefined, {
        waypointLabel: matchedWp ? matchedWp.label : null,
        state,
      }) + '\r\n');

      if (hasMinimap(state, player)) {
        B.sayAt(player, '');
        state.CommandManager.get('map').execute(4, player);
      }

      if (room.items && room.items.size) {
        for (const item of room.items) {
          B.sayAt(player, describeItem(item));
        }
      }

      if (room.npcs && room.npcs.size) {
        for (const npc of room.npcs) {
          B.sayAt(player, describeNpc(npc, player, state));
        }
      }

      for (const other of room.players) {
        if (other === player) continue;
        B.sayAt(player, describePlayer(other));
      }
    };
  }
};
