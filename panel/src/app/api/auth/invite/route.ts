import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const databaseId = process.env.NOTION_MEMBERS_DB_ID!;
const VALID_INVITE_CODE = 'MIDNCBNDEMO';
const DEMO_SLACK_ID = 'U000000001';

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

async function findUserBySlackId(slackUserId: string) {
  const members = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'Slack ID',
      rich_text: {
        equals: slackUserId
      }
    }
  });
  
  if (members.results.length > 0) {
    const member = members.results[0];
    // @ts-expect-error - error expected :3
    const props = member.properties;
    return {
      id: member.id,
      name: extractPropertyValue(props.Name),
      email: extractPropertyValue(props['Email Address']),
      slackId: extractPropertyValue(props['Slack ID']),
      slackName: extractPropertyValue(props['Slack Name']),
      banned: extractPropertyValue(props['Banned']),
      banreason: extractPropertyValue(props['Ban reason'])
    };
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { inviteCode } = await request.json();

    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      );
    }

    if (inviteCode.trim() !== VALID_INVITE_CODE) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 401 }
      );
    }

    const user = await findUserBySlackId(DEMO_SLACK_ID);
    
    if (user) {
      if (user.banned) {
        return NextResponse.json(
          { error: 'User is banned' },
          { status: 403 }
        );
      }
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('slack_user_id', DEMO_SLACK_ID, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  } catch (error) {
    console.error('Invite code validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}