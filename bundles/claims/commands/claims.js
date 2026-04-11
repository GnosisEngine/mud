'use strict';
const { claimList } = require('./claim');

module.exports = {
  aliases: [],
  command: state => (args, player) => {
    return claimList(state, player);
  },
};
