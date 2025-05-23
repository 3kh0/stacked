const { drawTier } = require("../functions/drawTier.js");
const { drawItem } = require("../functions/drawItem.js");
const { itemEmoji } = require("../functions/itemEmoji.js");
const { addItems } = require("../functions/inventory.js");
const { findItem } = require("../functions/item.js");
const supabase = require("../lib/supabase.js");
const { fixTime } = require("../functions/fix.js");

async function check(slack_uid) {
  const { data, error } = await supabase.from("users").select("hourly_cooldown").eq("slack_uid", slack_uid).single();
  if (error) return { error };
  const now = Math.floor(Date.now() / 1000);
  const cdu = data?.hourly_cooldown ? Number(data.hourly_cooldown) : null;
  if (cdu && now < cdu) {
    return { cooldown: cdu - now };
  }
  return { cooldown: 0 };
}

async function set(slack_uid) {
  const now = Math.floor(Date.now() / 1000);
  return await supabase
    .from("users")
    .update({ hourly_cooldown: now + 3600 })
    .eq("slack_uid", slack_uid);
}

module.exports = async ({ respond, command }) => {
  const slack_uid = command.user_id;
  const { cooldown, error } = await check(slack_uid);
  if (error) {
    await respond(":red-x: Something went horribly wrong. Please report this to 3kh0.");
    return;
  }
  if (cooldown > 0) {
    const timeLeft = fixTime(cooldown);
    await respond(`:red-x: You are on cooldown! You can claim your hourly drop again in *${timeLeft}*.`);
    return;
  }
  const item = drawItem(drawTier("common"), { noBox: true });
  await addItems(slack_uid, { item: item, qty: 1 });
  await set(slack_uid);
  const labels = {
    common: ":stk_common_c::stk_common_o::stk_common_m::stk_common_m::stk_common_o::stk_common_n:",
    uncommon:
      ":stk_uncommon_u::stk_uncommon_n::stk_uncommon_c::stk_uncommon_o::stk_uncommon_m::stk_uncommon_m::stk_uncommon_o::stk_uncommon_n:",
    rare: ":stk_rare_r::stk_rare_a::stk_rare_r::stk_rare_e:",
    ultra_rare:
      ":stk_ultrarare_u::stk_ultrarare_l::stk_ultrarare_t::stk_ultrarare_r::stk_ultrarare_a:   :stk_ultrarare_r::stk_ultrarare_a::stk_ultrarare_r::stk_ultrarare_e:",
    epic: ":stk_epic_e::stk_epic_p::stk_epic_i::stk_epic_c:",
  };
  const itemObj = findItem(item);
  const tier = itemObj ? itemObj.tier : "common";
  await respond(
    `You just unboxed a ${labels[tier] || tier} ${itemEmoji(item)} *${item}*! You may use this command again *in a hour* try to get a better item!`,
  );
};
