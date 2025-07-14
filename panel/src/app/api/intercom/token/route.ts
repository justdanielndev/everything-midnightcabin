import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Client } from '@notionhq/client';
import { cookies } from 'next/headers';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const databaseId = process.env.NOTION_MEMBERS_DB_ID!;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPropertyValue(property: any) {
  if (!property) return '';

  switch (property.type) {
    case 'title':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return property.title.map((t: any) => t.plain_text).join('');
    case 'rich_text':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return property.rich_text.map((t: any) => t.plain_text).join('');
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
    return {
      id: member.id,
      name: extractPropertyValue(props.Name),
      email: extractPropertyValue(props['Email Address']),
      slackId: extractPropertyValue(props['Slack ID']),
      slackName: extractPropertyValue(props['Slack Name']),
      xp: extractPropertyValue(props['Experience Points']),
      teamId: extractPropertyValue(props['Team ID']),
      banned: extractPropertyValue(props['Banned']),
      banreason: extractPropertyValue(props['Ban reason']),
    };
  }
  return null;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const slackUserId = cookieStore.get('slack_user_id')?.value;
    
    if (!slackUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await findUserBySlackId(slackUserId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const payload = {
      user_id: user.slackId,
      email: user.email,
      name: user.name,
      created_at: Math.floor(Date.now() / 1000),
    };

    const intercomSecret = process.env.INTERCOM_SECRET_KEY;
    if (!intercomSecret) {
      return NextResponse.json({ error: 'Intercom secret not configured' }, { status: 500 });
    }

    const token = jwt.sign(payload, intercomSecret, { expiresIn: '1h' });

    return NextResponse.json({
      token,
      user: {
        xp: user.xp,
        teamId: user.teamId,
      }
    });

  } catch (error) {
    console.error('Error generating Intercom token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}