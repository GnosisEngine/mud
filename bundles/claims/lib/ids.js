// bundles/ranvier-storage/lib/ids.js
'use strict';

const { nanoid } = require('nanoid');

// ID length — 8 chars gives 64^8 = ~281 trillion combinations, plenty for a MUD
const ID_LENGTH = 8;

/**
 * Each generator produces a prefixed nanoid.
 * Prefix is a single char + underscore, keeping IDs short but debuggable.
 *
 * c_4xZ9kPmQ  → claim
 * l_3kPqYcWm  → collateral listing
 */

const generateClaimId = () => `c_${nanoid(ID_LENGTH)}`;
const generateCollateralId = () => `l_${nanoid(ID_LENGTH)}`;

module.exports = {
  generateClaimId,
  generateCollateralId,
};
