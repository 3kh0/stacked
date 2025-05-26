const { findItem } = require("./item.js");
const supabase = require("../lib/supabase.js");

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

module.exports = async function placeValue() {
  const usersTable = process.env.SUPABASE_USERS_TABLE;
  const { data: users, error } = await supabase.from(usersTable).select("slack_uid, inventory, balance");
  if (error || !users) return;
  const updates = [];
  for (const user of users) {
    const value = await calc(user);
    updates.push({ slack_uid: user.slack_uid, value: Math.round(value * 100) / 100 });
  }
  if (updates.length > 0) {
    await supabase.from("value_leaderboard").upsert(updates, { onConflict: ["slack_uid"] });
  }
};

async function loop() {
  const start = process.hrtime.bigint();
  try {
    await module.exports();
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1e6;
    console.log(`[placeValue] complete in ${ms.toFixed(2)}ms`);
  } catch (e) {
    console.error("[placeValue] error:", e);
  }
}

// startup
loop();
// 10 min
setInterval(loop, 10 * 60 * 1000);
