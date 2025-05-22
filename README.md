# Stacked

Stacked is a economy game about collecting items, gambling, and using them to fight other players, all within Slack (Slack, where the work happens), powered by Supabase.

## Getting Started

- Node (duh)
- [pnpm](https://pnpm.io/)
- A [Slack App](https://api.slack.com/apps) with a token and signing secret
- A [Supabase](https://supabase.com/) project

1. Clone the repository:
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

4. Start the bot:

   ```sh
   pnpm start
   ```

   Or if you would like it to auto-reload on changes:

   ```sh
   pnpm dev
   ```

## Contributions

Yes please! Just do it.
