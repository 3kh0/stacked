const supabase = require("../lib/supabase.js");
const { itemEmoji } = require("./itemEmoji.js");
const { fixTime } = require("./fix.js");
const { getInv, takeItems } = require("./inventory.js");
const { findItem } = require("./item.js");
const crypto = require("crypto");
const usersTable = process.env.SUPABASE_USERS_TABLE;

function randomInt(min, max) {
  if (min > max) [min, max] = [max, min]; // swap if min > max
  const range = max - min + 1;
  const randomBytes = crypto.randomBytes(4);
  const randomValue = randomBytes.readUInt32BE(0);
  return Math.floor((randomValue / 0xffffffff) * range) + min;
}

async function calc(user) {
  const inventory = user.inventory || [];
  let total = 0;
  for (const invItem of inventory) {
    const item = findItem(invItem.item);
    if (!item) continue;
    let value = null;
    if (typeof item.value === "number") value = item.value;
    else if (typeof item.buy === "number") value = item.buy;
    else if (typeof item.sell === "number") value = item.sell;
    if (typeof value === "number") {
      total += value * invItem.qty;
    }
  }
  if (typeof user.balance === "number") total += user.balance;
  return total;
}

function russianRoulette(targets) {
  if (targets.length === 0) return null;
  if (targets.length === 1) return targets[0];

  const randomBytes = crypto.randomBytes(4);
  const randomValue = randomBytes.readUInt32BE(0);
  const index = Math.floor((randomValue / 0xffffffff) * targets.length);
  return targets[index];
}

/**
 * handle attack action.
 * @param {object} params
 * @param {object} params.user - attacking user row from DB
 * @param {object} params.item - item being used to attack
 * @param {function} params.respond - slack respond
 * @param {Array} [params.inv] - opt inv for attacker
 * @returns {Promise<void>}
 */
module.exports = async function attack({ user, item, respond, inv }) {
  const now = Math.floor(Date.now() / 1000);
  // why comments? i somehow got lost in this so it helps i swear plus vscode nesting
  // 1 check cooldown
  const { data: fUser, error: fetchError } = await supabase
    .from(usersTable)
    .select("attack_cooldown, hp, opt_status, inventory, balance")
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
    .select("slack_uid, hp, inventory, balance, opt_status")
    .eq("opt_status", true);
  if (error || !users || users.length < 2) {
    await respond(":red-x: No valid targets found for attack.");
    return;
  }

  let pTargets = users.filter((u) => u.slack_uid !== user.slack_uid && (u.hp ?? 100) > 0);
  if (pTargets.length === 0) {
    await respond(":red-x: No valid targets found for attack.");
    return;
  }

  const attackerValue = await calc(fUser);
  if (attackerValue < 25000) {
    await respond(
      ":red-x: You must have a net worth of at least *$25,000* (inventory + balance) to attack other players.",
    );
    return;
  }

  const vTargets = [];
  for (const target of pTargets) {
    const targetValue = await calc(target);
    if (targetValue >= 25000) {
      vTargets.push(target);
    }
  }

  if (vTargets.length === 0) {
    await respond(":red-x: No valid targets found for attack.");
    return;
  }

  // 3 russian roulette
  const target = russianRoulette(vTargets);

  // 4 check weapon and see what type it is
  const attacker = user.slack_uid;
  const weapon = item;
  const attackerInv = inv || (await getInv(attacker));
  if (weapon.type === "firearm") {
    const ammoTypes = Array.isArray(weapon.ammo) ? weapon.ammo : [weapon.ammo];
    const ammoItem = attackerInv.find((i) => ammoTypes.includes(i.item) && i.qty > 0);
    if (!ammoItem) {
      await respond(
        `:red-x: You need at least 1 ${itemEmoji(String(ammoTypes[0]))} \`${ammoTypes[0]}\` to use this weapon!`,
      );
      return;
    }
    await takeItems(attacker, { item: ammoItem.item, qty: 1 });
  } else if (weapon.type === "melee") {
    if (attackerInv.findIndex((i) => i.item === weapon.name && i.qty > 0) === -1) {
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
  let dm;
  try {
    dm = await sc.conversations.open({ users: target.slack_uid });
    await sc.chat.postMessage({
      channel: dm.channel.id,
      text: `${`<@${user.slack_uid}>`}'s ${itemEmoji(String(weapon.name))} \`${weapon.name}\` dealt *${dmg} damage* to you and you have *${newHp} HP* remaining.`,
    });
  } catch (e) {
    console.error("[attack] error on dispatch damage alert: ", e);
    // we still ball
  }

  // 8 check if dead and loot
  if (newHp === 0) {
    const { lootUser, lootBlock } = require("./looting.js");
    // Fetch full victim and killer user objects (with slack_uid, inventory, balance)
    const { data: victimUser, error: victimError } = await supabase
      .from(usersTable)
      .select("slack_uid, inventory, balance")
      .eq("slack_uid", target.slack_uid)
      .single();
    const { data: killerUser, error: killerError } = await supabase
      .from(usersTable)
      .select("slack_uid, inventory, balance")
      .eq("slack_uid", user.slack_uid)
      .single();

    if (victimError || killerError || !victimUser || !killerUser) {
      console.error("[attack] error on fetch users for looting: ", { victimError, killerError });
      await respond(":red-x: Failed to fetch user data for looting. Please report this to 3kh0.");
      return;
    }
    // Run looting (await in case it's async)
    let lootResult;
    try {
      lootResult = await lootUser(victimUser, killerUser);
    } catch (e) {
      console.error("[attack] error on lootUser: ", e);
      await respond(":red-x: Looting failed. Please report this to 3kh0.");
      return;
    }
    try {
      await supabase
        .from(usersTable)
        .update({ balance: lootResult.updatedVictim.balance, opt_status: false, hp: 100 })
        .eq("slack_uid", target.slack_uid);
      await supabase
        .from(usersTable)
        .update({ balance: lootResult.updatedKiller.balance })
        .eq("slack_uid", user.slack_uid);
    } catch (e) {
      console.error("[attack] error on update user balance: ", e);
      await respond(":red-x: Failed to update balances. Please report this to 3kh0.");
      return;
    }
    const blocks = lootBlock({
      killer: killerUser,
      victim: victimUser,
      weapon,
      summary: lootResult.summary,
      money: lootResult.money,
    });
    const block2 = {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `You were killed by <@${user.slack_uid}> and looted! You have been revived with *100 HP* and your PvP status has been reset. Use \`/stacked optin\` to opt-in again.`,
      },
    };
    const combinedBlocks = [block2, ...blocks];
    await respond({ blocks });
    await respond({
      text: `:skull: You killed <@${target.slack_uid}> with ${itemEmoji(weapon.name)} \`${weapon.name}\` and looted their inventory!`,
    });
    try {
      if (dm) {
        await sc.chat.postMessage({
          channel: dm.channel.id,
          blocks: combinedBlocks,
        });
      }
      await sc.chat.postMessage({
        channel: "C08SU62NWNP", // logging channel
        blocks: combinedBlocks,
      });
    } catch (e) {
      console.error("[attack] error dispatching death alert: ", e);
      // we still ball
    }
  } else {
    // not kill, still notify
    await respond({
      text: `You attacked <@${target.slack_uid}> with ${itemEmoji(weapon.name)} \`${weapon.name}\` and dealt *${dmg} damage*, leaving them with *${newHp} HP* remaining.`,
    });
  }
};
