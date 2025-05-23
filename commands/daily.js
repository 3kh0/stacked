const { addItems } = require("../functions/inventory.js");
const { itemEmoji } = require("../functions/itemEmoji.js");

module.exports = async ({ respond, command }) => {
  const slack_uid = command.user_id;
  let item = "rare_box";
  let qty = 1;
  const roll = Math.random();
  if (roll < 0.01) {
    item = "ultra_rare_box";
    qty = 1;
    await addItems(slack_uid, { item, qty });
    await respond(
      `:sparkles: Lucky! You have claimed *1* ${itemEmoji(item)} \`ultra_rare_box\` as your daily reward!\n_There is a 1% chance to get this reward!_`,
    );
    return;
  } else if (roll < 0.07) {
    qty = 2;
    await addItems(slack_uid, { item, qty });
    await respond(
      `:gift: Lucky! You have claimed *2* ${itemEmoji(item)} \`rare_box\`es as your daily reward!\n_There is a 6% chance to get this reward!_`,
    );
    return;
  }
  await addItems(slack_uid, { item, qty });
  await respond(
    `You have claimed *${qty}* ${itemEmoji(item)} \`rare_box\`${qty > 1 ? "es" : ""} as your daily reward!`,
  );
};
