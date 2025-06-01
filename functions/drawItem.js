const items = require("../lib/items.js");
const crypto = require("crypto");

function s() {
  const b = crypto.randomBytes(4);
  return b.readUInt32BE(0) / 0xffffffff;
}

/**
 * pick item provided rarity pool
 * @param {string} rarity - pool to pick from
 * @param {object} [opts] - options
 * @param {boolean} [opts.noBox] - do not include boxes in pool
 * @returns {string|null} - item name or null
 */
function drawItem(rarity, opts = {}) {
  let pool = items.filter((item) => item.tier === rarity);
  if (opts.noBox) {
    pool = pool.filter((item) => item.type !== "box");
  }
  if (pool.length === 0) return null; // this should not happen
  const chosen = pool[Math.floor(s() * pool.length)];
  return chosen.name;
}

module.exports = { drawItem };
