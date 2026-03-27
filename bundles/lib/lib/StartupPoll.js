// bundle-lib/lib/startupPoll.js
'use strict';

const POLL_INTERVAL_MS = 50;
const POLL_TIMEOUT_MS = 5000;

/**
 * Defers execution until a condition is met, then calls onReady.
 * Rejects if the condition isn't met within the timeout window.
 *
 * @param {() => boolean} condition - Polled until it returns true
 * @param {() => void | Promise<void>} onReady - Called once condition passes
 * @param {number} [timeout=5000] - Max wait in ms before rejecting
 * @returns {Promise<void>}
 */
function startupPoll(condition, onReady, timeout = POLL_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;

    const poll = setInterval(async () => {
      if (condition()) {
        clearInterval(poll);
        try {
          await onReady();
          resolve();
        } catch (err) {
          reject(err);
        }
        return;
      }

      if (Date.now() > deadline) {
        clearInterval(poll);
        reject(new Error(
          `startupPoll timed out after ${timeout}ms — condition never became true`
        ));
      }
    }, POLL_INTERVAL_MS);
  });
}

module.exports = startupPoll;