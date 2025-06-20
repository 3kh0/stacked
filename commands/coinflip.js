const supabase = require("../lib/supabase.js");
const { fixCurrency } = require("../functions/fix.js");
const usersTable = process.env.SUPABASE_USERS_TABLE;
const crypto = require("crypto");

function parseBet(args) {
  if (!args || args.length < 2) return null;
  const amount = parseInt(args[0].replace(/,/g, ""), 10);
  const side = args[1]?.toLowerCase();
  if (!amount || amount < 1) return null;
  if (side !== "heads" && side !== "tails") return null;
  return { amount, side };
}

async function get(slack_uid) {
  const { data, error } = await supabase.from(usersTable).select("balance").eq("slack_uid", slack_uid).single();
  if (error) return { error };
  return { balance: data?.balance || 0 };
}

async function set(slack_uid, bal) {
  return await supabase
    .from(usersTable)
    .update({ balance: Math.round((bal + Number.EPSILON) * 100) / 100 })
    .eq("slack_uid", slack_uid);
}

module.exports = async ({ respond, command }) => {
  const slack_uid = command.user_id;
  const args = command.text?.split(" ").slice(1) || [];
  const bet = parseBet(args);
  if (!bet) {
    await respond(":red-x: Usage: `/stacked coinflip <amount> <heads|tails>`");
    return;
  }
  const { amount, side } = bet;
  const { balance, error } = await get(slack_uid);
  if (error) {
    if (error.code === "PGRST116") {
      await respond(":red-x: You are not registered! Please run `/stacked start` to begin playing.");
    } else {
      await respond(":red-x: Something went horribly wrong. Please report this to 3kh0.");
    }
    return;
  }
  if (balance < amount) {
    await respond(
      ":red-x: You do not have enough money to place this bet. You only have: *" + fixCurrency(balance) + "*",
    );
    return;
  }

  function flip() {
    const byte = crypto.randomBytes(1)[0];
    return byte < 128 ? "heads" : "tails";
  }
  const flipr = flip();
  let result = `:coin-mario: The coin landed on *${flipr}* and you had bet on *${side}*.`;
  if (flipr === side) {
    const bal = balance + amount;
    await set(slack_uid, bal);
    result += `\n:yay: You won *${fixCurrency(amount)}*! You now have: *${fixCurrency(bal)}*.`;
  } else {
    const bal = balance - amount;
    await set(slack_uid, bal);
    result += `\n:heavysob: You lost *${fixCurrency(amount)}*. You now have: *${fixCurrency(bal)}*.`;
  }
  await respond(result);
};
