const items = require("../lib/items.js");
const { fixCurrency, fixTime } = require("../functions/fix.js");
const { findItem } = require("../functions/item.js");
const { itemEmoji } = require("../functions/itemEmoji.js");

module.exports = async ({ args, respond }) => {
  const itemName = args.join(" ");
  const item = findItem(itemName);
  if (!item) {
    await respond(`:red-x: Item not found: \`${itemName}\``);
    return;
  }

  const label = {
    common: ":stk_common_c:ommon",
    uncommon: ":stk_uncommon_u:ncommon",
    rare: ":stk_rare_r:are",
    ultra_rare: ":stk_ultrarare_u:ltra :stk_ultrarare_r:are",
    epic: ":stk_epic_e:pic",
  };
  const rarity = item.tier;
  const rarityLabel = label[rarity] || rarity;
  const emoji = itemEmoji(item.name);

  const fields = [];
  fields.push({
    type: "mrkdwn",
    text: `*Type*: ${item.type}`,
  });
  fields.push({
    type: "mrkdwn",
    text: `*Tier*: ${rarityLabel}`,
  });
  if (item.damage)
    fields.push({
      type: "mrkdwn",
      text: `*Min - Max Damage*: ${item.damage.min} - ${item.damage.max}`,
    });
  if (item.cooldown)
    fields.push({
      type: "mrkdwn",
      text: `*Cooldown*: ${fixTime(item.cooldown)}`,
    });
  if (item.ammo)
    fields.push({
      type: "mrkdwn",
      text: `*Ammo*: ${itemEmoji(item.ammo)} ${item.ammo}`,
    });
  if (item.used_for)
    fields.push({
      type: "mrkdwn",
      text: `*Used for*: ${item.used_for.map((u) => `${itemEmoji(u)} ${u}`).join("\n")}`,
    });
  if (item.heal)
    fields.push({
      type: "mrkdwn",
      text: `*Min - Max Heal*: ${item.heal.min} - ${item.heal.max}`,
    });
  if (item.money)
    fields.push({
      type: "mrkdwn",
      text: `*Min - Max Money*: ${fixCurrency(item.money.min)} - ${fixCurrency(item.money.max)}`,
    });
  if (item.value)
    fields.push({
      type: "mrkdwn",
      text: `*Value*: ${fixCurrency(item.value)}`,
    });
  if (item.buy)
    fields.push({
      type: "mrkdwn",
      text: `*Buy Price*: ${fixCurrency(item.buy)}`,
    });
  if (item.sell)
    fields.push({
      type: "mrkdwn",
      text: `*Sell Price*: ${fixCurrency(item.sell)}`,
    });

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} *${item.name}*`,
      },
    },
    {
      type: "section",
      fields,
    },
  ];

  await respond({ blocks });
};
