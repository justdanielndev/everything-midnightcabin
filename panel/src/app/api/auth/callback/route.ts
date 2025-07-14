import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const databaseId = process.env.NOTION_MEMBERS_DB_ID!;
const allowedMembersPath = process.env.ALLOWED_MEMBERS_JSON_PATH || './allowed-members.json';

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
      banned: extractPropertyValue(props['Banned']),
      banreason: extractPropertyValue(props['Ban reason'])
    };
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createUserInNotion(slackUser: any) {
  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        'Name': {
          title: [
            {
              text: {
                content: slackUser.name || slackUser.real_name || 'Unknown'
              }
            }
          ]
        },
        'Email Address': {
          email: slackUser.email || ''
        },
        'Slack ID': {
          rich_text: [
            {
              text: {
                content: slackUser.id
              }
            }
          ]
        },
        'Slack Name': {
          rich_text: [
            {
              text: {
                content: slackUser.name || slackUser.real_name || 'Unknown'
              }
            }
          ]
        },
        'Experience Points': {
          number: 0
        },
        'Banned': {
          checkbox: false
        }
      }
    });
    return response;
  } catch (error) {
    console.error('Error creating user in Notion:', error);
    throw error;
  }
}

async function isUserInAllowedList(slackUserId: string) {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const allowedMembersFullPath = path.resolve(allowedMembersPath);
    
    if (!fs.existsSync(allowedMembersFullPath)) {
      console.error('Allowed members file not found:', allowedMembersFullPath);
      return false;
    }
    
    const allowedMembers = JSON.parse(fs.readFileSync(allowedMembersFullPath, 'utf8'));
    return allowedMembers.includes(slackUserId);
  } catch (error) {
    console.error('Error checking allowed members list:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  
  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/?error=${encodeURIComponent(error)}`, request.url));
  }
  
  if (!code) {
    return NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/?error=missing_code`, request.url));
  }
  
  try {
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code: code,
        redirect_uri: process.env.SLACK_REDIRECT_URI!,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.ok) {
      console.error('Token exchange failed:', tokenData.error);
      return NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/?error=token_exchange_failed`, request.url));
    }
    
    const userResponse = await fetch('https://slack.com/api/users.identity', {
      headers: {
        'Authorization': `Bearer ${tokenData.authed_user.access_token}`,
      },
    });
    
    const userData = await userResponse.json();
    
    if (!userData.ok) {
      console.error('User info fetch failed:', userData.error);
      return NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/?error=user_info_failed`, request.url));
    }
    
    const slackUser = {
      id: userData.user.id,
      name: userData.user.name,
      real_name: userData.user.real_name,
      email: userData.user.email,
    };
    
    const user = await findUserBySlackId(slackUser.id);
    
    if (user) {
      if (user.banned) {
        return NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/banned?reason=${encodeURIComponent(user.banreason)}`, request.url));
      }

      const response = NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`, request.url));
      response.cookies.set('slack_user_id', slackUser.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });
      return response;
    }
    
    const isAllowed = await isUserInAllowedList(slackUser.id);
    
    if (!isAllowed) {
      return NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/unauthorized`, request.url));
    }
    
    await createUserInNotion(slackUser);

    const response = NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`, request.url));
    response.cookies.set('slack_user_id', slackUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });
    
    return response;
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/?error=auth_failed`, request.url));
  }
}