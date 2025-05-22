const { itemEmoji } = require("./itemEmoji.js");
const itemsList = require("../lib/items.js");
const { fixMoney } = require("./fix.js");
const { addItems, takeItems } = require("./inventory.js");
// this shit so jank i gotta redo it

function lootUser(victim, killer) {
  let victimInv = (victim.inventory || []).map((entry) => ({
    name: entry.item || entry.name,
    qty: entry.qty || 0,
  }));
  let killerInv = (killer.inventory || []).map((entry) => ({
    name: entry.item || entry.name,
    qty: entry.qty || 0,
  }));

  const totalQty = victimInv.reduce((sum, i) => sum + i.qty, 0);
  const lootQty = Math.floor(totalQty / 3);
  let qtyToLoot = lootQty;
  let lootSummary = [];

  let flatItems = [];
  victimInv.forEach((item, idx) => {
    for (let i = 0; i < item.qty; i++) {
      flatItems.push({ name: item.name, idx });
    }
  });

  for (let i = flatItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [flatItems[i], flatItems[j]] = [flatItems[j], flatItems[i]];
  }

  let lootCounts = {};
  for (let i = 0; i < qtyToLoot; i++) {
    const { name } = flatItems[i];
    lootCounts[name] = (lootCounts[name] || 0) + 1;
  }

  for (const [name, qty] of Object.entries(lootCounts)) {
    takeItems(victim.id, { item: name, qty });
    addItems(killer.id, { item: name, qty });
    lootSummary.push(`${itemEmoji(name)} \`${name}\` x${qty}`);
  }

  const victimMoney = victim.balance || 0;
  const lootMoney = Math.floor(victimMoney / 3);
  const newVictimMoney = victimMoney - lootMoney;
  const killerMoney = (killer.balance || 0) + lootMoney;

  return {
    lootSummary,
    lootMoney,
    updatedVictim: {
      ...victim,
      inventory: victimInv.filter((i) => i.qty > 0).map(({ name, qty }) => ({ name, qty })),
      balance: newVictimMoney,
    },
    updatedKiller: {
      ...killer,
      inventory: killerInv.filter((i) => i.qty > 0).map(({ name, qty }) => ({ name, qty })),
      balance: killerMoney,
    },
  };
}

function formatLootBlockKit({ killerId, victimId, weaponName, lootResult }) {
  const rarityLabels = {
    common: ":stk_common_c:ommon",
    uncommon: ":stk_uncommon_u:ncommon",
    rare: ":stk_rare_r:are",
    ultra_rare: ":stk_ultrarare_u:ltra :stk_ultrarare_r:are",
    epic: ":stk_epic_e:pic",
  };
  const itemsByRarity = {
    common: [],
    uncommon: [],
    rare: [],
    ultra_rare: [],
    epic: [],
  };
  for (const entry of lootResult.lootSummary || []) {
    const match = entry.match(/^(.*) `(.+)` x(\d+)/);
    if (match) {
      const [, emoji, name, qty] = match;
      const def = itemsList.find((i) => i.name === name);
      const tier = def?.tier || "common";
      itemsByRarity[tier]?.push({ emoji, name, qty });
    }
  }
  const total = (lootResult.lootSummary || []).reduce((sum, entry) => {
    const m = entry.match(/x(\d+)/);
    return sum + (m ? parseInt(m[1], 10) : 0);
  }, 0);
  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<@${killerId}> killed <@${victimId}> using ${itemEmoji(weaponName)} \`${weaponName}\` and looted *${total}* item${total === 1 ? "" : "s"}!`,
      },
    },
    { type: "divider" },
  ];
  for (const tier of ["common", "uncommon", "rare", "ultra_rare", "epic"]) {
    const items = itemsByRarity[tier];
    if (items && items.length > 0) {
      const lines = items.map((i) => `${i.emoji} \`${i.name}\` x${i.qty}`).join("\n");
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${rarityLabels[tier]}*\n${lines}\n‍‍‎`,
        },
      });
    }
  }
  if (lootResult.lootMoney && lootResult.lootMoney > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:moneybag: *Looted ${fixMoney(lootResult.lootMoney, true)}*`,
      },
    });
  }
  return { blocks };
}

/**
 * format results
 * @param {object} params - { killer, victim, weapon, lootSummary, lootMoney }
 * @returns {object[]} blocks
 */
function formatLootBlockKit({ killer, victim, weapon, lootSummary, lootMoney }) {
  // killer, victim: { slack_uid }
  // weapon: { name, tier } or string name
  // lootSummary: array of strings like ':emoji: `name` xN'
  // lootMoney: number

  const rarityOrder = ["common", "uncommon", "rare", "ultra_rare", "epic"];
  const rarityLabels = {
    common: ":stk_common_c:ommon",
    uncommon: ":stk_uncommon_u:ncommon",
    rare: ":stk_rare_r:are",
    ultra_rare: ":stk_ultrarare_u:ltra :stk_ultrarare_r:are",
    epic: ":stk_epic_e:pic",
  };
  const itemsByRarity = {
    common: [],
    uncommon: [],
    rare: [],
    ultra_rare: [],
    epic: [],
  };
  lootSummary.forEach((line) => {
    const match = line.match(/`([^`]+)`/);
    if (match) {
      const name = match[1];
      const def = itemsList.find((i) => i.name === name);
      const tier = def?.tier || "common";
      itemsByRarity[tier].push(line);
    }
  });
  let totalItems = 0;
  lootSummary.forEach((line) => {
    const m = line.match(/x(\d+)/);
    if (m) totalItems += parseInt(m[1], 10);
  });

  // head
  const headline = `*<@${killer.slack_uid}> killed <@${victim.slack_uid}> using ${itemEmoji(weaponName)} \`${weaponName}\` and looted *${totalItems}* item${totalItems === 1 ? "" : "s"}${lootMoney > 0 ? ` (+:moneybag: $${fixMoney(lootMoney)})` : ""}`;
  const blocks = [
    {
      type: "section",
      text: { type: "mrkdwn", text: headline },
    },
    { type: "divider" },
  ];
  let anyItems = false;
  for (const rarity of rarityOrder) {
    if (itemsByRarity[rarity].length > 0) {
      anyItems = true;
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${rarityLabels[rarity]}*\n${itemsByRarity[rarity].join("\n")}\n‍‍‎`,
        },
      });
    }
  }
  if (!anyItems) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `No items looted!` },
    });
  }
  return blocks;
}

module.exports = { lootUser, formatLootBlockKit };
