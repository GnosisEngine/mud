'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

/**
 * @typedef {{ state: GameState, player: RanvierPlayer, input: string }} ContextManagerContext
 */

/**
 * @typedef {function(ContextManagerContext): any[] | Promise<any[]>} ContextSubscriber
 */

class ContextManager {
  /**
   * @param {{ timeout?: number }} [options]
   */
  constructor({ timeout = 5000 } = {}) {
    /** @type {ContextSubscriber[]} */
    this.subscribers = [];

    /** @type {number} */
    this.timeout = timeout;
  }

  /**
   * @param {ContextSubscriber} getItems
   * @returns {void}
   */
  register(getItems) {
    if (typeof getItems !== 'function') {
      throw new Error('Subscriber must be a function');
    }

    this.subscribers.push(getItems);
  }

  /**
   * @param {ContextManagerContext} context
   * @returns {any[]}
   */
  run(context) {
    const results = [];

    for (const fn of this.subscribers) {
      try {
        const res = fn(context);
        results.push(Array.isArray(res) ? res : []);
      } catch (e) {
        console.warn(e);
      }
    }

    return results.flat();
  }
}

/**
 * @param {string} command
 * @param {string} input
 * @returns {boolean}
 */
function check(command, input) {
  return command.startsWith(input) || input === '';
}

const ContextService = new ContextManager();

module.exports = { ContextService, check };
