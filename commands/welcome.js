const supabase = require("../lib/supabase.js");

module.exports = async ({ respond, command }) => {
  const slack_uid = command.user_id;
  const { data: user, error } = await supabase.from("users").select("slack_uid").eq("slack_uid", slack_uid).single();

  // PGRST116 no rows returned
  if (error && error.code !== "PGRST116") {
    console.error("error on user: ", error);
    await respond(":red-x: Something went horribly wrong. Please report this to 3kh0.");
    return;
  }

  if (!user && (!error || error.code === "PGRST116")) {
    const { error: insErr } = await supabase.from("users").insert({
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
    await respond(
      "Welcome to Stacked! :hii: Since this is your first time, here is what you need to know.\n\n - You can now use the `/stacked` command to interact with the game.\n - You can use `/stacked help` to check out the commands you can run.\nRemember to play fair and be kind to each other! Have fun!",
    );
  } else {
    await respond(
      "You are already registered in the game! You can use `/stacked help` to check out the commands you can run in case you forgot.",
    );
  }
};
