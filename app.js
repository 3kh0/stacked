const { App } = require("@slack/bolt");
const fs = require("fs");
const path = require("path");

require("dotenv").config();
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

app.command("/stacked", async ({ command, ack, respond }) => {
  await ack();
  const args = command.text.trim().split(/\s+/);
  const subcommand = args[0]?.toLowerCase();
  if (!subcommand) {
    await respond(":red-x: No sub-command provided!");
    return;
  }
  let route = subcommand;

  // define real routes, TODO add aliases
  if (["inventory", "inv", "i", "in"].includes(subcommand)) route = "inventory";
  else if (
    ["unbox", "open", "u", "ub", "unb", "hourly", "un", "h"].includes(
      subcommand
    )
  )
    route = "unbox";
  else if (["sell", "s", "sl"].includes(subcommand)) route = "sell";
  else if (["welcome", "start", "onboard"].includes(subcommand))
    route = "welcome";
  else if (["inspect", "item", "info", "stats"].includes(subcommand))
    route = "item";
  else if (["use", "a", "attack", "heal", "hit"].includes(subcommand))
    route = "use";
  else if (subcommand === "buy") route = "buy";
  else if (["opt", "opt-in", "optin", "opt-out", "optout"].includes(subcommand))
    route = "opt";

  // last ditch effort to match the command
  const commandPath = path.join(__dirname, "commands", `${route}.js`);
  if (fs.existsSync(commandPath)) {
    const handler = require(commandPath);
    await handler({
      args: args.slice(1),
      respond,
      command,
      client: app.client,
    }); // <-- add client
  } else {
    await respond("failed to find route to a valid command");
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Stacked! and ready for action!");
})();
