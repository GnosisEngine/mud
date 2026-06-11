// bundles/session/lib/linkMonitor.js
'use strict';

const { Config } = require('ranvier');
const { isEthereal, ownsSocket } = require('../logic');

function attach(state, stream) {
  stream.on('close', () => {
    const player = state.PlayerManager.getPlayersAsArray().find(p => ownsSocket(state, p, { stream }));

    if (!player || isEthereal(state, player)) {
      return;
    }

    const effect = state.EffectFactory.create('ethereal', { duration: Config.get('etherealGraceMs', 30000) });
    player.addEffect(effect);
  });
}

module.exports = { attach };
