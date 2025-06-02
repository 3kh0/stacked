const supabase = require("../lib/supabase.js");
const { itemEmoji } = require("../functions/itemEmoji.js");
const { getInv, addItems, takeItems, hasItems } = require("../functions/inventory.js");
const { fixCurrency } = require("../functions/fix.js");
const { findItem } = require("../functions/item.js");
const { drawTier } = require("../functions/drawTier.js");
const { drawItem } = require("../functions/drawItem.js");
const crypto = require("crypto");
const usersTable = process.env.SUPABASE_USERS_TABLE;

function s(min, max) {
  const b = crypto.randomBytes(4);
  return Math.floor((b.readUInt32BE(0) / 0xffffffff) * (max - min + 1)) + min;
}

module.exports = async function useCommand({ args, respond, command }) {
  if (!args[0]) {
    await respond(":red-x: Please specify an item to use, e.g. `/stacked use bandage` or `/stacked use piggy x2`.");
    return;
  }

  let itemName = args[0].toLowerCase();
  let quantity = 1;

  if (args[1] && args[1].toLowerCase().startsWith("x")) {
    const qtyStr = args[1].toLowerCase().substring(1);
    const parsedQty = parseInt(qtyStr);
    if (isNaN(parsedQty) || parsedQty < 1 || parsedQty > 100) {
      await respond(":red-x: Please specify a number between 1 and 100 (e.g., `x2`, `x5`).");
      return;
    }
    quantity = parsedQty;
  }

  const target = findItem(itemName);
  if (!target) {
    await respond(`:red-x: No usable item found for: \`${itemName}\``);
    return;
  }

  const slack_uid = command.user_id;
  let { data: user, error } = await supabase
    .from(usersTable)
    .select("hp, slack_uid")
    .eq("slack_uid", slack_uid)
    .single();
  if (error || !user) {
    await respond(":red-x: You are not registered! Please run `/stacked start` to begin playing.");
    return;
  }
  const inv = await getInv(slack_uid);

  if (target.type === "box") {
    const hasBox = await hasItems(slack_uid, { item: target.name, qty: quantity });
    if (!hasBox) {
      await respond(
        `:red-x: You do not have ${quantity > 1 ? `${quantity}` : "any"} ${itemEmoji(target.name)} \`${target.name}\` to open.`,
      );
      return;
    }

    if (quantity === 1) {
      const rarity = drawTier(target.tier); // floor is box tier
      const unboxed = drawItem(rarity, { noBox: true });
      const label = {
        common: ":stk_common_c::stk_common_o::stk_common_m::stk_common_m::stk_common_o::stk_common_n:",
        uncommon:
          ":stk_uncommon_u::stk_uncommon_n::stk_uncommon_c::stk_uncommon_o::stk_uncommon_m::stk_uncommon_m::stk_uncommon_o::stk_uncommon_n:",
        rare: ":stk_rare_r::stk_rare_a::stk_rare_r::stk_rare_e:",
        ultra_rare:
          ":stk_ultrarare_u::stk_ultrarare_l::stk_ultrarare_t::stk_ultrarare_r::stk_ultrarare_a:   :stk_ultrarare_r::stk_ultrarare_a::stk_ultrarare_r::stk_ultrarare_e:",
        epic: ":stk_epic_e::stk_epic_p::stk_epic_i::stk_epic_c:",
      };
      await takeItems(slack_uid, { item: target.name, qty: 1 });
      const updatedInv = await addItems(slack_uid, { item: unboxed, qty: 1 });
      if (updatedInv.length === 0) {
        await respond(`:red-x: Failed to open the box. Please try again.`);
        return;
      }

      await respond(
        `${label[rarity] || rarity.charAt(0).toUpperCase() + rarity.slice(1)} ${itemEmoji(unboxed)} \`${unboxed}\` unboxed from your ${itemEmoji(target.name)} \`${target.name}\`!`,
      );
      return;
    }

    const re = {
      common: ":stk_common_c:",
      uncommon: ":stk_uncommon_u:",
      rare: ":stk_rare_r:",
      ultra_rare: ":stk_ultrarare_u:",
      epic: ":stk_epic_e:",
    };

    const unboxedItems = {};
    let totalValue = 0;

    for (let i = 0; i < quantity; i++) {
      const rarity = drawTier(target.tier); // floor is box tier
      const unboxed = drawItem(rarity, { noBox: true });

      if (unboxedItems[unboxed]) {
        unboxedItems[unboxed].qty++;
      } else {
        const item = findItem(unboxed);
        let value = 0;
        if (item) {
          if (typeof item.value === "number") value = item.value;
          else if (typeof item.buy === "number") value = item.buy;
          else if (typeof item.sell === "number") value = item.sell;
        }
        unboxedItems[unboxed] = {
          qty: 1,
          rarity: rarity,
          value: value,
        };
      }

      const item = findItem(unboxed);
      if (item) {
        let value = 0;
        if (typeof item.value === "number") value = item.value;
        else if (typeof item.buy === "number") value = item.buy;
        else if (typeof item.sell === "number") value = item.sell;
        totalValue += value;
      }
    }

    await takeItems(slack_uid, { item: target.name, qty: quantity });
    for (const [itemName, itemData] of Object.entries(unboxedItems)) {
      await addItems(slack_uid, { item: itemName, qty: itemData.qty });
    }

    const boxText = quantity > 1 ? `*${quantity}* \`${target.name}\`es` : `\`${target.name}\``;
    let responseText = `You have unboxed the following items from your ${itemEmoji(target.name)} ${boxText}:\n`;

    for (const [itemName, itemData] of Object.entries(unboxedItems)) {
      const qtyText = itemData.qty > 1 ? ` (x${itemData.qty})` : "";
      responseText += `${re[itemData.rarity]} ${itemEmoji(itemName)} ${itemName}${qtyText}\n`;
    }

    responseText += `\nTotal value of unboxed items: *${fixCurrency(totalValue)}*`;

    await respond(responseText);
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
    const hasHealItem = await hasItems(slack_uid, { item: target.name, qty: 1 });
    if (!hasHealItem) {
      await respond(`:red-x: You do not have any ${itemEmoji(target.name)} \`${target.name}\` to use.`);
      return;
    }
    await takeItems(slack_uid, { item: target.name, qty: 1 });
    const heala = s(target.heal.min, target.heal.max);
    const healed = Math.min(heala, 100 - chp);
    const nhp = Math.min(chp + healed, 100);
    await supabase.from(usersTable).update({ hp: nhp }).eq("slack_uid", slack_uid);
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
      const b = crypto.randomBytes(4);
      const out = b.readUInt32BE(0) / 0xffffffff;
      return Math.round((out * (max - min) + min) * 100) / 100;
    }

    const hasMoneyItem = await hasItems(slack_uid, { item: target.name, qty: quantity });
    if (!hasMoneyItem) {
      await respond(
        `:red-x: You do not have ${quantity > 1 ? `${quantity}` : "any"} ${itemEmoji(target.name)} \`${target.name}\` to use.`,
      );
      return;
    }

    await takeItems(slack_uid, { item: target.name, qty: quantity });

    let total = 0;
    for (let i = 0; i < quantity; i++) {
      total += r(target.money.min, target.money.max);
    }
    total = Math.round((total + Number.EPSILON) * 100) / 100;

    let { data: userData, error: balError } = await supabase
      .from(usersTable)
      .select("balance")
      .eq("slack_uid", slack_uid)
      .single();
    if (balError || !userData) {
      await respond(":red-x: Could not update your balance. Please try again later.");
      return;
    }
    const newBalance = Math.round(((userData.balance || 0) + total + Number.EPSILON) * 100) / 100;
    await supabase.from(usersTable).update({ balance: newBalance }).eq("slack_uid", slack_uid);

    const itemText =
      quantity > 1
        ? `*${quantity}* ${itemEmoji(target.name)} \`${target.name}\`s`
        : `${itemEmoji(target.name)} \`${target.name}\``;
    await respond(`You found *${fixCurrency(total)}* in your ${itemText} and now have *${fixCurrency(newBalance)}*!`);
    return;
  }

  // =================
  // Handle attack items
  // =================
  if (target.type === "melee" || target.type === "firearm") {
    if (quantity > 1) {
      await respond(
        ":red-x: You can only use one weapon at a time for attacks. Please use `/stacked use weapon` without a quantity.",
      );
      return;
    }

    const attack = require("../functions/attack.js");
    await attack({ user, item: target, respond, inv });
    return;
  }

  await respond(`:red-x: ${itemEmoji(target.name)} *${target.name}* is not a usable item.`);
};
