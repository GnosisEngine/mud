// resources/lib/TradeLogic.js
'use strict';

const { TRADE_TIMEOUT_MS } = require('../constants');
const ResourceContainer = require('./ResourceContainer');

const _pending = new Map();

function _pendingKey(a, b) {
  return [a, b].sort().join('::');
}

function _hasPending(playerA, playerB) {
  return _pending.has(_pendingKey(playerA, playerB));
}

function initiate(initiator, target, resourceMap, options = {}) {
  const timeoutMs = options.timeoutMs !== undefined ? options.timeoutMs : TRADE_TIMEOUT_MS;
  const onTimeout = options.onTimeout || function () { };

  if (!Object.keys(resourceMap).length) {
    return { ok: false, reason: 'empty_offer' };
  }

  if (_hasPending(initiator, target)) {
    return { ok: false, reason: 'trade_already_pending' };
  }

  for (const [key, amount] of Object.entries(resourceMap)) {
    if (ResourceContainer.getAmount(initiator, key) < amount) {
      return { ok: false, reason: 'insufficient', key };
    }
  }

  const key = _pendingKey(initiator, target);
  const timer = setTimeout(() => {
    if (_pending.has(key)) {
      _pending.delete(key);
      onTimeout();
    }
  }, timeoutMs);

  _pending.set(key, { initiator, target, resourceMap, timer });

  return { ok: true };
}

function accept(initiator, target) {
  const key = _pendingKey(initiator, target);
  const trade = _pending.get(key);

  if (!trade) {
    return { ok: false, reason: 'no_pending_trade' };
  }

  clearTimeout(trade.timer);
  _pending.delete(key);

  const result = ResourceContainer.transfer(trade.initiator, trade.target, trade.resourceMap);
  if (!result.ok) {
    return { ok: false, reason: result.reason, key: result.key };
  }

  return { ok: true, resourceMap: trade.resourceMap };
}

function reject(initiator, target) {
  const key = _pendingKey(initiator, target);
  const trade = _pending.get(key);

  if (!trade) {
    return { ok: false, reason: 'no_pending_trade' };
  }

  clearTimeout(trade.timer);
  _pending.delete(key);

  return { ok: true };
}

function hasPending(playerA, playerB) {
  return _hasPending(playerA, playerB);
}

function clearAll() {
  for (const trade of _pending.values()) {
    clearTimeout(trade.timer);
  }
  _pending.clear();
}

module.exports = {
  initiate,
  accept,
  reject,
  hasPending,
  clearAll,
  TRADE_TIMEOUT_MS,
};