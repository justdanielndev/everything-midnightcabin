import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const membersDbId = process.env.NOTION_MEMBERS_DB_ID!;
const teamsDbId = process.env.NOTION_TEAMS_DB_ID!;

export async function POST(request: Request) {
  try {
    const { teamId } = await request.json();
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
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

    const teamsResponse = await notion.databases.query({
      database_id: teamsDbId,
      filter: {
        property: 'Team ID',
        rich_text: {
          equals: teamId
        }
      }
    });

    if (teamsResponse.results.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const teamRecord = teamsResponse.results[0];
    // @ts-expect-error - error expected :3
    const teamType = teamRecord.properties['Type']?.select?.name;

    if (teamType !== 'Ask for invite') {
      return NextResponse.json({ error: 'This team does not accept join requests' }, { status: 400 });
    }

    // @ts-expect-error - error expected :3
    const userName = userRecord.properties['Name']?.title?.[0]?.text?.content || '';
    // @ts-expect-error - error expected :3
    const userSlackName = userRecord.properties['Slack Name']?.rich_text?.[0]?.plain_text || '';

    // @ts-expect-error - error expected :3
    const currentJoinRequestsJson = teamRecord.properties['Join Requests (JSON)']?.rich_text?.[0]?.plain_text || '[]';
    
    try {
      const currentJoinRequests = JSON.parse(currentJoinRequestsJson);
      const existingRequest = currentJoinRequests.find((req: { id: string }) => req.id === slackUserId);
      if (existingRequest) {
        return NextResponse.json({ error: 'Join request already sent' }, { status: 400 });
      }
      
      const newRequest = {
        id: slackUserId,
        name: userName,
        slackName: userSlackName,
        requestDate: new Date().toISOString(),
        status: 'pending'
      };
      
      const updatedJoinRequests = [...currentJoinRequests, newRequest];
      
      await notion.pages.update({
        page_id: teamRecord.id,
        properties: {
          'Join Requests (JSON)': {
            rich_text: [{
              text: {
                content: JSON.stringify(updatedJoinRequests)
              }
            }]
          }
        }
      });
    } catch (error) {
      console.error('Error updating join requests:', error);
      return NextResponse.json({ error: 'Failed to send join request' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending join request:', error);
    return NextResponse.json({ error: 'Failed to send join request' }, { status: 500 });
  }
}