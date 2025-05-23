const supabase = require("../lib/supabase.js");
const { fixMoney } = require("../functions/fix.js");
const { takeItems } = require("../functions/inventory.js");
const { findItem } = require("../functions/item.js");
const { itemEmoji } = require("../functions/itemEmoji.js");

async function bal(slack_uid, bal) {
  return await supabase.from("users").update({ balance: bal }).eq("slack_uid", slack_uid);
}

module.exports = async ({ respond, command }) => {
  const slack_uid = command.user_id;
  const parts = command.text.split(" ");
  const itemName = parts[1];
  const qtyStr = parts[2];

  if (!itemName) {
    await respond({ text: ":red-x: You need to pick what item to sell!" });
    return;
  }

  let qty = 1;
  if (qtyStr) {
    // sell <item> <qty>
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
    .from("users")
    .select("id, inventory, balance")
    .eq("slack_uid", slack_uid)
    .single();

  if (error || !user) {
    await respond({
      text: ":red-x: Please register first! Use `/stacked welcome` to get started.",
    });
    return;
  }

  let balance = user.balance || 0;

  if (!item.sell) {
    await respond({
      text: `:red-x: ${itemEmoji(item.name)} \`${itemName}\` is not a sellable item!`,
    });
    return;
  }
  const inventory = user.inventory || [];
  const idx = inventory.findIndex((i) => i.item === item.name);
  if (idx === -1 || inventory[idx].qty < qty) {
    await respond({
      text: `:red-x: You do not have enough ${itemEmoji(item.name)} \`${item.name}\` to sell! You have *${inventory[idx]?.qty || 0}* and you want to sell *${qty}*.`,
    });
    return;
  }
  const totalGain = fixMoney(item.sell * qty);
  await takeItems(slack_uid, { item: item.name, qty });
  balance = fixMoney(balance + totalGain);
  await bal(slack_uid, balance);
  await respond({
    text: `:okay-1: You sold *${qty}* ${itemEmoji(item.name)} \`${item.name}\` for *${fixMoney(totalGain, true)}* and you now have *${fixMoney(balance, true)}*`,
  });
};
