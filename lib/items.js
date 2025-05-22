// Import all rarity item arrays
const commonItems = require("./items/common");
const uncommonItems = require("./items/uncommon");
const rareItems = require("./items/rare");
const ultraRareItems = require("./items/ultra_rare");
const epicItems = require("./items/epic");

const items = [...commonItems, ...uncommonItems, ...rareItems, ...ultraRareItems, ...epicItems];

module.exports = items;
