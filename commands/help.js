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
            "• `/stacked inventory` — View your inventory\n" +
            "• `/stacked buy <item> <qty>` — Buy an item from the market\n" +
            "• `/stacked sell <item> <qty>` — Sell an item from your inventory\n" +
            "• `/stacked item <item>` — Inspect an item and see its stats\n" +
            "• `/stacked use <item>` — Use an item (attack, heal, etc.)\n" +
            "• `/stacked opt` — Opt in or out to PvP\n" +
            "• `/stacked welcome` — Get started and see onboarding info\n" +
            "• `/stacked unbox` — Open a hourly box for a random item\n" +
            "• `/stacked daily` — Get your daily reward\n" +
            "• `/stacked weekly` — Get your weekly reward\n" +
            "• `/stacked coinflip <bet> <heads|tails>` — Gamble 50/50 odds of doubling your bet\n",
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
