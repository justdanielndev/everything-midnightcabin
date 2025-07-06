## Setup

1. Install dependencies (yes, I use pnpm :3, maybe you have to install it first with `npm i -g pnpm`):
```bash
pnpm install
```

2. Create your `.env` file:
```bash
cp .env.example .env
```

3. Set up your Notion integration:
   - Go to https://www.notion.so/my-integrations
   - Create a new integration and copy the "Internal Integration Token"
   - Add the integration to your databases (Share > Add people > Select your integration)
   - Copy the database IDs from the URLs (the 32-character string after the last slash)

4. Add your credentials to `.env`:
   - `SLACK_BOT_TOKEN`: Your bot token
   - `SLACK_SIGNING_SECRET`: Your app's signing secret
   - `SLACK_APP_TOKEN`: Your app token
   - `NOTION_API_KEY`: Your Notion Internal Integration Secret
   - `NOTION_MEMBERS_DB_ID`: Your Members database ID
   - `NOTION_PROJECTS_DB_ID`: Your Projects database ID
   - `NOTION_TEAMS_DB_ID`: Your Teams database ID

5. Run the bot:
```bash
pnpm start
```

## Commands

- `/user` - Shows info about you as a Midnight Cabin user
- `/experience` - Shows your experience points and level
- `/projects` - Lists your team's projects
- `/team` - Shows info about your team
- `/mc-help` - Show all available commands

## Database Schemas

### Members
- Name, Email Address, Phone Number, Birthday, Slack ID, Slack Name, Experience Points, Team ID

### Projects
- Name, Description, Team ID, Git Repo, Date Submitted, Status, Hackatime Hours

### Teams
- Team Name, Team Size, Members (JSON), Team ID, Projects (JSON)
