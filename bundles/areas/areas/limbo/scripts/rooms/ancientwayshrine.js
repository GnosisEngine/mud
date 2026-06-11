'use strict';

const { Broadcast } = require('ranvier');

module.exports = {
  listeners: {
    channelReceive: state => /** @this {import('types').RanvierRoom} */ function(channel, sender, message) {
      if (channel.name !== 'say') {
        return;
      }

      if (!message.toLowerCase().match('mellon')) {
        return;
      }

      const downExit = this.getExits().find(exit => exit.direction === 'down');

      if (downExit) {
        const downRoom = state.RoomManager.getRoom(downExit.roomId);

        Broadcast.sayAt(sender, "You have spoken 'friend', you may enter. The trap door opens with a *click*");
        downRoom.unlockDoor(this);
        downRoom.openDoor(this);
      }
    },
  }
};
