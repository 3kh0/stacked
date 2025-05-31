const { WebClient } = require("@slack/web-api");
const supabase = require("../lib/supabase.js");

module.exports = async ({ respond, command }) => {
  if (command.user_id !== "U080A3QP42C") {
    await respond({ text: ":red-x: Nuh uh, nice try." });
    return;
  }
  const message = command.text.trim().replace(/^shout\s+/i, "");
  if (!message) {
    await respond(":red-x: You must provide a message to send.");
    return;
  }
  const usersTable = process.env.SUPABASE_USERS_TABLE;
  const { data: users, error } = await supabase.from(usersTable).select("slack_uid");
  if (error || !users) {
    await respond(":red-x: fuck check logs");
    return;
  }
  const sc = new WebClient(process.env.SLACK_BOT_TOKEN);
  let sent = 0;
  for (const user of users) {
    try {
      const dm = await sc.conversations.open({ users: user.slack_uid });
      await sc.chat.postMessage({
        channel: dm.channel.id,
        text: `Dev broadcast:\n\n${message}`,
      });
      sent++;
    } catch (e) {
      console.error(`fail on dm ${user.slack_uid}:`, e);
    }
  }
  await respond(`:white_check_mark: shout sent to ${sent} users.`);
};
