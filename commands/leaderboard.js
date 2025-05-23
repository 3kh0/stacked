// Net Worth Leaderboard command
const supabase = require("../lib/supabase.js");

const placeMedal = [":first_place_medal:", ":second_place_medal:", ":third_place_medal:"];

module.exports = async ({ respond, command }) => {
  const args = command.text ? command.text.trim().split(/\s+/) : [];
  let page = 1;
  if (args.length > 1 && !isNaN(Number(args[1]))) {
    page = Math.max(1, parseInt(args[1], 10));
  }

  const offset = (page - 1) * 10;

  const { data: rows, error } = await supabase
    .from("value_leaderboard")
    .select("slack_uid, value")
    .order("value", { ascending: false })
    .range(offset, offset + 10 - 1);

  if (error || !rows || rows.length === 0) {
    await respond({ text: `:red-x: Something went horribly wrong. Please report this to 3kh0.` });
    return;
  }

  let lines = ["*Net Worth Leaderboard*"];
  for (let i = 0; i < rows.length; i++) {
    const { slack_uid, value } = rows[i];
    let medal = i + offset < 3 ? placeMedal[i + offset] : `${i + 1 + offset}.`;
    let userTag = `<@${slack_uid}>`;
    lines.push(
      `${medal} ${userTag} - $${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    );
  }

  await respond({
    text: lines.join("\n"),
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: lines.join("\n") } },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: ":clockrun: Leaderboards may be delayed by up to 10 minutes." }],
      },
    ],
  });
};
