'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { fuzzyMatch, getTarget } = require(path.join(__dirname, '../lib/Targeter.js'));

function makeRoom({ exits = [], items = [], players = [], npcs = [] } = {}) {
  return {
    exits,
    items: new Set(items),
    players: new Set(players),
    npcs: new Set(npcs),
  };
}

// fuzzyMatch

describe('fuzzyMatch', () => {

  describe('guard clauses', () => {
    it('returns 0 for null texts', () => {
      assert.equal(fuzzyMatch(null, 'sword'), 0);
    });

    it('returns 0 for null query', () => {
      assert.equal(fuzzyMatch(['sword'], null), 0);
    });

    it('returns 0 for empty array', () => {
      assert.equal(fuzzyMatch([], 'sword'), 0);
    });

    it('returns 0 for empty query', () => {
      assert.equal(fuzzyMatch(['sword'], ''), 0);
    });
  });

  describe('single string (backwards compat)', () => {
    it('accepts a plain string, not just an array', () => {
      assert.equal(fuzzyMatch('sword', 'sword'), 100);
    });

    it('returns 100 case-insensitively via plain string', () => {
      assert.equal(fuzzyMatch('Sword', 'SWORD'), 100);
    });
  });

  describe('array of strings', () => {
    it('returns 100 for an exact match in the array', () => {
      assert.equal(fuzzyMatch(['axe', 'sword'], 'sword'), 100);
    });

    it('returns the max score across all strings', () => {
      const scoreAxe = fuzzyMatch(['axe'], 'sword');
      const scoreBoth = fuzzyMatch(['axe', 'sword'], 'sword');
      assert.ok(scoreBoth > scoreAxe, `expected max (${scoreBoth}) > single weak (${scoreAxe})`);
    });

    it('ignores null/undefined entries in the array', () => {
      assert.equal(fuzzyMatch([null, undefined, 'sword'], 'sword'), 100);
    });

    it('returns 0 when no string in the array matches', () => {
      assert.equal(fuzzyMatch(['axe', 'bow'], 'zzz'), 0);
    });
  });

  describe('exact matches', () => {
    it('returns 100 for identical strings', () => {
      assert.equal(fuzzyMatch(['sword'], 'sword'), 100);
    });

    it('returns 100 when query is a leading substring', () => {
      assert.equal(fuzzyMatch(['swordfish'], 'sword'), 100);
    });
  });

  describe('no match', () => {
    it('returns 0 when no query chars appear in text', () => {
      assert.equal(fuzzyMatch(['axe'], 'zzz'), 0);
    });
  });

  describe('partial matches', () => {
    it('returns a score between 0 and 100 for a partial match', () => {
      const score = fuzzyMatch(['longsword'], 'lsw');
      assert.ok(score > 0 && score < 100, `expected score between 0 and 100, got ${score}`);
    });

    it('scores higher when matched chars are consecutive', () => {
      const consecutive = fuzzyMatch(['sword'], 'swo');
      const scattered = fuzzyMatch(['s_w_o_r_d'], 'swd');
      assert.ok(consecutive > scattered, `expected consecutive (${consecutive}) > scattered (${scattered})`);
    });

    it('scores a full completion higher than a partial completion', () => {
      const full = fuzzyMatch(['sword'], 'sword');
      const partial = fuzzyMatch(['sword'], 'sxord');
      assert.ok(full > partial, `expected full (${full}) > partial (${partial})`);
    });
  });

  describe('scoring properties', () => {
    it('always returns an integer', () => {
      const score = fuzzyMatch(['broadsword'], 'brd');
      assert.equal(score, Math.round(score));
    });

    it('never returns a score above 100', () => {
      assert.ok(fuzzyMatch(['x'], 'x') <= 100);
    });

    it('never returns a negative score', () => {
      assert.ok(fuzzyMatch(['axe'], 'z') >= 0);
    });
  });

});

// getTarget

describe('getTarget', () => {

  describe('empty room', () => {
    it('returns null when room has no entities', () => {
      assert.equal(getTarget(makeRoom(), 'sword'), null);
    });
  });

  describe('no matching entity', () => {
    it('returns null when nothing scores above 0', () => {
      const room = makeRoom({ items: [{ name: 'axe', description: '', roomDesc: '' }] });
      assert.equal(getTarget(room, 'zzzzz'), null);
    });
  });

  describe('exits', () => {
    it('finds an exit by direction', () => {
      const north = { direction: 'north' };
      const room = makeRoom({ exits: [north, { direction: 'south' }] });
      assert.equal(getTarget(room, 'north'), north);
    });

    it('fuzzy-matches a partial direction', () => {
      const north = { direction: 'north' };
      const room = makeRoom({ exits: [north, { direction: 'south' }] });
      assert.equal(getTarget(room, 'nor'), north);
    });

    it('finds an exit by keyword', () => {
      const gate = { direction: 'north', keywords: ['gate', 'iron gate'] };
      const room = makeRoom({ exits: [gate] });
      assert.equal(getTarget(room, 'gate'), gate);
    });
  });

  describe('items', () => {
    it('finds an item by name', () => {
      const sword = { name: 'iron sword', description: '', roomDesc: '' };
      const room = makeRoom({ items: [sword] });
      assert.equal(getTarget(room, 'sword'), sword);
    });

    it('finds an item by description', () => {
      const herb = { name: 'plant', description: 'a healing herb', roomDesc: '' };
      const room = makeRoom({ items: [herb] });
      assert.equal(getTarget(room, 'healing'), herb);
    });

    it('finds an item by roomDesc', () => {
      const chest = { name: 'box', description: '', roomDesc: 'A battered treasure chest sits here.' };
      const room = makeRoom({ items: [chest] });
      assert.equal(getTarget(room, 'chest'), chest);
    });

    it('finds an item by keyword', () => {
      const potion = { name: 'vial', description: '', roomDesc: '', keywords: ['potion', 'health potion'] };
      const room = makeRoom({ items: [potion] });
      assert.equal(getTarget(room, 'potion'), potion);
    });
  });

  describe('players', () => {
    it('finds a player by name', () => {
      const player = { name: 'Aldric' };
      const room = makeRoom({ players: [player] });
      assert.equal(getTarget(room, 'aldric'), player);
    });

    it('finds a player by keyword', () => {
      const player = { name: 'Aldric', keywords: ['blacksmith'] };
      const room = makeRoom({ players: [player] });
      assert.equal(getTarget(room, 'blacksmith'), player);
    });
  });

  describe('npcs', () => {
    it('finds an npc by name', () => {
      const guard = { name: 'city guard', description: '' };
      const room = makeRoom({ npcs: [guard] });
      assert.equal(getTarget(room, 'guard'), guard);
    });

    it('finds an npc by description', () => {
      const merchant = { name: 'old man', description: 'a travelling merchant' };
      const room = makeRoom({ npcs: [merchant] });
      assert.equal(getTarget(room, 'merchant'), merchant);
    });

    it('finds an npc by keyword', () => {
      const guard = { name: 'city guard', description: '', keywords: ['armored', 'soldier'] };
      const room = makeRoom({ npcs: [guard] });
      assert.equal(getTarget(room, 'soldier'), guard);
    });
  });

  describe('targets filter', () => {
    const sword = { name: 'sword', description: '', roomDesc: '' };
    const guard = { name: 'sword guard', description: '' };

    it('restricts search to items when targets=["item"]', () => {
      const room = makeRoom({ items: [sword], npcs: [guard] });
      assert.equal(getTarget(room, 'sword', ['item']), sword);
    });

    it('restricts search to npcs when targets=["npc"]', () => {
      const room = makeRoom({ items: [sword], npcs: [guard] });
      assert.equal(getTarget(room, 'sword', ['npc']), guard);
    });

    it('returns null when entity type is excluded', () => {
      const room = makeRoom({ items: [sword] });
      assert.equal(getTarget(room, 'sword', ['npc']), null);
    });

    it('accepts plural form of target type', () => {
      const room = makeRoom({ items: [sword] });
      assert.equal(getTarget(room, 'sword', ['items']), sword);
    });
  });

  describe('ranking', () => {
    it('returns the highest scoring entity', () => {
      const exact = { name: 'sword', description: '', roomDesc: '' };
      const weak = { name: 'rusty old blade', description: '', roomDesc: '' };
      const room = makeRoom({ items: [weak, exact] });
      assert.equal(getTarget(room, 'sword'), exact);
    });

    it('keyword match can beat a weak name match', () => {
      const byKeyword = { name: 'vial', description: '', roomDesc: '', keywords: ['sword'] };
      const weakName = { name: 'rusty old blade', description: '', roomDesc: '' };
      const room = makeRoom({ items: [weakName, byKeyword] });
      assert.equal(getTarget(room, 'sword'), byKeyword);
    });
  });

});
