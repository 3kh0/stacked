module.exports = async ({ respond }) => {
  await respond({
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "Stacked Tutorial", emoji: true },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            ":stk_rock: *Items*\n" +
            "- Items are the things in your inventory. You can check your inventory at any time by running `/stacked inventory`.\n" +
            "- Each item has a rarity. Rarities range from Common, Uncommon, Rare, Ultra Rare, and Epic.\n" +
            "- You can obtain items by claiming your hourly, daily, and weekly drops by running their respective commands: `/stacked hourly`, `/stacked daily`, or `/stacked weekly`.\n" +
            "- To learn more about an item, run `/stacked info <item>` to get a description of the item.\n",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            ":stk_rare_box: *Boxes*\n" +
            "- Boxes are also sorted by rarity. The rarity of the box is the minimum rarity for the resulting item. For example, you are guaranteed an Uncommon or higher drop from an Uncommon box.\n" +
            "- A box is a one-time use item, so you would run `/stacked use rare_box` to open a box. Once you open the box, it is removed from your inventory and you keep the item you unbox.\n" +
            "- You can get boxes from rewards or by buying them.\n",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            ":stk_piggy_bank: *Money*\n" +
            "- Along with your items, you also have a cash balance, which you can use to buy, sell items, or gamble.\n" +
            "- You can buy items with `/stacked buy <item> <qty>` and sell them with `/stacked sell <item> <qty>`.\n" +
            "- Some items cannot be bought or sold, but all items can be obtained through boxes and your hourly drop.\n" +
            "- Using your cash, you can gamble on coinflips with a chance to double your wager using the command `/stacked coinflip`.\n",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            ":stk_machete: *Using & Attacking*\n" +
            "- One of the biggest parts of this bot is PvP. You collect items to use and attack other players.\n" +
            "- There are two types of weapons: melee and firearms (and the bow).\n" +
            "- Melee weapons are single-use items that get consumed on use. You can use them to attack with `/stacked use <item>`.\n" +
            "- Firearms are reusable items, but they require ammo, which gets consumed on use. You can use them with the same command as before.\n" +
            "- Each item has varying levels of damage and cooldowns, so be sure to check the item info with `/stacked info <item>`.\n" +
            "- You cannot specify a person to attack; you will always attack a random person who is opted into PvP.\n" +
            "- In order to attack others, you need to opt into PvP using `/stacked opt`. Opting in allows you to attack others while others can attack you.\n" +
            "- When you make an attack, you will be placed on a cooldown. You will not be able to attack or opt out of PvP until the cooldown is over.\n" +
            "- If you take damage, you can heal yourself with `/stacked use <item>` if the item has a healing effect.\n",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            ":stk_karambit: *Everything else*\n" +
            "- Most, if not all, commands and items have shorthands. For example, typing out `inventory` can be a bit much, but you can also just use `inv`, or even better, `i`. This means you can run `/stacked i` to access your inventory.\n" +
            "- As mentioned, this also applies to items. Instead of typing out `.308_winchester_bullet`, you can just use `/stacked info 308` and you will get the same result. Each item has convenient shorthands.\n" +
            "- Keep in mind, this bot is still being actively developed and features may change. It is up to you to discover how they work and use them to your advantage.\n",
        },
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: "Use `/stacked help` for a list of commands!" }],
      },
    ],
  });
};
