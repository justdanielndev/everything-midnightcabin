import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const databaseId = process.env.NOTION_MEMBERS_DB_ID!;
const teamsDbId = process.env.NOTION_TEAMS_DB_ID!;

type NotionProperty = {
  type: string;
  title?: { plain_text: string }[];
  rich_text?: { plain_text: string }[];
  email?: string;
  phone_number?: string;
  date?: { start: string };
  select?: { name: string };
  number?: number;
  url?: string;
  checkbox?: boolean;
};

function extractPropertyValue(property: NotionProperty) {
  if (!property) return '';

  switch (property.type) {
    case 'title':
      return property.title?.map((t) => t.plain_text).join('') || '';
    case 'rich_text':
      return property.rich_text?.map((t) => t.plain_text).join('') || '';
    case 'email':
      return property.email || '';
    case 'phone_number':
      return property.phone_number || '';
    case 'date':
      return property.date?.start || '';
    case 'select':
      return property.select?.name || '';
    case 'number':
      return property.number || 0;
    case 'url':
      return property.url || '';
    case 'checkbox':
      return property.checkbox || false;
    default:
      return '';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryNotionDatabase(databaseId: string, filter: any = null) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryOptions: any = {
      database_id: databaseId
    };

    if (filter && Object.keys(filter).length > 0) {
      queryOptions.filter = filter;
    }

    const response = await notion.databases.query(queryOptions);
    return response.results;
  } catch (error) {
    console.error('Error querying Notion database:', error);
    return [];
  }
}

async function getTeamNameById(teamId: string) {
  if (!teamId) return 'No Team Assigned';
  
  try {
    const teams = await queryNotionDatabase(teamsDbId, {
      property: 'Team ID',
      rich_text: {
        equals: teamId
      }
    });
    
    if (teams.length > 0) {
      const team = teams[0];
      // @ts-expect-error - error expected :3
      const props = team.properties;
      const teamName = extractPropertyValue(props['Team Name']);
      return teamName || 'No Team Assigned';
    }
    
    return 'No Team Assigned';
  } catch (error) {
    console.error('Error fetching team name:', error);
    return 'No Team Assigned';
  }
}

async function findUserBySlackId(slackUserId: string) {
  const members = await queryNotionDatabase(databaseId, {
    property: 'Slack ID',
    rich_text: {
      equals: slackUserId
    }
  });
  
  if (members.length > 0) {
    const member = members[0];
    // @ts-expect-error - error expected :3
    const props = member.properties;
    
    const teamId = extractPropertyValue(props['Team ID']);
    // @ts-expect-error - error expected :3
    const teamName = await getTeamNameById(teamId);
    
    return {
      id: member.id,
      name: extractPropertyValue(props.Name),
      email: extractPropertyValue(props['Email Address']),
      slackId: extractPropertyValue(props['Slack ID']),
      slackName: extractPropertyValue(props['Slack Name']),
      xp: extractPropertyValue(props['Experience Points']),
      teamId: teamId,
      teamName: teamName,
      banned: extractPropertyValue(props['Banned']),
      banreason: extractPropertyValue(props['Ban reason']),
      inviteId: extractPropertyValue(props['Invite ID']),
      purchasedItems: extractPropertyValue(props['Store Items Bought (JSON)'])
    };
  }
  return null;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const slackUserId = cookieStore.get('slack_user_id')?.value;
    
    if (!slackUserId) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const user = await findUserBySlackId(slackUserId);
    
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    let purchasedItems = [];
    try {
      if (user.purchasedItems) {
        // @ts-expect-error - error expected :3
        purchasedItems = JSON.parse(user.purchasedItems);
      }
    } catch (error) {
      console.error('Error parsing purchased items JSON:', error);
      purchasedItems = [];
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.slackId,
        name: user.name,
        email: user.email,
        xp: user.xp,
        teamId: user.teamId,
        teamName: user.teamName,
        inviteId: user.inviteId,
        purchasedItems: purchasedItems,
      }
    });

  } catch (error) {
    console.error('Error getting user data:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}