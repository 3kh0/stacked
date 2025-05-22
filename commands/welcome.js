const supabase = require("../lib/supabase.js");

module.exports = async ({ respond, command }) => {
  const slack_uid = command.user_id;
  const { data: user, error } = await supabase.from("users").select("id").eq("slack_uid", slack_uid).single();

  // PGRST116 no rows returned
  if (error && error.code !== "PGRST116") {
    console.error("error on user: ", error);
    await respond(":red-x: There was an error checking your account. Please try again later.");
    return;
  }

  if (!user && (!error || error.code === "PGRST116")) {
    const { error: insertError } = await supabase.from("users").insert({
      slack_uid,
      inventory: [],
      balance: 0,
      hp: 100,
      opt_status: false,
    });
    if (insertError) {
      console.error("error adding user: ", insertError);
      await respond(`:red-x: There was an error setting up your account: ${insertError.message}`);
      return;
    }
    await respond(
      "Welcome to Stacked! :hii: Since this is your first time, here is what you need to know.\n - You can now use the `/stacked` command to interact with the game.\n - You can use `/stacked help` to check out the commands you can run.\nRemember to play fair and be kind to each other! Have fun!",
    );
  } else {
    await respond("You are already in the game silly!");
  }
};
