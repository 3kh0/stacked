const { addItems } = require("../functions/inventory.js");
const { itemEmoji } = require("../functions/itemEmoji.js");
const supabase = require("../lib/supabase.js");
const { fixTime } = require("../functions/fix.js");
const crypto = require("crypto");

const usersTable = process.env.SUPABASE_USERS_TABLE;

async function check(slack_uid) {
  const { data, error } = await supabase.from(usersTable).select("daily_cooldown").eq("slack_uid", slack_uid).single();
  if (error) return { error };
  const now = Math.floor(Date.now() / 1000);
  const cdu = data?.daily_cooldown ? Number(data.daily_cooldown) : null;
  if (cdu && now < cdu) {
    return { cooldown: cdu - now };
  }
  return { cooldown: 0 };
}

async function set(slack_uid) {
  const now = Math.floor(Date.now() / 1000);
  return await supabase
    .from(usersTable)
    .update({ daily_cooldown: now + 86400 })
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
    await respond(`:red-x: You are on cooldown! You can claim your daily reward again in *${timeLeft}*.`);
    return;
  }
  let item = "rare_box";
  let qty = 1;
  const b = crypto.randomBytes(4);
  const roll = b.readUInt32BE(0) / 0xffffffff;
  console.log("[daily] claimed by", slack_uid, "roll:", roll);
  if (roll < 0.01) {
    item = "ultra_rare_box";
    qty = 1;
    await addItems(slack_uid, { item, qty });
    await set(slack_uid);
    await respond(
      `:sparkles: Lucky! You have claimed *1* ${itemEmoji(item)} \`ultra_rare_box\` as your daily reward!\n_There is a 1% chance to get this reward!_`,
    );
    return;
  } else if (roll < 0.07) {
    qty = 2;
    await addItems(slack_uid, { item, qty });
    await set(slack_uid);
    await respond(
      `:gift: Lucky! You have claimed *2* ${itemEmoji(item)} \`rare_box\`es as your daily reward!\n_There is a 6% chance to get this reward!_`,
    );
    return;
  }
  await addItems(slack_uid, { item, qty });
  await set(slack_uid);
  await respond(
    `You have claimed *${qty}* ${itemEmoji(item)} \`rare_box\`${qty > 1 ? "es" : ""} as your daily reward!`,
  );
};
