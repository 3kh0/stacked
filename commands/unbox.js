const supabase = require("../lib/supabase.js");
const { drawTier } = require("../functions/drawTier.js");
const { drawItem } = require("../functions/drawItem.js");
const { itemEmoji } = require("../functions/itemEmoji.js");
const { addItems } = require("../functions/inventory.js");
const { findItem } = require("../functions/item.js");

module.exports = async ({ respond, command }) => {
  const item = drawItem(drawTier("common"), { noBox: true });

  const slack_uid = command.user_id;
  await addItems(slack_uid, { item: item, qty: 1 });

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
