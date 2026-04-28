'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */
/** @typedef {import('types').RanvierWaypoint} RanvierWaypoint */

const { Broadcast: B } = require('ranvier');
const {
  hasCoordinates,
  isListCommand,
  isRemoveCommand,
  hasWaypointWithLabel,
  isWaypointSameRoom,
} = require('../logic');

const R    = '\x1b[0m';
const GOLD = '\x1b[38;2;255;215;0m';
const MINT = '\x1b[38;2;130;255;220m';
const ROSE = '\x1b[38;2;255;100;130m';
const MUTE = '\x1b[38;2;120;120;100m';

const WP_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

module.exports = {
  usage: 'waypoint [list | remove <label|#> | <label>]',
  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: (state) => (args, player) => {
    if (!player.metadata.waypoints) player.metadata.waypoints = [];
    const waypoints = player.metadata.waypoints;

    if (isListCommand({ args })) {
      if (!waypoints.length) return B.sayAt(player, `${MUTE}No waypoints saved.${R}`);
      B.sayAt(player, `${GOLD}Waypoints:${R}`);
      waypoints.forEach((w, i) => {
        B.sayAt(player, `  ${MINT}${WP_CHARS[i]}.${R} ${w.label} ${MUTE}(${w.areaId} ${w.coordinates.x},${w.coordinates.y},${w.coordinates.z})${R}`);
      });
      return;
    }

    if (isRemoveCommand({ args })) {
      const target = args.trim().slice(7).trim();

      const num = parseInt(target, 10);
      let idx = -1;
      if (!isNaN(num)) {
        idx = num < waypoints.length ? num : -1;
      } else {
        idx = waypoints.findIndex(w => w.label.toLowerCase() === target.toLowerCase());
      }

      if (idx === -1) return B.sayAt(player, `${ROSE}No waypoint "${target}".${R}`);
      const removed = waypoints.splice(idx, 1)[0];
      player.save();
      return B.sayAt(player, `${GOLD}Waypoint "${removed.label}" removed.${R}`);
    }

    if (!hasCoordinates(state, player)) {
      return B.sayAt(player, `${ROSE}This room cannot be waypointed.${R}`);
    }

    const label = args.trim();
    const entry = /** @type {RanvierWaypoint} */({
      label,
      roomId:      player.room?.entityReference,
      areaId:      player.room?.area.name,
      coordinates: { ...player.room?.coordinates }
    });

    if (hasWaypointWithLabel({ waypoints, label })) {
      const idx = waypoints.findIndex(w => w.label.toLowerCase() === label.toLowerCase());
      const old = waypoints[idx];

      if (isWaypointSameRoom(state, player, { old, entry })) {
        return B.sayAt(player, `${MUTE}Waypoint "${label}" already points here.${R}`);
      }

      waypoints[idx] = entry;
      player.save();
      return B.sayAt(player, `${GOLD}Waypoint "${label}" moved to current room.${R}`);
    }

    waypoints.push(entry);
    player.save();
    B.sayAt(player, `${GOLD}Waypoint "${label}" saved.${R}`);
  }
};
