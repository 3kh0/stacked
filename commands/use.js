const supabase = require("../lib/supabase.js");
const { itemEmoji } = require("../functions/itemEmoji.js");
const { getInv, addItems, takeItems } = require("../functions/inventory.js");
const { fixCurrency } = require("../functions/fix.js");
const { findItem } = require("../functions/item.js");
const { drawTier } = require("../functions/drawTier.js");
const { drawItem } = require("../functions/drawItem.js");

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = async function useCommand({ args, respond, command }) {
  if (!args[0]) {
    await respond(":red-x: Please specify an item to use, e.g. `/stacked use painkillers`.");
    return;
  }
  const itemName = args[0].toLowerCase();
  const target = findItem(itemName);
  if (!target) {
    await respond(`:red-x: No usable item found for: \`${itemName}\``);
    return;
  }

  const slack_uid = command.user_id;
  let { data: user, error } = await supabase.from("users").select("hp, slack_uid").eq("slack_uid", slack_uid).single();
  if (error || !user) {
    await respond(":red-x: Please register first! Use `/stacked welcome` to get started.");
    return;
  }
  const inv = await getInv(slack_uid);

  if (target.type === "box") {
    const idx = inv.findIndex((i) => i.item === target.name);
    if (idx === -1 || inv[idx].qty < 1) {
      await respond(`:red-x: You do not have any ${itemEmoji(target.name)} \`${target.name}\` to open.`);
      return;
    }

    const rarity = drawTier(target.tier); // floor is box tier
    const unboxed = drawItem(rarity, { noBox: true });
    const label = {
      common: ":stk_common_c::stk_common_o::stk_common_m::stk_common_m::stk_common_o::stk_common_n:",
      uncommon:
        ":stk_uncommon_u::stk_uncommon_n::stk_uncommon_c::stk_uncommon_o::stk_uncommon_m::stk_uncommon_m::stk_uncommon_o::stk_uncommon_n:",
      rare: ":stk_rare_r::stk_rare_a::stk_rare_r::stk_rare_e:",
      ultra_rare:
        ":stk_ultrarare_u::stk_ultrarare_l::stk_ultrarare_t::stk_ultrarare_r::stk_ultrarare_a: :stk_ultrarare_r::stk_ultrarare_a::stk_ultrarare_r::stk_ultrarare_e:",
      epic: ":stk_epic_e::stk_epic_p::stk_epic_i::stk_epic_c:",
    };
    await takeItems(slack_uid, { item: target.name, qty: 1 });
    await addItems(slack_uid, { item: unboxed, qty: 1 });
    await respond(
      `${label[rarity] || rarity.charAt(0).toUpperCase() + rarity.slice(1)} ${itemEmoji(unboxed)} \`${unboxed}\` unboxed from your ${itemEmoji(target.name)} \`${target.name}\`!`,
    );
    return;
  }

  // =================
  // Handle usable items
  // =================
  if (target.type === "heal") {
    const chp = user.hp ?? 100;
    if (chp >= 100) {
      await respond(":red-x: You are already at full health!");
      return;
    }
    // Remove one from inv for the healing item
    const idx = inv.findIndex((i) => i.item === target.name);
    if (idx === -1 || inv[idx].qty < 1) {
      await respond(`:red-x: You do not have any ${itemEmoji(target.name)} \`${target.name}\` to use.`);
      return;
    }
    await takeItems(slack_uid, { item: target.name, qty: 1 });
    const heala = randomInt(target.heal.min, target.heal.max);
    const healed = Math.min(heala, 100 - chp);
    const nhp = Math.min(chp + healed, 100);
    await supabase.from("users").update({ hp: nhp }).eq("slack_uid", slack_uid);
    await respond(
      `You used a ${itemEmoji(target.name)} \`${target.name}\` and healed *${healed} HP*! (HP: *${chp} → ${nhp}*)`,
    );
    return;
  }

  // =================
  // Handle money items
  // =================
  if (target.type === "money") {
    function r(min, max) {
      // needed for 2 decimal places
      return Math.round((Math.random() * (max - min) + min) * 100) / 100;
    }
    const idx = inv.findIndex((i) => i.item === target.name);
    if (idx === -1 || inv[idx].qty < 1) {
      await respond(`:red-x: You do not have any ${itemEmoji(target.name)} \`${target.name}\` to use.`);
      return;
    }
    await takeItems(slack_uid, { item: target.name, qty: 1 });
    const found = r(target.money.min, target.money.max);
    let { data: userData, error: balError } = await supabase
      .from("users")
      .select("balance")
      .eq("slack_uid", slack_uid)
      .single();
    if (balError || !userData) {
      await respond(":red-x: Could not update your balance. Please try again later.");
      return;
    }
    const newBalance = (userData.balance || 0) + found;
    await supabase.from("users").update({ balance: newBalance }).eq("slack_uid", slack_uid);
    await respond(
      `You found *${fixCurrency(found)}* in your ${itemEmoji(target.name)} \`${target.name}\` and now have *${fixCurrency(newBalance)}*!`,
    );
    return;
  }

  // =================
  // Handle attack items
  // =================
  if (target.type === "melee" || target.type === "firearm") {
    const attack = require("../functions/attack.js");
    await attack({ user, item: target, respond });
    return;
  }

  await respond(`:red-x: ${itemEmoji(target.name)} *${target.name}* is not a usable item.`);
};
