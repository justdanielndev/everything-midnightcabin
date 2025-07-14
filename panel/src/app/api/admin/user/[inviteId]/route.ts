import { NextRequest, NextResponse } from 'next/server';
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

async function getTeamNameById(teamId: string) {
  if (!teamId) return 'No Team Assigned';
  
  try {
    const response = await notion.databases.query({
      database_id: teamsDbId,
      filter: {
        property: 'Team ID',
        rich_text: {
          equals: teamId
        }
      }
    });
    
    if (response.results.length > 0) {
      const team = response.results[0];
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

async function findUserByInviteId(inviteId: string) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Invite ID',
        rich_text: {
          equals: inviteId
        }
      }
    });
    
    if (response.results.length > 0) {
      const member = response.results[0];
      // @ts-expect-error - error expected :3
      const props = member.properties;
      const rawPurchasedItems = extractPropertyValue(props['Store Items Bought (JSON)']);
      let purchasedItems = [];
      try {
        if (rawPurchasedItems) {
          // @ts-expect-error - error expected :3
          purchasedItems = JSON.parse(rawPurchasedItems);
        }
      } catch (error) {
        console.error('Error parsing purchased items JSON:', error);
        purchasedItems = [];
      }

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
        inviteId: extractPropertyValue(props['Invite ID']),
        banned: extractPropertyValue(props['Banned']),
        banreason: extractPropertyValue(props['Ban reason']),
        purchasedItems: purchasedItems,
      };
    }
    return null;
  } catch (error) {
    console.error('Error finding user by invite ID:', error);
    return null;
  }
}

async function checkAdminAuth(slackUserId: string) {
  try {
    const dataRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/data.json`);
    if (!dataRes.ok) return false;
    
    const data = await dataRes.json();
    const adminIds = data['admin-slack-ids'] || [];
    
    return adminIds.includes(slackUserId);
  } catch (error) {
    console.error('Error checking admin auth:', error);
    return false;
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ inviteId: string }> }) {
  try {
    const cookieStore = await cookies();
    const slackUserId = cookieStore.get('slack_user_id')?.value;
    
    if (!slackUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const isAdmin = await checkAdminAuth(slackUserId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { inviteId } = await params;
    const user = await findUserByInviteId(inviteId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error getting user info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}