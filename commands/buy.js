const supabase = require("../lib/supabase.js");
const { fixMoney } = require("../functions/fix.js");
const { addItems } = require("../functions/inventory.js");
const { findItem } = require("../functions/item.js");
const { itemEmoji } = require("../functions/itemEmoji.js");

async function bal(slack_uid, newBalance) {
  return await supabase.from("users").update({ balance: newBalance }).eq("slack_uid", slack_uid);
}

module.exports = async ({ respond, command }) => {
  const slack_uid = command.user_id;
  const [itemName, qtyStr] = command.text.split(" ");

  if (!itemName) {
    await respond({ text: ":red-x: You need to pick what item to buy!" });
    return;
  }

  let qty = 1;
  if (qtyStr) {
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
    .select(" inventory, balance")
    .eq("slack_uid", slack_uid)
    .single();

  if (error || !user) {
    await respond({
      text: ":red-x: Could not fetch your user data. Are you registered?",
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
  await addItems(slack_uid, { item: item.name, qty });
  balance = fixMoney(balance - totalCost);
  await bal(slack_uid, balance);
  await respond({
    text: `:okay-1: You bought *${qty}* ${itemEmoji(item.name)} \`${item.name}\` for *${fixMoney(totalCost, true)}* and you now have *${fixMoney(balance, true)}*`,
  });
};
