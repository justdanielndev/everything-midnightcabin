import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client } from '@notionhq/client';
import { v4 as uuidv4 } from 'uuid';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const membersDbId = process.env.NOTION_MEMBERS_DB_ID!;
const teamsDbId = process.env.NOTION_TEAMS_DB_ID!;

export async function POST(request: Request) {
  try {
    const { teamName, teamType } = await request.json();
    
    if (!teamName || !teamType) {
      return NextResponse.json({ error: 'Team name and type are required' }, { status: 400 });
    }

    if (!['Public', 'Private', 'Ask for invite'].includes(teamType)) {
      return NextResponse.json({ error: 'Invalid team type' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const slackUserId = cookieStore.get('slack_user_id')?.value;
    
    if (!slackUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const membersResponse = await notion.databases.query({
      database_id: membersDbId,
      filter: {
        property: 'Slack ID',
        rich_text: {
          equals: slackUserId
        }
      }
    });

    if (membersResponse.results.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRecord = membersResponse.results[0];
    // @ts-expect-error - error expected :3
    const currentTeamId = userRecord.properties['Team ID']?.rich_text?.[0]?.plain_text;

    if (currentTeamId) {
      return NextResponse.json({ error: 'User is already on a team' }, { status: 400 });
    }

    // @ts-expect-error - error expected :3
    const userName = userRecord.properties['Name']?.title?.[0]?.text?.content || '';
    // @ts-expect-error - error expected :3
    const userSlackName = userRecord.properties['Slack Name']?.rich_text?.[0]?.plain_text || '';
    const teamId = uuidv4();
    const teamMember = {
      id: slackUserId,
      name: userName,
      slackName: userSlackName
    };

    await notion.pages.create({
      parent: { database_id: teamsDbId },
      properties: {
        'Team Name': {
          rich_text: [{
            text: {
              content: teamName
            }
          }]
        },
        'Team ID': {
          rich_text: [{
            text: {
              content: teamId
            }
          }]
        },
        'Team Size': {
          number: 1
        },
        'Members (JSON)': {
          rich_text: [{
            text: {
              content: JSON.stringify([teamMember])
            }
          }]
        },
        'Projects (JSON)': {
          rich_text: [{
            text: {
              content: JSON.stringify([])
            }
          }]
        },
        'Join Requests (JSON)': {
          rich_text: [{
            text: {
              content: JSON.stringify([])
            }
          }]
        },
        'Type': {
          select: {
            name: teamType
          }
        }
      }
    });

    await notion.pages.update({
      page_id: userRecord.id,
      properties: {
        'Team ID': {
          rich_text: [{
            text: {
              content: teamId
            }
          }]
        }
      }
    });

    return NextResponse.json({ success: true, teamId: teamId });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}