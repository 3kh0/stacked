// One-stop shop to find an item by name or alias
const items = require("../lib/items.js");

function findItem(input) {
  if (!input) return null;
  const lowerInput = input.toLowerCase();
  // Strict match by name
  let found = items.find((item) => item.name.toLowerCase() === lowerInput);
  if (found) return found;
  // Match by alias
  return (
    items.find((item) => Array.isArray(item.alias) && item.alias.some((a) => a.toLowerCase() === lowerInput)) || null
  );
}

module.exports = { findItem, items };
