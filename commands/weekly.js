const { addItems } = require("../functions/inventory.js");
const { itemEmoji } = require("../functions/itemEmoji.js");
const supabase = require("../lib/supabase.js");
const { fixTime } = require("../functions/fix.js");

async function check(slack_uid) {
  const { data, error } = await supabase.from("users").select("weekly_cooldown").eq("slack_uid", slack_uid).single();
  if (error) return { error };
  const now = Math.floor(Date.now() / 1000);
  const cdu = data?.weekly_cooldown ? Number(data.weekly_cooldown) : null;
  if (cdu && now < cdu) {
    return { cooldown: cdu - now };
  }
  return { cooldown: 0 };
}

async function set(slack_uid) {
  const now = Math.floor(Date.now() / 1000);
  return await supabase
    .from("users")
    .update({ weekly_cooldown: now + 604800 })
    .eq("slack_uid", slack_uid);
}

module.exports = async ({ respond, command }) => {
  const slack_uid = command.user_id;
  const { cooldown, error } = await check(slack_uid);
  if (error) {
    if (error.code === "PGRST116") {
      await respond(":red-x: You are not registered! Please run `/stacked start` to begin playing.");
    } else {
      await respond(":red-x: Something went horribly wrong. Please report this to 3kh0.");
      console.error("error on user: ", error);
    }
    return;
  }
  if (cooldown > 0) {
    const timeLeft = fixTime(cooldown);
    await respond(`:red-x: You are on cooldown! You can claim your weekly reward again in *${timeLeft}*.`);
    return;
  }
  let item = "ultra_rare_box";
  let qty = 1;
  const roll = Math.random();
  console.log("[weekly] claimed by", slack_uid, "roll:", roll);
  if (roll < 0.01) {
    item = "epic_box";
    qty = 1;
    await addItems(slack_uid, { item, qty });
    await set(slack_uid);
    await respond(
      `:star2: *MAX WIN!* You have claimed *1* ${itemEmoji(item)} \`epic_box\` as your weekly reward!\n_There is a 1% chance to get this reward!_`,
    );
    return;
  } else if (roll < 0.07) {
    qty = 2;
    await addItems(slack_uid, { item, qty });
    await set(slack_uid);
    await respond(
      `:gift: Lucky! You have claimed *2* ${itemEmoji(item)} \`ultra_rare_box\`es as your weekly reward!\n_There is a 6% chance to get this reward!_`,
    );
    return;
  }
  await addItems(slack_uid, { item, qty });
  await set(slack_uid);
  await respond(`You have claimed *${qty}* ${itemEmoji(item)} \`ultra_rare_box\` as your weekly reward!`);
};
