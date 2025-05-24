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
  const { data: users, error } = await supabase
    .from("users")
    .select("slack_uid, hourly_cooldown, daily_cooldown, weekly_cooldown, attack_cooldown");
  if (error || !users) return;
  const now = Date.now();
  for (const user of users) {
    for (const cd of CDS) {
      const expires = user[cd.key];
      if (expires && now > expires) {
        try {
          await app.client.chat.postMessage({
            channel: user.slack_uid,
            text: `:yay: Your *${cd.label} cooldown* has expired! You can now use it again!`,
          });
        } catch (e) {
          console.error(`[reminder] fail on dm ${user.slack_uid}:`, e.data?.error || e.message);
        }
      }
    }
  }
}

// startup
check();
// 1 min
setInterval(check, 60 * 1000);
