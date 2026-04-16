'use strict';

const humanize = (sec) => { return require('humanize-duration')(sec, { round: true }); };
const sprintf = require('sprintf-js').sprintf;
const { Broadcast: B, Room, Item, ItemType, Logger, Player } = require('ranvier');
const ArgParser = require('../../lib/lib/ArgParser');
const ItemUtil = require('../../lib/lib/ItemUtil');
const {
  isBriefMode,
  hasMinimap,
  isDoorBlocked,
  isContainerClosed,
  hasInventory,
} = require('../logic');

module.exports = {
  usage: 'look [thing]',
  command: state => (args, player) => {
    if (!player.room || !(player.room instanceof Room)) {
      Logger.error(player.name + ' is in limbo.');
      return B.sayAt(player, 'You are in a deep, dark void.');
    }

    if (args) {
      return lookEntity(state, player, args);
    }

    lookRoom(state, player);
  }
};

function getCompass(player) {
  const room = player.room;
  const exitMap = new Map([
    ['east', 'E'], ['west', 'W'], ['south', 'S'], ['north', 'N'],
    ['up', 'U'], ['down', 'D'], ['southwest', 'SW'], ['southeast', 'SE'],
    ['northwest', 'NW'], ['northeast', 'NE'],
  ]);

  const directionsAvailable = room.exits.map(exit => exitMap.get(exit.direction));

  const exits = Array.from(exitMap.values()).map(exit => {
    if (directionsAvailable.includes(exit)) return exit;
    if (exit.length === 2 && exit.includes('E')) return ' -';
    if (exit.length === 2 && exit.includes('W')) return '- ';
    return '-';
  });

  let [E, W, S, N, U, D, SW, SE, NW, NE] = exits;
  U = U === 'U' ? '<yellow><b>U</yellow></b>' : U;
  D = D === 'D' ? '<yellow><b>D</yellow></b>' : D;

  return [
    `${NW}     ${N}     ${NE}`,
    `<yellow><b>${W}</b></yellow> <-${U}-(@)-${D}-> <yellow><b>${E}</b></yellow>`,
    `${SW}     ${S}     ${SE}\r\n`,
  ];
}

function lookRoom(state, player) {
  const room = player.room;

  if (player.room.coordinates) {
    B.sayAt(player, '<yellow><b>' + sprintf('%-65s', room.title) + '</b></yellow>');
    B.sayAt(player, B.line(60));
  } else {
    const [line1, line2, line3] = getCompass(player);
    B.sayAt(player, '<yellow><b>' + sprintf('%-65s', room.title) + line1 + '</b></yellow>');
    B.sayAt(player, B.line(60) + B.line(5, ' ') + line2);
    B.sayAt(player, B.line(65, ' ') + '<yellow><b>' + line3 + '</b></yellow>');
  }

  if (!isBriefMode(state, player)) {
    B.sayAt(player, room.description, 80);
  }

  if (hasMinimap(state, player)) {
    B.sayAt(player, '');
    state.CommandManager.get('map').execute(4, player);
  }

  B.sayAt(player, '');

  room.players.forEach(otherPlayer => {
    if (otherPlayer === player) return;
    let combatantsDisplay = '';
    if (otherPlayer.isInCombat()) {
      combatantsDisplay = getCombatantsDisplay(otherPlayer);
    }
    B.sayAt(player, '[Player] ' + otherPlayer.name + combatantsDisplay);
  });

  room.items.forEach(item => {
    if (item.hasBehavior('resource')) {
      B.sayAt(player, `[${ItemUtil.qualityColorize(item, 'Resource')}] <magenta>${item.roomDesc}</magenta>`);
    } else {
      B.sayAt(player, `[${ItemUtil.qualityColorize(item, 'Item')}] <magenta>${item.roomDesc}</magenta>`);
    }
  });

  room.npcs.forEach(npc => {
    let hasNewQuest, hasActiveQuest, hasReadyQuest;
    if (npc.quests) {
      hasNewQuest   = npc.quests.find(questRef => state.QuestFactory.canStart(player, questRef));
      hasReadyQuest = npc.quests.find(questRef =>
        player.questTracker.isActive(questRef) &&
        player.questTracker.get(questRef).getProgress().percent >= 100
      );
      hasActiveQuest = npc.quests.find(questRef =>
        player.questTracker.isActive(questRef) &&
        player.questTracker.get(questRef).getProgress().percent < 100
      );

      if (hasNewQuest || hasActiveQuest || hasReadyQuest) {
        let questString = '';
        questString += hasNewQuest    ? '[<b><yellow>!</yellow></b>]' : '';
        questString += hasActiveQuest ? '[<b><yellow>%</yellow></b>]' : '';
        questString += hasReadyQuest  ? '[<b><yellow>?</yellow></b>]' : '';
        B.at(player, questString + ' ');
      }
    }

    let combatantsDisplay = '';
    if (npc.isInCombat()) {
      combatantsDisplay = getCombatantsDisplay(npc);
    }

    let npcLabel = 'NPC';
    switch (true) {
      case (player.level - npc.level > 4):  npcLabel = '<cyan>NPC</cyan>'; break;
      case (npc.level - player.level > 9):  npcLabel = '<b><black>NPC</black></b>'; break;
      case (npc.level - player.level > 5):  npcLabel = '<red>NPC</red>'; break;
      case (npc.level - player.level > 3):  npcLabel = '<yellow>NPC</yellow>'; break;
      default:                               npcLabel = '<green>NPC</green>'; break;
    }
    B.sayAt(player, `[${npcLabel}] ` + npc.name + combatantsDisplay);
  });

  B.at(player, '[<yellow><b>Exits</yellow></b>: ');

  const exits = room.getExits();
  const foundExits = [];
  for (const exit of exits) {
    if (foundExits.find(fe => fe.direction === exit.direction)) continue;
    foundExits.push(exit);
  }

  B.at(player, foundExits.map(exit => {
    const exitRoom = state.RoomManager.getRoom(exit.roomId);
    const door = room.getDoor(exitRoom) || (exitRoom && exitRoom.getDoor(room));
    return isDoorBlocked(state, player, { door }) ? '(' + exit.direction + ')' : exit.direction;
  }).join(' '));

  if (!foundExits.length) B.at(player, 'none');
  B.sayAt(player, ']');
}

function lookEntity(state, player, args) {
  const room = player.room;
  args = args.split(' ');
  const search = args.length > 1 ? (args[0] === 'in' ? args[1] : args[0]) : args[0];

  let entity = ArgParser.parseDot(search, room.items);
  entity = entity || ArgParser.parseDot(search, room.players);
  entity = entity || ArgParser.parseDot(search, room.npcs);
  entity = entity || ArgParser.parseDot(search, player.inventory);

  if (!entity) return B.sayAt(player, "You don't see anything like that here.");

  if (entity instanceof Player) {
    B.sayAt(player, `You see fellow player ${entity.name}.`);
    return;
  }

  B.sayAt(player, entity.description, 80);

  if (entity.timeUntilDecay) {
    B.sayAt(player, `You estimate that ${entity.name} will rot away in ${humanize(entity.timeUntilDecay)}.`);
  }

  const usable = entity.getBehavior('usable');
  if (usable) {
    if (usable.spell) {
      const useSpell = state.SpellManager.get(usable.spell);
      if (useSpell) {
        useSpell.options = usable.options;
        B.sayAt(player, useSpell.info(player));
      }
    }
    if (usable.effect && usable.config.description) B.sayAt(player, usable.config.description);
    if (usable.charges) B.sayAt(player, `There are ${usable.charges} charges remaining.`);
  }

  if (entity instanceof Item) {
    switch (entity.type) {
      case ItemType.WEAPON:
      case ItemType.ARMOR:
        return B.sayAt(player, ItemUtil.renderItem(state, entity, player));
      case ItemType.CONTAINER: {
        if (!hasInventory(state, entity)) {
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
}

function getCombatantsDisplay(entity) {
  const combatantsList = [...entity.combatants.values()].map(combatant => combatant.name);
  return `, <red>fighting </red>${combatantsList.join('<red>,</red> ')}`;
}
