const supabase = require("../lib/supabase.js");
const usersTable = process.env.SUPABASE_USERS_TABLE;

module.exports = async ({ respond, command }) => {
  const slack_uid = command.user_id;
  const { data: user, error } = await supabase.from(usersTable).select("slack_uid").eq("slack_uid", slack_uid).single();

  // PGRST116 no rows returned
  if (error && error.code !== "PGRST116") {
    console.error("error on user: ", error);
    await respond(":red-x: Something went horribly wrong. Please report this to 3kh0.");
    return;
  }

  const allowlist = [
    "U080A3QP42C",
    "U08TBE25U82",
    "U066LL4JBDL",
    "U062U3SQ2T1",
    "U088DPHNEF8",
    "U082GTRTR5X",
    "U08290982KU",
    "U078H10Q3MZ",
    "U06FG6G6SNL",
    "U07F3DZ7PU2",
    "U07SX29CECA",
    "U08F7A2HBPZ",
    "U07V3MD8BPW",
    "U06JLP2R8JV",
    "U07BU2HS17Z",
    "U07UV4R2G4T",
    "U07PYPAF5RR",
    "U071JHBEJ7R",
    "U082RFNDVKQ",
    "U04KNK837S4",
    "U07L45W79E1",
    "U0C7B14Q3",
  ];
  if (!allowlist.includes(slack_uid)) {
    await respond(
      ":red-x: You have yet to be whitelisted. Please contact <@U080A3QP42C> if you think this is a mistake.",
    );
    return;
  }

  if (!user && (!error || error.code === "PGRST116")) {
    const { error: insErr } = await supabase.from(usersTable).insert({
      slack_uid,
      inventory: [],
      balance: 0,
      hp: 100,
      opt_status: false,
    });
    if (insErr) {
      console.error("error adding user: ", insErr);
      await respond(`:red-x: Something went horribly wrong. Please report this to 3kh0.`);
      return;
    }
    const { addItems } = require("../functions/inventory.js");
    await addItems(slack_uid, { item: "common_box", qty: 10 });
    await respond(
      "Welcome to Stacked! :hii: Since this is your first time, I would recommend you to check out the tutorial by using `/stacked tutorial`.\n\nYou can also check out the commands you can run by using `/stacked help`.\n\nI have given you 10 :stk_common_box: common boxes to start with. Have fun unboxing! :ohneheart:",
    );
  } else {
    await respond(
      "You are already registered in the game! You can use `/stacked help` to check out the commands you can run in case you forgot.",
    );
  }
};
