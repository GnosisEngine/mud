'use strict'

const { decorate }  = require('../lib/RoomDecorator')
const { getEmoji }  = require('../lib/EmojiMapper')

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
      if (!room) {
        return player.socket.write('You are nowhere.\r\n')
      }

      player.socket.write(decorate(room) + '\r\n')

      // items
      if (room.items && room.items.size) {
        for (const item of room.items) {
          const emoji = getEmoji(item.keywords) || '•'
          const name  = item.roomDesc || item.name
          player.socket.write(`\x1b[38;2;180;180;160m ${emoji} ${name}\x1b[0m\r\n`)
        }
      }

      // npcs
      if (room.npcs && room.npcs.size) {
        for (const npc of room.npcs) {
          const emoji = getEmoji(npc.keywords) || '•'
          const name  = npc.roomDesc || npc.name
          player.socket.write(`\x1b[38;2;210;120;120m ${emoji} ${name}\x1b[0m\r\n`)
        }
      }

      // other players
      for (const other of room.players) {
        if (other === player) continue
        player.socket.write(`\x1b[38;2;180;220;255m • ${other.name} is here.\x1b[0m\r\n`)
      }
    }
  }
}