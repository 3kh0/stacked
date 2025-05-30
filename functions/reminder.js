const supabase = require("../lib/supabase.js");
const { App } = require("@slack/bolt");
require("dotenv").config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const CDS = [
  { key: "hourly_cooldown", label: "hourly" },
  { key: "daily_cooldown", label: "daily" },
  { key: "weekly_cooldown", label: "weekly" },
  { key: "attack_cooldown", label: "attack" },
];

async function check() {
  const usersTable = process.env.SUPABASE_USERS_TABLE;
  const { data: users, error } = await supabase
    .from(usersTable)
    .select("slack_uid, hourly_cooldown, daily_cooldown, weekly_cooldown, attack_cooldown");
  if (error || !users) {
    console.error("[reminder] error on users:", error);
    return;
  }
  const now = Date.now();
  for (const user of users) {
    for (const cd of CDS) {
      const expires = user[cd.key];
      const expiresMs = typeof expires === "number" && expires < 1e12 ? expires * 1000 : expires;
      if (typeof expiresMs !== "number" || !Number.isFinite(expiresMs)) {
        continue;
      }
      if (expiresMs > now) {
        continue;
      }
      // cd expired
      try {
        await app.client.chat.postMessage({
          channel: user.slack_uid,
          text: `:yay: Your *${cd.label} cooldown* has expired! You can now use it again!`,
        });
        await supabase
          .from(usersTable)
          .update({ [cd.key]: null })
          .eq("slack_uid", user.slack_uid);
      } catch (e) {
        console.error(`[reminder] fail on notify/reset ${cd.label} for ${user.slack_uid}:`, e.data?.error || e.message);
      }
    }
  }
}

// startup
check();
// 1 min
setInterval(check, 60 * 1000);
