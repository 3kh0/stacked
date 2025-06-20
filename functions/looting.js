const { itemEmoji } = require("./itemEmoji.js");
const itemsList = require("../lib/items.js");
const { fixMoney } = require("./fix.js");
const { addItems, takeItems } = require("./inventory.js");

async function lootUser(victim, killer) {
  console.log(`[loot] lootUser: victim.slack_uid=${victim.slack_uid}, killer.slack_uid=${killer.slack_uid}`);
  // 1 prepare vic inv
  let victimInv = (victim.inventory || []).map((entry) => ({
    name: entry.item || entry.name,
    qty: entry.qty || 0,
  }));

  // 2 sort items
  const rOrder = ["epic", "ultra_rare", "rare", "uncommon", "common"];
  function itemSort(a, b) {
    const aDef = itemsList.find((i) => i.name === a.name) || {};
    const bDef = itemsList.find((i) => i.name === b.name) || {};
    const aRar = rOrder.indexOf(aDef.tier || "common");
    const bRar = rOrder.indexOf(bDef.tier || "common");
    if (aRar !== bRar) return aRar - bRar;
    const aSpec = a.name.match(/[^a-zA-Z0-9]/) ? -1 : 0;
    const bSpec = b.name.match(/[^a-zA-Z0-9]/) ? -1 : 0;
    if (aSpec !== bSpec) return aSpec - bSpec;
    const aNum = a.name.match(/^\d/) ? 1 : 0;
    const bNum = b.name.match(/^\d/) ? 1 : 0;
    if (aNum !== bNum) return aNum - bNum;
    return a.name.localeCompare(b.name);
  }
  // flatten
  let fItems = [];
  victimInv.forEach((item) => {
    for (let i = 0; i < item.qty; i++) {
      fItems.push({ name: item.name });
    }
  });
  fItems.sort(itemSort);
  console.log(
    `[loot] Flattened and sorted items:`,
    fItems.map((i) => i.name),
  );

  // 3 take random item from each group of 3
  let lootCs = {};
  if (fItems.length === 0) {
    console.log(`[loot] victim has no items`);
  } else if (fItems.length < 3) {
    const ran = Math.floor(Math.random() * fItems.length);
    const name = fItems[ran].name;
    lootCs[name] = (lootCs[name] || 0) + 1;
  } else {
    for (let i = 0; i < fItems.length; i += 3) {
      const group = fItems.slice(i, i + 3);
      const ran = Math.floor(Math.random() * group.length);
      const name = group[ran].name;
      lootCs[name] = (lootCs[name] || 0) + 1;
    }
  }
  console.log(`[loot] loot counts:`, lootCs);

  // 4 transfer items
  let summary = [];
  for (const [name, qty] of Object.entries(lootCs)) {
    try {
      console.log(`[loot] take ${qty} of ${name} from victim.slack_uid=${victim.slack_uid}`);
      await takeItems(victim.slack_uid, { item: name, qty });

      console.log(`[loot] add ${qty} of ${name} to killer.slack_uid=${killer.slack_uid}`);
      await addItems(killer.slack_uid, { item: name, qty });

      const emoji = itemEmoji(name);
      summary.push(`${emoji} \`${name}\` x${qty}`);
    } catch (e) {
      console.error(`[loot] error on transfer ${name}: ${e.message}`);
      // when fail, try to restore to last safe state
      try {
        await addItems(victim.slack_uid, { item: name, qty });
        console.log(`[loot] restored ${qty} of ${name} to victim`);
      } catch (restoreError) {
        console.error(`[loot] FUCK! failed to restore ${name} to victim: `, restoreError);
      }
    }
  }

  // 5 take money
  const vicBal = victim.balance || 0;
  if (vicBal < 0) {
    console.warn(`[loot] victim has negative balance: ${vicBal}`);
  }

  const vicBalCents = Math.round(vicBal * 100);
  const moneyCents = Math.floor(vicBalCents / 3);
  const money = moneyCents / 100;
  const newVicBal = (vicBalCents - moneyCents) / 100;
  const killerMoney = Math.round(((killer.balance || 0) + money) * 100) / 100;
  console.log(`[loot] transfer $${money} from victim (now $${newVicBal}) to killer (now $${killerMoney})`);

  return {
    summary,
    money,
    updatedVictim: {
      ...victim,
      balance: newVicBal,
    },
    updatedKiller: {
      ...killer,
      balance: killerMoney,
    },
  };
}

/**
 * format results
 * @param {object} params - { killer, victim, weapon, summary, money }
 * @returns {object[]} blocks
 */
function lootBlock({ killer, victim, weapon, summary, money }) {
  const rOrder = ["common", "uncommon", "rare", "ultra_rare", "epic"];
  const rarityLabels = {
    common: ":stk_common_c:ommon",
    uncommon: ":stk_uncommon_u:ncommon",
    rare: ":stk_rare_r:are",
    ultra_rare: ":stk_ultrarare_u:ltra :stk_ultrarare_r:are",
    epic: ":stk_epic_e:pic",
  };
  const raritySort = {
    common: [],
    uncommon: [],
    rare: [],
    ultra_rare: [],
    epic: [],
  };
  summary.forEach((line) => {
    const match = line.match(/`([^`]+)`/);
    if (match) {
      const name = match[1];
      const def = itemsList.find((i) => i.name === name);
      const tier = def?.tier || "common";
      raritySort[tier].push(line);
    }
  });
  let totalItems = 0;
  summary.forEach((line) => {
    const m = line.match(/x(\d+)/);
    if (m) totalItems += parseInt(m[1], 10);
  });

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<@${killer.slack_uid}> killed <@${victim.slack_uid}> using ${itemEmoji(weapon.name || weapon)} \`${weapon.name || weapon}\` and looted *${totalItems}* item${totalItems === 1 ? "" : "s"} and *${fixMoney(money, true)}*`,
      },
    },
    { type: "divider" },
  ];

  const fields = [];
  for (const tier of rOrder) {
    if (raritySort[tier].length > 0) {
      const itemLines = raritySort[tier].join("\n");
      fields.push({
        type: "mrkdwn",
        text: `*${rarityLabels[tier]}*\n${itemLines}\n‍‍‎`, // zero height space
      });
    }
  }

  if (fields.length > 0) {
    blocks.push({
      type: "section",
      fields,
    });
  } else {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `No items looted! :(` },
    });
  }
  return blocks;
}

module.exports = { lootUser, lootBlock };
