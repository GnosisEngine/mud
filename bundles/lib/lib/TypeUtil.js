'use strict';

module.exports = {
  withinRange(value, min, max) {
    return isNaN(value) || value < min || value > max;
  }
};

