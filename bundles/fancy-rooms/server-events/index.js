'use strict';

const { getTarget } = require('../lib/Targeter');

module.exports = {
  listeners: {
    startup: state => async() => {
      state.getTarget = getTarget;
    }
  }
};
