const supabase = require("../lib/supabase.js");
const { itemEmoji } = require("./itemEmoji.js");
const { fixTime } = require("./fix.js");

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// this shit so jank i gotta redo it

/**
 * handle attack action.
 * @param {object} params
 * @param {object} params.user - attacking user row from DB
 * @param {object} params.item - item being used to attack
 * @param {function} params.respond - slack respond
 * @returns {Promise<void>}
 */
module.exports = async function attack({ user, item, respond }) {
  const now = Math.floor(Date.now() / 1000);

  const { data: fUser, error: fetchError } = await supabase
    .from("users")
    .select("attack_cooldown")
    .eq("slack_uid", user.slack_uid)
    .single();
  if (fetchError) {
    await respond(":red-x: Could not check your cooldown. Please try again later.");
    return;
  }
  const cdUntil = fUser?.attack_cooldown ? Number(fUser.attack_cooldown) : null;
  if (cdUntil) {
    const secDiff = cdUntil - now;
    if (now < cdUntil) {
      const timeLeft = fixTime(secDiff);
      await respond(
        `:red-x: Woah there, you are on cooldown! You can attack again in *${timeLeft}*. Each weapon has a different cooldown time, you can check this by using \`/stacked item <item_name>\`.`,
      );
      return;
    }
  }
  // actual attack logic
  // 1. find all valid targets
  const { data: users, error } = await supabase
    .from("users")
    .select("id, slack_uid, hp, inventory, opt_status")
    .eq("opt_status", true);
  if (error || !users || users.length < 2) {
    // up this later to 3
    await respond(":red-x: No valid targets found for attack.");
    return;
  }
  const targets = users.filter((u) => u.slack_uid !== user.slack_uid);
  if (targets.length === 0) {
    await respond(":red-x: No valid targets found for attack.");
    return;
  }
  // 2. pick random target
  const target = targets[Math.floor(Math.random() * targets.length)];

  // 3. calc damage taken
  const dmg = item.damage ? randomInt(item.damage.min, item.damage.max) : 0;
  if (!dmg) {
    await respond(":red-x: This item cannot be used to attack.");
    return;
  }

  // 4. ammo check
  let attackerInv = user.inventory || [];
  let ammoType = item.ammo;
  if (ammoType) {
    const ammoIdx = attackerInv.findIndex((i) => i.item === ammoType && i.qty > 0);
    if (ammoIdx === -1) {
      const ammoEmoji = itemEmoji(String(ammoType));
      await respond(`:red-x: You need at least 1 ${ammoEmoji} \`${ammoType}\` to use this weapon!`);
      return;
    }
    attackerInv[ammoIdx].qty -= 1;
    if (attackerInv[ammoIdx].qty <= 0) attackerInv.splice(ammoIdx, 1);
  }

  // 5. remove one time
  if (item.type === "melee") {
    const idx = attackerInv.findIndex((i) => i.item === item.name && i.qty > 0);
    if (idx !== -1) {
      attackerInv[idx].qty -= 1;
      if (attackerInv[idx].qty <= 0) attackerInv.splice(idx, 1);
    }
  }

  // 6. Inflict damage on target
  const targetHp = target.hp ?? 100;
  const newHp = Math.max(0, targetHp - dmg);
  await supabase.from("users").update({ hp: newHp }).eq("slack_uid", target.slack_uid);

  // --- Looting logic if target is killed ---
  if (newHp === 0) {
    // 1. Set opt_status to false and reset HP to 100
    await supabase.from("users").update({ opt_status: false, hp: 100 }).eq("slack_uid", target.slack_uid);
    const { data: victimUser } = await supabase
      .from("users")
      .select("id, slack_uid, inventory, balance")
      .eq("slack_uid", target.slack_uid)
      .single();
    const { data: killerUser } = await supabase
      .from("users")
      .select("id, slack_uid, inventory, balance")
      .eq("slack_uid", user.slack_uid)
      .single();
    const { lootUser } = require("./looting.js");
    const lootResult = lootUser(victimUser, killerUser);
    await supabase
      .from("users")
      .update({
        inventory: lootResult.updatedVictim.inventory,
        balance: lootResult.updatedVictim.balance,
      })
      .eq("slack_uid", target.slack_uid);
    await supabase
      .from("users")
      .update({
        inventory: lootResult.updatedKiller.inventory,
        balance: lootResult.updatedKiller.balance,
      })
      .eq("slack_uid", user.slack_uid);
    const { formatLootBlockKit } = require("./looting.js");
    const blocks = formatLootBlockKit({
      killer: killerUser,
      victim: victimUser,
      weapon: item,
      lootSummary: lootResult.lootSummary,
      lootMoney: lootResult.lootMoney,
    });
    await respond({ blocks });
    const { WebClient } = require("@slack/web-api");
    const token = process.env.SLACK_BOT_TOKEN;
    const slackClient = new WebClient(token);
    const dm = await slackClient.conversations.open({
      users: target.slack_uid,
    });
    await slackClient.chat.postMessage({
      channel: dm.channel.id,
      blocks,
      text: `You were killed by <@${user.slack_uid}> and looted!`,
    });
  }

  let cooldownSeconds = item.cooldown;
  const nextCooldown = now + cooldownSeconds;
  console.log("[ATTACK] Setting next cooldown (Unix Epoch):", nextCooldown);
  const { error: updateError } = await supabase
    .from("users")
    .update({ inventory: attackerInv, attack_cooldown: nextCooldown })
    .eq("slack_uid", user.slack_uid);
  if (updateError) {
    console.error("[ATTACK] Error updating cooldown:", updateError);
    await respond(":red-x: Failed to update your cooldown. Please try again later.");
    return;
  }

  const itemEmj = itemEmoji(String(item.name));
  const targetMention = `<@${target.slack_uid}>`;
  // Notify attacker
  await respond(
    `Your ${itemEmj} \`${item.name}\` dealt *${dmg} damage* to ${targetMention} and they have *${newHp} HP* remaining.`,
  );

  // Notify target
  const { WebClient } = require("@slack/web-api");
  const token = process.env.SLACK_BOT_TOKEN;
  const slackClient = new WebClient(token);
  const dm = await slackClient.conversations.open({ users: target.slack_uid });
  const attackerMention = `<@${user.slack_uid}>`;
  await slackClient.chat.postMessage({
    channel: dm.channel.id,
    text: `${attackerMention}'s ${itemEmj} \`${item.name}\` dealt *${dmg} damage* to you and you have *${newHp} HP* remaining.`,
  });
};
