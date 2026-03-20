'use strict';
const { renderStatusBar } = require('../lib/statusBar')

module.exports = {
  name: 'Paladin',
  description: 'Defenders of the Light. Paladins wield the favor of their god to heal the wounded, protect those in danger, and smite their enemies. They may not wield as much raw physical power as Warriors but their ability to keep themselves and others alive in the face of danger has no equal.',

  abilityTable: {
    3: { skills: ['judge'] },
    5: { skills: ['plea'] },
    7: { skills: ['smite'] },
  },

  setupPlayer: (state, player) => {
    const actionName = 'favor'
    // Paladins use Favor, with a max of 10. Favor is a generated resource and returns to 0 when out of combat
    const favor = state.AttributeFactory.create(actionName, 10, -10);
    player.addAttribute(favor);
    
    const refreshPrompt = () => {
      player.prompt = renderStatusBar(state, player, actionName);
    };

    refreshPrompt();
    player.on('attributeUpdate', refreshPrompt);
  }
};
