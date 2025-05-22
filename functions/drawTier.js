const order = ["common", "uncommon", "rare", "ultra_rare", "epic"];

/**
 * pick tier rarity based on floor
 * @param {string} floor - floor for tier
 * @returns {string} - choosen rarity
 */
function drawTier(floor = "common") {
  const startIdx = order.indexOf(floor);
  if (startIdx === -1) throw new Error("invalid floor");
  const rarities = order.slice(startIdx);

  // log, each step up is 1/5 from last
  let weight = 100;
  const weights = {};
  for (let i = 0; i < rarities.length; i++) {
    weights[rarities[i]] = Math.max(1, Math.floor(weight));
    weight /= 5;
  }

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (const [rarity, w] of Object.entries(weights)) {
    if (rand < w) return rarity;
    rand -= w;
  }
  return floor;
}

module.exports = { drawTier };
