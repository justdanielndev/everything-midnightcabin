## Setup

1. Install dependencies (yes, I use pnpm :3, maybe you have to install it first with `npm i -g pnpm`):
```bash
pnpm install
```

2. Create your `.env` file:
```bash
cp .env.example .env
```

3. Set up your Slack app:
   - Go to https://api.slack.com/apps
   - Click "Create New App"
   - Follow the prompts to create your app
   - Set up the app PFP, scopes... and add it to your workspace
   - Make sure to enable socket mode!

4. Set up your Discord bot:
   - Go to https://discord.com/developers/applications
   - Click "New Application"
   - Follow the prompts to create your application
   - Set up the app's PFP, enable the bot and set up its PFP too, enable the Message Content Intent, get the bot token and add it to your workspace

5. Set up your Notion integration:
   - Go to https://www.notion.so/my-integrations
   - Create a new integration and copy the "Internal Integration Token"
   - Add the integration to your databases (Share > Add people > Select your integration)
   - Copy the database IDs from the URLs (the 32-character string after the last slash)

6. Add your credentials to `.env`:
   - `SLACK_BOT_TOKEN`: Your bot token
   - `SLACK_SIGNING_SECRET`: Your app's signing secret
   - `SLACK_APP_TOKEN`: Your app token
   - `NOTION_API_KEY`: Your Notion Internal Integration Secret
   - `NOTION_MEMBERS_DB_ID`: Your Members database ID
   - `NOTION_PROJECTS_DB_ID`: Your Projects database ID
   - `NOTION_TEAMS_DB_ID`: Your Teams database ID
   - `DISCORD_BOT_TOKEN`: Your Discord bot token

7. Run the bot:
```bash
pnpm start
```

## Slack Commands

- `/user` - Shows info about you as a Midnight Cabin user
- `/experience` - Shows your experience points and level
- `/projects` - Lists your team's projects
- `/team` - Shows info about your team
- `/mc-help` - Show all available commands
- `/mc-stats` - Shows project and user count
- `/mc-ping` - Tests the bot's responsiveness
- `/adm-mc-approveproject [project ID]` - Approves a project
- `/adm-mc-rejectproject [project ID] [reason]` - Rejects a project
- `/adm-mc-ban [user ID] [reason]` - Bans a user
- `/adm-mc-unban [user ID]` - Unbans a user

## Discord Commands

- `/viewpendingprojects` - Views all pending projects
- `/approveproject [project ID]` - Approves a project
- `/rejectproject [project ID] [reason]` - Rejects a project
- `/banuser [user ID] [reason]` - Bans a user
- `/unbanuser [user ID]` - Unbans a user

## Database Schemas

### Members
- Name, Email Address, Phone Number, Birthday, Slack ID, Slack Name, Experience Points, Team ID, Banned, Ban Reason

### Projects
- Name, Description, Team ID, Git Repo, Date Submitted, Status, Hackatime Hours, Rejection Reason, Project ID

### Teams
- Team Name, Team Size, Members (JSON), Team ID, Projects (JSON)
