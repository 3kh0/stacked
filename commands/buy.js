const supabase = require("../lib/supabase.js");
const { fixMoney } = require("../functions/fix.js");
const { addItems } = require("../functions/inventory.js");
const { findItem } = require("../functions/item.js");
const { itemEmoji } = require("../functions/itemEmoji.js");

const usersTable = process.env.SUPABASE_USERS_TABLE;

async function bal(slack_uid, bal) {
  return await supabase
    .from(usersTable)
    .update({ balance: Math.round((bal + Number.EPSILON) * 100) / 100 })
    .eq("slack_uid", slack_uid);
}

module.exports = async ({ respond, command }) => {
  const slack_uid = command.user_id;
  const parts = command.text.split(" ");
  const itemName = parts[1];
  const qtyStr = parts[2];

  if (!itemName) {
    await respond({ text: ":red-x: You need to pick what item to buy!" });
    return;
  }

  let qty = 1;
  if (qtyStr) {
    // buy <item> <qty>
    if (qtyStr.startsWith("x") && !isNaN(parseInt(qtyStr.slice(1), 10))) {
      qty = Math.max(1, parseInt(qtyStr.slice(1), 10));
    } else if (!isNaN(parseInt(qtyStr, 10))) {
      qty = Math.max(1, parseInt(qtyStr, 10));
    }
  }

  const item = findItem(itemName);

  if (!item) {
    await respond({ text: `:red-x: Item \`${itemName}\` does not exist.` });
    return;
  }

  let { data: user, error } = await supabase
    .from(usersTable)
    .select(" inventory, balance")
    .eq("slack_uid", slack_uid)
    .single();

  if (error || !user) {
    await respond({
      text: ":red-x: You are not registered! Please run `/stacked start` to begin playing.",
    });
    return;
  }

  let balance = user.balance || 0;

  if (!item.buy) {
    await respond({
      text: `:red-x: ${itemEmoji(item.name)} \`${itemName}\` is not a purchasable item!`,
    });
    return;
  }
  const totalCost = fixMoney(item.buy * qty);
  if (balance < totalCost) {
    await respond({
      text: `:red-x: You do not have enough money to buy *${qty}* ${itemEmoji(item.name)} \`${item.name}\`. You need *${fixMoney(totalCost, true)}*, but you only have *${fixMoney(balance, true)}*.`,
    });
    return;
  }

  const updated = await addItems(slack_uid, { item: item.name, qty });
  if (updated.length === 0) {
    await respond({
      text: `:red-x: Something went wrong, please try again later.`,
    });
    return;
  }

  balance = fixMoney(balance - totalCost);
  await bal(slack_uid, balance);
  await respond({
    text: `:okay-1: You bought *${qty}* ${itemEmoji(item.name)} \`${item.name}\` for *${fixMoney(totalCost, true)}* and you now have *${fixMoney(balance, true)}*`,
  });
};
