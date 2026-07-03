'use strict';

/**
 * Intro event — first screen shown on connect.
 *
 * The MOTD is intentionally not shown here; it is displayed at the top of the
 * character-selection screen instead. This screen goes straight to the account
 * name prompt.
 */
module.exports = {
  event: () => socket => {
    return socket.emit('login', socket);
  }
};
