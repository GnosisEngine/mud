'use strict'

const { decorate } = require('../lib/RoomDecorator')
const { getEmoji } = require('../lib/EmojiMapper')

module.exports = {
  aliases: ['l'],
  usage: 'look [target]',

  command(state) {
    return (args, player) => {
      if (args) {
        player.emit('look', args)
        return
      }

      const room = player.room
      if (!room) return player.socket.write('You are nowhere.\r\n')

      // check if this room is a saved waypoint
      const waypoints   = (player.metadata && player.metadata.waypoints) || []
      const matchedWp   = room.coordinates
        ? waypoints.find(w =>
            w.areaId === room.area.name &&
            w.coordinates.x === room.coordinates.x &&
            w.coordinates.y === room.coordinates.y &&
            w.coordinates.z === room.coordinates.z
          )
        : null

      player.socket.write(decorate(room, undefined, { waypointLabel: matchedWp ? matchedWp.label : null }) + '\r\n')

      if (room.items && room.items.size) {
        for (const item of room.items) {
          const emoji = getEmoji(item.keywords) || '•'
          const name  = item.roomDesc || item.name
          player.socket.write(`\x1b[38;2;180;180;160m ${emoji} ${name}\x1b[0m\r\n`)
        }
      }

      if (room.npcs && room.npcs.size) {
        for (const npc of room.npcs) {
          const emoji = getEmoji(npc.keywords) || '•'
          const name  = npc.roomDesc || npc.name
          player.socket.write(`\x1b[38;2;210;120;120m ${emoji} ${name}\x1b[0m\r\n`)
        }
      }

      for (const other of room.players) {
        if (other === player) continue
        player.socket.write(`\x1b[38;2;180;220;255m • ${other.name} is here.\x1b[0m\r\n`)
      }
    }
  }
}