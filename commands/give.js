const supabase = require("../lib/supabase.js");
const { findItem } = require("../functions/item.js");
const { addItems } = require("../functions/inventory.js");
const { itemEmoji } = require("../functions/itemEmoji.js");

module.exports = async ({ respond, command, client }) => {
  if (command.user_id !== "U080A3QP42C") {
    await respond({ text: ":red-x: Nuh uh, nice try." });
    return;
  }

  const parts = command.text.trim().split(/\s+/);
  if (parts.length < 3) {
    await respond({ text: ":red-x: hint: /stacked give @user item x10" });
    return;
  }

  let userArg = parts[1];
  const escaped = userArg.match(/^<@([A-Z0-9]+)(?:\|[^>]+)?>$/);
  if (escaped) userArg = escaped[1];
  const match = userArg.match(/^U[A-Z0-9]{8,}$/);
  if (!match) {
    await respond({ text: ":red-x: mention a valid user" });
    return;
  }
  const target_uid = match[0];

  let qty = 1;
  let itemName = parts[2];
  if (parts.length > 3) {
    const last = parts[parts.length - 1];
    if (last.startsWith("x") && !isNaN(parseInt(last.slice(1), 10))) {
      qty = Math.max(1, parseInt(last.slice(1), 10));
      itemName = parts.slice(2, -1).join(" ");
    } else if (!isNaN(parseInt(last, 10))) {
      qty = Math.max(1, parseInt(last, 10));
      itemName = parts.slice(2, -1).join(" ");
    } else {
      itemName = parts.slice(2).join(" ");
    }
  }

  const item = findItem(itemName);
  if (!item) {
    await respond({ text: `:red-x: Item \`${itemName}\` does not exist.` });
    return;
  }

  const { data: user, error } = await supabase.from("users").select("slack_uid").eq("slack_uid", target_uid).single();
  if (error || !user) {
    await respond({ text: ":red-x: user not exist" });
    return;
  }

  await addItems(target_uid, { item: item.name, qty });
  await respond({
    text: `:okay-1: Gave *${qty}* ${itemEmoji(item.name)} \`${item.name}\` to <@${target_uid}>.`,
  });

  if (typeof client !== "undefined" && client && client.chat && client.conversations) {
    try {
      const dm = await client.conversations.open({ users: target_uid });
      await client.chat.postMessage({
        channel: dm.channel.id,
        text: `:yay: You receieved a airdrop of *${qty}* ${itemEmoji(item.name)} \`${item.name}\`! Check your inventory to see it.`,
      });
    } catch (e) {
      console.error("error on airdrop notify ", e);
    }
  }
};
