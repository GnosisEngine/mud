'use strict'

const { decorate } = require('../lib/RoomDecorator')
const { getItemEmoji, getNpcEmoji } = require('../lib/EmojiMapper')
const Colors = require('../../colors/lib/Colors')

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
          const emoji = getItemEmoji(item.keywords)
          const name  = item.roomDesc || item.name
          player.socket.write(`${Colors.rgb(180, 180, 160)} ${emoji} ${name}${Colors.RESET}\r\n`)
        }
      }

      if (room.npcs && room.npcs.size) {
        for (const npc of room.npcs) {
          const emoji = getNpcEmoji(npc.keywords)
          const name  = npc.roomDesc || npc.name
          const tags  = npc.keywords || []
          const color = tags.includes('friendly')                            ? Colors.named.green
                      : tags.includes('hostile') || tags.includes('aggro')  ? Colors.named.red
                      : tags.includes('vendor')  || tags.includes('shop')   ? Colors.named.blue
                      : Colors.named.orange
          player.socket.write(`${Colors.rgb(...color)} ${emoji} ${name}${Colors.RESET}\r\n`)
        }
      }

      for (const other of room.players) {
        if (other === player) continue
        player.socket.write(`${Colors.rgb(180, 220, 255)} • ${other.name} is here.${Colors.RESET}\r\n`)
      }
    }
  }
}