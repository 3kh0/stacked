const { App } = require("@slack/bolt");
const fs = require("fs");
const path = require("path");

require("dotenv").config();
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const http = require("http");

http
  .createServer((req, res) => {
    const start = process.hrtime.bigint();
    if (req.url === "/" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK", () => {
        const end = process.hrtime.bigint();
        const ms = Number(end - start) / 1e6;
        console.log(`[healthcheck] responded in ${ms.toFixed(2)}ms`);
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  })
  .listen(3001);

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
  else if (["unbox", "open", "u", "ub", "unb", "hourly", "un", "h"].includes(subcommand)) route = "unbox";
  else if (["sell", "s", "sl"].includes(subcommand)) route = "sell";
  else if (["buy", "b", "bu", "purchase"].includes(subcommand)) route = "buy";
  else if (["welcome", "start", "onboard"].includes(subcommand)) route = "welcome";
  else if (["inspect", "ins", "item", "info", "stats"].includes(subcommand)) route = "item";
  else if (["use", "a", "attack", "heal", "hit"].includes(subcommand)) route = "use";
  else if (["opt", "opt-in", "optin", "opt-out", "optout"].includes(subcommand)) route = "opt";
  else if (["help", "h", "?", "commands", "cmds"].includes(subcommand)) route = "help";

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

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Stacked! and ready for action!");
})();
