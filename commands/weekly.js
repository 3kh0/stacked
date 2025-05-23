const { addItems } = require("../functions/inventory.js");
const { itemEmoji } = require("../functions/itemEmoji.js");

module.exports = async ({ respond, command }) => {
  const slack_uid = command.user_id;
  let item = "ultra_rare_box";
  let qty = 1;
  const roll = Math.random();
  if (roll > 0.01) {
    item = "epic_box";
    qty = 1;
    await addItems(slack_uid, { item, qty });
    await respond(
      `:star2: *MAX WIN!* You have claimed *1* ${itemEmoji(item)} \`epic_box\` as your weekly reward!\n_There is a 1% chance to get this reward!_`,
    );
    return;
  } else if (roll < 0.07) {
    qty = 2;
    await addItems(slack_uid, { item, qty });
    await respond(
      `:gift: Lucky! You have claimed *2* ${itemEmoji(item)} \`ultra_rare_box\`es as your weekly reward!\n_There is a 6% chance to get this reward!_`,
    );
    return;
  }
  await addItems(slack_uid, { item, qty });
  await respond(`You have claimed *${qty}* ${itemEmoji(item)} \`ultra_rare_box\` as your weekly reward!`);
};
