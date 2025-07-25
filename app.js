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
    await respond(":red-x: No sub-command provided! If you are lost, try `/stacked help` for a list of commands.");
    return;
  }
  let route = subcommand;

  // define real routes, TODO add aliases
  if (["inventory", "inv", "i", "in"].includes(subcommand)) route = "inventory";
  else if (["sell", "s", "sl"].includes(subcommand)) route = "sell";
  else if (["buy", "b", "bu", "purchase"].includes(subcommand)) route = "buy";
  else if (["welcome", "start", "onboard"].includes(subcommand)) route = "welcome";
  else if (["inspect", "ins", "item", "info", "stats"].includes(subcommand)) route = "item";
  else if (["use", "a", "attack", "heal", "hit", "unbox"].includes(subcommand)) route = "use";
  else if (["opt", "opt-in", "optin", "opt-out", "optout"].includes(subcommand)) route = "opt";
  else if (["help", "?", "commands", "cmds"].includes(subcommand)) route = "help";
  else if (["hourly", "hly", "h", "hour"].includes(subcommand)) route = "hourly";
  else if (["daily", "d", "day"].includes(subcommand)) route = "daily";
  else if (["weekly", "w", "week"].includes(subcommand)) route = "weekly";
  else if (["coinflip", "cf", "flip", "coin", "cflip", "gamba", "bet"].includes(subcommand)) route = "coinflip";
  else if (["value", "networth", "net", "val", "worth", "v"].includes(subcommand)) route = "value";
  else if (["leaderboard", "lb", "top"].includes(subcommand)) route = "leaderboard";
  else if (["tutorial", "guide", "how", "learn"].includes(subcommand)) route = "tutorial";
  else if (["shout", "tellall"].includes(subcommand)) route = "shout";

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
    await respond(":red-x: No sub-command found! If you are lost, try `/stacked help` for a list of commands.");
  }
});

// dm support
app.event("message", async ({ event, say, client }) => {
  if (event.channel_type === "im" && typeof event.text === "string") {
    const text = event.text.trim();
    if (text.toLowerCase() === "hi") {
      await say("hi");
      return;
    }
    const args = text.split(/\s+/);
    const subcommand = args[0]?.toLowerCase();
    let route = subcommand;
    if (["inventory", "inv", "i", "in"].includes(subcommand)) route = "inventory";
    else if (["sell", "s", "sl"].includes(subcommand)) route = "sell";
    else if (["buy", "b", "bu", "purchase"].includes(subcommand)) route = "buy";
    else if (["welcome", "start", "onboard"].includes(subcommand)) route = "welcome";
    else if (["inspect", "ins", "item", "info", "stats"].includes(subcommand)) route = "item";
    else if (["use", "a", "attack", "heal", "hit", "unbox"].includes(subcommand)) route = "use";
    else if (["opt", "opt-in", "optin", "opt-out", "optout"].includes(subcommand)) route = "opt";
    else if (["help", "?", "commands", "cmds"].includes(subcommand)) route = "help";
    else if (["hourly", "hly", "h", "hour"].includes(subcommand)) route = "hourly";
    else if (["daily", "d", "day"].includes(subcommand)) route = "daily";
    else if (["weekly", "w", "week"].includes(subcommand)) route = "weekly";
    else if (["coinflip", "cf", "flip", "coin", "cflip", "gamba", "bet"].includes(subcommand)) route = "coinflip";
    else if (["value", "networth", "net", "val", "worth", "v"].includes(subcommand)) route = "value";
    else if (["leaderboard", "lb", "top"].includes(subcommand)) route = "leaderboard";
    else if (["tutorial", "guide", "how", "learn"].includes(subcommand)) route = "tutorial";
    else if (["shout", "tellall"].includes(subcommand)) route = "shout";
    else if (["give", "gift", "donate"].includes(subcommand)) route = "give";
    else route = null;
    if (route) {
      const commandPath = path.join(__dirname, "commands", `${route}.js`);
      if (fs.existsSync(commandPath)) {
        const handler = require(commandPath);
        await handler({
          args: args.slice(1),
          respond: async (msg) => {
            if (typeof msg === "string") await say(msg);
            else if (msg && typeof msg === "object") await say(msg);
          },
          command: { user_id: event.user, text, channel_id: event.channel }, // jank 9000
          client,
        });
        return;
      }
    }
  }
});

const placeValue = require("./functions/placeValue.js");
placeValue();

require("./functions/reminder.js"); // cooldown reminders

// healthcheck
const http = require("http");

http
  .createServer((req, res) => {
    if (req.url === "/" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK", () => {});
    } else {
      res.writeHead(404);
      res.end();
    }
  })
  .listen(3001);

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Stacked! and ready for action!");
})();
