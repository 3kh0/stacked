const supabase = require("../lib/supabase.js");
const { fixCurrency } = require("../functions/fix.js");

function parseBet(args) {
  if (!args || args.length < 2) return null;
  const amount = parseInt(args[0].replace(/,/g, ""), 10);
  const side = args[1]?.toLowerCase();
  if (!amount || amount < 100) return null;
  if (side !== "heads" && side !== "tails") return null;
  return { amount, side };
}

async function getBalance(slack_uid) {
  const { data, error } = await supabase.from("users").select("balance").eq("slack_uid", slack_uid).single();
  if (error) return { error };
  return { balance: data?.balance || 0 };
}

async function setBalance(slack_uid, newBalance) {
  return await supabase.from("users").update({ balance: newBalance }).eq("slack_uid", slack_uid);
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
  const { balance, error } = await getBalance(slack_uid);
  if (error) {
    await respond(":red-x: Something went really wrong. Please try again later.");
    return;
  }
  if (balance < amount) {
    await respond(":red-x: You do not have enough money to place this bet. You only have: *" + fixCurrency(balance) + "*");
    return;
  }

  const flip = Math.random() < 0.5 ? "heads" : "tails";
  let resultMsg = `:coin-mario: The coin landed on *${flip}* and you had bet on *${side}*.`;
  if (flip === side) {
    const newBalance = balance + amount;
    await setBalance(slack_uid, newBalance);
    resultMsg += `\n:yay: You won *${fixCurrency(amount)}*! You now have: *${fixCurrency(newBalance)}*.`;
  } else {
    const newBalance = balance - amount;
    await setBalance(slack_uid, newBalance);
    resultMsg += `\n:heavysob: You lost *${fixCurrency(amount)}*. You now have: *${fixCurrency(newBalance)}*.`;
  }
  await respond(resultMsg);
};
