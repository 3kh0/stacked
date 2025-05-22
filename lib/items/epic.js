// Epic rarity items
const epicItems = [
  {
    type: "box",
    name: "epic_box",
    tier: "epic",
    sell: 37230.51,
    alias: ["eb", "epicbox", "epbox", "epic_b", "epic"],
  },
  {
    type: "firearm",
    name: "awp",
    tier: "epic",
    ammo: ".308_winchester_bullet",
    damage: { min: 65, max: 80 },
    cooldown: 10197, // 2:47:57
    sell: 29101.5,
    alias: ["awp"],
  },
  {
    type: "firearm",
    name: "barrett_m82",
    tier: "epic",
    ammo: ".50_bmg_bullet",
    damage: { min: 75, max: 85 },
    cooldown: 11120, // 3:05:20 in seconds
    sell: 32112.0,
    alias: ["barrett", "m82", "barrettm82", "barrett_m82", "barr"],
  },
  {
    type: "firearm",
    name: "ar-50",
    tier: "epic",
    ammo: ".50_bmg_bullet",
    damage: { min: 72, max: 82 },
    cooldown: 10703, // 2:58:23 in seconds
    sell: 30907.8,
    alias: ["ar50", "ar-50", "ar_50", "ar"],
  },
  {
    type: "firearm",
    name: ".44_magnum",
    tier: "epic",
    ammo: ".44_magnum_bullet",
    damage: { min: 55, max: 75 },
    cooldown: 9035, // 2:30:35 in seconds
    sell: 26091.0,
    alias: ["44", "magnum", "44mag", "44magnum", "44_magnum"],
  },
];

module.exports = epicItems;
