const supabase = require("../lib/supabase.js");

module.exports = async ({ respond, command }) => {
  const slack_uid = command.user_id;
  const t = (command.text || "").trim().toLowerCase();

  let opt = null;
  if (["in", "opt-in", "optin"].some((s) => t.includes(s))) {
    opt = true;
  } else if (["out", "opt-out", "optout"].some((s) => t.includes(s))) {
    opt = false;
  }

  if (opt === null) {
    await respond({
      text: ":red-x: Please specify if you want to opt-in or opt-out. Example: `/stacked opt in` or `/stacked opt out`.",
    });
    return;
  }

  const { data: userData, error: fetchError } = await supabase
    .from("users")
    .select("attack_cooldown")
    .eq("slack_uid", slack_uid)
    .single();
  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      await respond({
        text: ":red-x: You are not registered! Please run `/stacked start` to begin playing.",
      });
    } else {
      await respond({
        text: ":red-x: Something went horribly wrong. Please report this to 3kh0.",
      });
    }
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  const cdu = userData?.attack_cooldown ? Number(userData.attack_cooldown) : null;
  if (cdu && now < cdu) {
    await respond({
      text: `:red-x: You are currently on attack cooldown. You must wait until your cooldown expires before you can change your opt status.`,
    });
    return;
  }

  const { error } = await supabase.from("users").update({ opt_status: opt }).eq("slack_uid", slack_uid);

  if (error) {
    console.error("error on update opt:", error);
    await respond({
      text: ":red-x: Something went horribly wrong. Please report this to 3kh0.",
    });
    return;
  }

  await respond({
    text: opt
      ? ":stk_optin: You have *opted in* to attacking other players! But be careful, they can attack you too!\n\nIt is highly recommended that you add me as a VIP so I can notify you when you get attacked.\n\nYou can opt-out at any time by using `/stacked optout`."
      : ":stk_optout: You have *opted out* of attacks. You will not be able to attack other players, but you also won't be attacked.\n\nYou can opt-in at any time by using `/stacked optin`.",
  });
};
