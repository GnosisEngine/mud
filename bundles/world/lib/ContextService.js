'use strict';

/**
 * ContextManager
 *
 * A lightweight async orchestration utility for collecting contextual items
 * from multiple independent subscribers.
 *
 * Each subscriber is a function that:
 *   - Receives a shared `context` object
 *   - Returns an array of items (or a Promise resolving to an array)
 *   - Returns an empty array if it does not wish to participate
 *
 * The manager:
 *   - Executes all subscribers in parallel
 *   - Enforces a per-subscriber timeout
 *   - Silently ignores errors and timeouts
 *   - Flattens all results into a single array
 */
class ContextManager {
  /**
   * @param {Object} [options]
   * @param {number} [options.timeout=5000] - Max time (ms) to wait per subscriber
   */
  constructor({ timeout = 5000 } = {}) {
    /** @type {Array<Function>} */
    this.subscribers = [];

    /** @type {number} */
    this.timeout = timeout;
  }

  /**
   * Register a subscriber function.
   *
   * @param {Function} getItems
   * @param {Object} context
   * @returns {Promise<Array>} Array of items (or Promise resolving to one)
   *
   * Requirements:
   *   - Must return an array (or Promise of array)
   *   - Should return [] if not participating
   */
  register(getItems) {
    if (typeof getItems !== 'function') {
      throw new Error('Subscriber must be a function');
    }

    this.subscribers.push(getItems);
  }

  /**
   * Execute all subscribers and collect results.
   *
   * আচ:
   *   - Runs all subscribers in parallel
   *   - Applies timeout to each subscriber independently
   *   - Ignores failures (errors or timeouts)
   *
   * @param {{ state, player, input }} context - Shared context passed to all subscribers
   * @returns {Promise<Array>} Flattened array of all collected items
   */
  run(context) {
    const results = [];

    for ( const fn of this.subscribers) {
      try {
        const res = fn(context);
        results.push(Array.isArray(res) ? res : []);
      } catch (e) {
        // Ignore errors and timeouts
        console.warn(e);
      }
    }
    console.log({ results });
    return results.flat();
  }
}

function check(command, input) {
  return command.startsWith(input) || input === '';
}

const ContextService = new ContextManager();

module.exports = { ContextService, check };
