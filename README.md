# Stacked [![Lint](https://github.com/3kh0/stacked/actions/workflows/lint.yml/badge.svg)](https://github.com/3kh0/stacked/actions/workflows/lint.yml)

Stacked is a economy game about collecting items, gambling, and using them to fight other players, all within Slack (Slack, where the work happens), powered by Supabase.

Still in beta/a complete buggy mess, but actively improving.

## Getting Started

- Node (duh)
- [pnpm](https://pnpm.io/)
- A [Slack App](https://api.slack.com/apps) with a token and signing secret
- A [Supabase](https://supabase.com/) project

1. Clone the repository
2. Install dependencies:

   ```sh
   pnpm install
   ```

3. Create a .env file in the project root:

   ```env
   SLACK_BOT_TOKEN=xoxb-abcdefghijklmnopqrstuvwxyz123456
   SLACK_SIGNING_SECRET=abcdefghijklmnopqrstuvwxyz123456
   SUPABASE_URL=https://abcdefghijklmnopqrstuvwxyz123456.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=abcdefghijklmnopqrstuvwxyz123456
   ```

4. Setup the database, here is a oneliner that will get you up and running. You can paste it into your Supabase SQL editor.

   ```sql
   CREATE TABLE public.users (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      slack_uid text NOT NULL,
      inventory jsonb NULL DEFAULT '[]'::jsonb,
      balance numeric NOT NULL DEFAULT '0'::numeric,
      hp numeric NOT NULL DEFAULT '100'::numeric,
      opt_status boolean NOT NULL DEFAULT false,
      attack_cooldown numeric NULL,
      hourly_cooldown numeric NULL,
      daily_cooldown numeric NULL,
      weekly_cooldown numeric NULL,
      CONSTRAINT users_pkey PRIMARY KEY (id),
      CONSTRAINT users_slack_uid_key UNIQUE (slack_uid)
   );
   ```

5. Nab all the emojis, they will be added to the repo in due time™ If you are already in the Hack Club Slack, the emojis are already there and no further action is needed from you.
6. Make sure you add a slash command to your Slack bot. Here is the recommended configuration. Make sure you have escape names and channels selected.

   ![image](https://github.com/user-attachments/assets/49d5963b-225c-47cc-8e9d-0dd9392ff6e4)

7. Start the bot:

   ```sh
   pnpm start
   ```

   Or if you would like it to auto-reload on changes:

   ```sh
   pnpm dev
   ```

## Contributions

Yes please! Keep in mind where functions go and what not. Aka just don't mess things up too much.
