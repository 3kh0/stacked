const supabase = require("../lib/supabase.js");
const { itemEmoji } = require("./itemEmoji.js");
const { fixTime } = require("./fix.js");
const { getInv, takeItems } = require("./inventory.js");
const usersTable = process.env.SUPABASE_USERS_TABLE;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
  // why comments? i somehow got lost in this so it helps i swear plus vscode nesting
  // 1 check cooldown
  const { data: fUser, error: fetchError } = await supabase
    .from(usersTable)
    .select("attack_cooldown, hp, opt_status")
    .eq("slack_uid", user.slack_uid)
    .single();
  if (fetchError) {
    console.error(`Error fetching user ${user.slack_uid} for attack:`, fetchError);
    await respond(":red-x: Something went horribly wrong. Please report this to 3kh0.");
    return;
  }
  if (fUser?.opt_status === false) {
    await respond(":red-x: You must opt-in to PvP before attacking other players! Use `/stacked optin` to opt-in.");
    return;
  }
  const cdu = fUser?.attack_cooldown ? Number(fUser.attack_cooldown) : null;
  if (cdu && now < cdu) {
    const tl = fixTime(cdu - now);
    await respond(
      `:red-x: Woah there, you are on cooldown! You can attack again in *${tl}*. Each weapon has a different cooldown time, you can check this by using \`/stacked item <item_name>\`.`,
    );
    return;
  }
  if (fUser?.hp !== undefined && fUser.hp <= 0) {
    console.error(`User ${user.slack_uid} is dead and tried to attack.`);
    await respond(":red-x: Something went horribly wrong. Please report this to 3kh0.");
    return;
  }

  // 2 find valid targets
  const { data: users, error } = await supabase
    .from(usersTable)
    .select("slack_uid, hp, inventory, opt_status")
    .eq("opt_status", true);
  if (error || !users || users.length < 2) {
    await respond(":red-x: No valid targets found for attack.");
    return;
  }
  const targets = users.filter((u) => u.slack_uid !== user.slack_uid && (u.hp ?? 100) > 0);
  if (targets.length === 0) {
    await respond(":red-x: No valid targets found for attack.");
    return;
  }
  // 3 russian roulette
  const target = targets[Math.floor(Math.random() * targets.length)];

  // 4 check weapon and see what type it is
  const attacker = user.slack_uid;
  const weapon = item;
  if (weapon.type === "firearm") {
    const inv = await getInv(attacker);
    if (inv.findIndex((i) => i.item === weapon.ammo && i.qty > 0) === -1) {
      await respond(
        `:red-x: You need at least 1 ${itemEmoji(String(weapon.ammo))} \`${weapon.ammo}\` to use this weapon!`,
      );
      return;
    }
    await takeItems(attacker, { item: weapon.ammo, qty: 1 });
  } else if (weapon.type === "melee") {
    const inv = await getInv(attacker);
    if (inv.findIndex((i) => i.item === weapon.name && i.qty > 0) === -1) {
      await respond(`:red-x: You do not have any ${itemEmoji(weapon.name)} \`${weapon.name}\` to use.`);
      return;
    }
    await takeItems(attacker, { item: weapon.name, qty: 1 });
  }

  // 5 dmg
  const dmg = weapon.damage ? randomInt(weapon.damage.min, weapon.damage.max) : 0;

  // 6 do damage
  const newHp = Math.max(0, (target.hp ?? 100) - dmg);
  await supabase.from(usersTable).update({ hp: newHp }).eq("slack_uid", target.slack_uid);
  // cooldown (only after successful attack)
  await supabase
    .from(usersTable)
    .update({ attack_cooldown: now + weapon.cooldown })
    .eq("slack_uid", user.slack_uid);

  // 7 notify on attack
  const { WebClient } = require("@slack/web-api");
  const sc = new WebClient(process.env.SLACK_BOT_TOKEN);
  const dm = await sc.conversations.open({ users: target.slack_uid });
  await sc.chat.postMessage({
    channel: dm.channel.id,
    text: `${`<@${user.slack_uid}>`}'s ${itemEmoji(String(weapon.name))} \`${weapon.name}\` dealt *${dmg} damage* to you and you have *${newHp} HP* remaining.`,
  });

  // 8 check if dead and loot
  if (newHp === 0) {
    const { lootUser, lootBlock } = require("./looting.js");
    // Fetch full victim and killer user objects (with id, inventory, balance)
    const { data: victimUser } = await supabase
      .from(usersTable)
      .select("slack_uid, inventory, balance")
      .eq("slack_uid", target.slack_uid)
      .single();
    const { data: killerUser } = await supabase
      .from(usersTable)
      .select("slack_uid, inventory, balance")
      .eq("slack_uid", user.slack_uid)
      .single();
    // Run looting
    const lootResult = lootUser(victimUser, killerUser);
    // Update both users in DB
    await supabase
      .from(usersTable)
      .update({ balance: lootResult.updatedVictim.balance, opt_status: false, hp: 100 })
      .eq("slack_uid", target.slack_uid);
    await supabase
      .from(usersTable)
      .update({ balance: lootResult.updatedKiller.balance })
      .eq("slack_uid", user.slack_uid);
    const blocks = lootBlock({
      killer: killerUser,
      victim: victimUser,
      weapon,
      summary: lootResult.summary,
      money: lootResult.money,
    });
    await respond({ blocks });
    await respond({
      text: `:skull: You killed <@${target.slack_uid}> with ${itemEmoji(weapon.name)} \`${weapon.name}\` and looted their inventory!`,
    });
    await sc.chat.postMessage({
      channel: dm.channel.id,
      blocks,
      text: `You were killed by <@${user.slack_uid}> and looted!`,
    });
  } else {
    // not kill, still notify
    await respond({
      text: `You attacked <@${target.slack_uid}> with ${itemEmoji(weapon.name)} \`${weapon.name}\` and dealt *${dmg} damage*, leaving them with *${newHp} HP* remaining.`,
    });
  }
};
