module.exports = async ({ respond }) => {
  await respond({
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "*Stacked: List of commands*\n" +
            "\n" +
            "• `/stacked help` — Show this help message\n" +
            "• `/stacked inventory <user>` — View your inventory or someone else's\n" +
            "• `/stacked buy <item> <qty>` — Buy an item from the market\n" +
            "• `/stacked sell <item> <qty>` — Sell an item from your inventory\n" +
            "• `/stacked item <item>` — Inspect an item and see its stats\n" +
            "• `/stacked use <item>` — Use an item (attack, heal, etc.)\n" +
            "• `/stacked opt` — Opt in or out to PvP\n" +
            "• `/stacked welcome` — Get started and see onboarding info\n" +
            "• `/stacked hourly` — Open a hourly box for a random item\n" +
            "• `/stacked daily` — Get your daily reward\n" +
            "• `/stacked weekly` — Get your weekly reward\n" +
            "• `/stacked coinflip <bet> <heads|tails>` — Gamble 50/50 odds of doubling your bet\n" +
            "• `/stacked value <user>` — View your net worth or someone else's\n" +
            "• `/stacked leaderboard` — View the leaderboard\n" +
            "• `/stacked tutorial` — View the tutorial\n",
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text:
              "These are not all the commands, and some commands have shortcuts.\n" +
              "For example, /stacked i is the same as /stacked inventory and /stacked a is the same as /stacked use\n" +
              "All the routes can be seen here: <https://github.com/3kh0/stacked/blob/main/app.js|app.js on GitHub>",
          },
        ],
      },
    ],
  });
};
