const { findItem } = require("../functions/item.js");
const { fixCurrency } = require("../functions/fix.js");
const supabase = require("../lib/supabase.js");
const { itemEmoji } = require("../functions/itemEmoji.js");

module.exports = async ({ respond, command }) => {
  let slack_uid = command.user_id;
  const args = command.text ? command.text.trim().split(/\s+/) : [];
  if (args.length > 1) {
    let arg = args[1];
    // match <@U1234|user> or <@U1234>
    const escaped = arg.match(/^<@([A-Z0-9]+)(?:\|[^>]+)?>$/);
    if (escaped) {
      arg = escaped[1];
    }
    const match = arg.match(/^U[A-Z0-9]{8,}$/);
    if (match && match[0] !== command.user_id) {
      slack_uid = match[0];
    } else {
      await respond({
        text: ":red-x: Please just ping the user you want to look up, eg. `/stacked value @user`.",
      });
      return;
    }
  }

  let { data: user, error } = await supabase
    .from("users")
    .select("id, inventory, balance")
    .eq("slack_uid", slack_uid)
    .single();

  if (error || !user) {
    await respond({
      text: ":red-x: That user does not exist in the database, they might not have used the bot yet.",
    });
    return;
  }

  const inventory = user.inventory || [];
  let total = 0;
  let lines = [];
  const order = ["epic", "ultra_rare", "rare", "uncommon", "common"];
  const labels = {
    epic: ":stk_epic_e:pic",
    ultra_rare: ":stk_ultrarare_u:ltra :stk_ultrarare_r:are",
    rare: ":stk_rare_r:are",
    uncommon: ":stk_uncommon_u:ncommon",
    common: ":stk_common_c:ommon",
  };
  const map = { epic: [], ultra_rare: [], rare: [], uncommon: [], common: [] };
  for (const invItem of inventory) {
    const item = findItem(invItem.item);
    if (!item) continue;
    let value = null;
    if (typeof item.value === "number") value = item.value;
    else if (typeof item.buy === "number") value = item.buy;
    else if (typeof item.sell === "number") value = item.sell;
    if (typeof value === "number") {
      map[item.tier]?.push({
        name: item.name,
        qty: invItem.qty,
        value,
        emoji: itemEmoji(item.name),
        subtotal: value * invItem.qty,
      });
    }
  }

  for (const tier of order) {
    if (map[tier].length > 0) {
      map[tier].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      lines.push(`*${labels[tier]}*`);
      for (const i of map[tier]) {
        total += i.subtotal;
        lines.push(`${i.emoji} ${i.name} x${i.qty} = ${fixCurrency(i.subtotal)}`);
      }
      lines.push("");
    }
  }

  const balance = typeof user.balance === "number" ? user.balance : 0;
  total += balance;
  lines.push(`:moneybag: Cash: *${fixCurrency(balance)}*`);
  lines.push(`\nTotal Net Worth: *${fixCurrency(total)}*`);
  await respond({
    text: `:moneybag: <@${slack_uid}>'s Net Worth\n` + lines.join("\n"),
  });
};
