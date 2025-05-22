/**
 * get emoji for item
 * @param {string} item - item name
 * @returns {string} - slack emoji
 */
function itemEmoji(item) {
  if (!item) return "";
  const clean = item.replace(/\./g, "");
  return `:stk_${clean}:`;
}

module.exports = { itemEmoji };
