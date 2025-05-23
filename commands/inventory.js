const supabase = require("../lib/supabase.js");
const { findItem } = require("../functions/item.js");
const { itemEmoji } = require("../functions/itemEmoji.js");

module.exports = async ({ respond, command }) => {
  let slack_uid = command.user_id;
  let lookup = false;
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
      lookup = true;
    } else {
      await respond({
        text: ":red-x: Please just ping the user you want to look up, eg. `/stacked inventory @user`.",
      });
      return;
    }
  }

  let { data: user, error } = await supabase
    .from("users")
    .select("id, inventory, balance, hp, opt_status")
    .eq("slack_uid", slack_uid)
    .single();

  if (error || !user) {
    await respond({
      text: ":red-x: That user does not exist in the database, they might not have used the bot yet.",
    });
    return;
  }

  const inventory = user.inventory || [];
  const balance = user.balance !== undefined ? user.balance : 0;
  const hp = user.hp !== undefined ? user.hp : 100;
  const opt = user.opt_status ? "*:stk_optin: Opted In*" : ":stk_optout: Opted Out";

  // Group items by rarity
  const rarityMap = {
    common: [],
    uncommon: [],
    rare: [],
    epic: [],
    ultra_rare: [],
  };
  for (const invItem of inventory) {
    const item = findItem(invItem.item);
    if (item && rarityMap[item.tier]) {
      rarityMap[item.tier].push({ name: invItem.item, qty: invItem.qty });
    }
  }

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*<@${slack_uid}>'s inventory!*\n${lookup ? "They have" : "You have"} :moneybag: *${balance.toLocaleString(
          "en-US",
          {
            style: "currency",
            currency: "USD",
          },
        )}*, :heart: *${hp}* HP, and ${lookup ? "their" : "your"} ${opt}`,
      },
    },
    { type: "divider" },
  ];

  const rarityLabels = {
    common: ":stk_common_c:ommon",
    uncommon: ":stk_uncommon_u:ncommon",
    rare: ":stk_rare_r:are",
    ultra_rare: ":stk_ultrarare_u:ltra :stk_ultrarare_r:are",
    epic: ":stk_epic_e:pic",
  };

  const fields = [];
  function srt(a, b) {
    // most jank sort
    const special = /^[^a-zA-Z0-9]/;
    const aIsSpecial = special.test(a.name);
    const bIsSpecial = special.test(b.name);
    if (aIsSpecial && !bIsSpecial) return -1;
    if (!aIsSpecial && bIsSpecial) return 1;
    const aIsNum = /^[0-9]/.test(a.name);
    const bIsNum = /^[0-9]/.test(b.name);
    if (aIsNum && !bIsNum) return -1;
    if (aIsNum && bIsNum) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  }
  for (const tier of ["common", "uncommon", "rare", "ultra_rare", "epic"]) {
    if (rarityMap[tier].length > 0) {
      const sorted = rarityMap[tier].slice().sort(srt);
      const itemLines = sorted.map((i) => `${itemEmoji(i.name)} ${i.name} x${i.qty}`).join("\n");
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
      text: { type: "mrkdwn", text: `No items in inventory! :(` },
    });
  }

  await respond({ blocks });
};
