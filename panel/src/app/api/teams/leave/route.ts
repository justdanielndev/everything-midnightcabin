import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const membersDbId = process.env.NOTION_MEMBERS_DB_ID!;
const teamsDbId = process.env.NOTION_TEAMS_DB_ID!;

export async function POST() {
  try {
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

    if (!currentTeamId) {
      return NextResponse.json({ error: 'User is not on a team' }, { status: 400 });
    }

    await notion.pages.update({
      page_id: userRecord.id,
      properties: {
        'Team ID': {
          rich_text: []
        }
      }
    });

    const teamsResponse = await notion.databases.query({
      database_id: teamsDbId,
      filter: {
        property: 'Team ID',
        rich_text: {
          equals: currentTeamId
        }
      }
    });

    if (teamsResponse.results.length > 0) {
      const teamRecord = teamsResponse.results[0];
      // @ts-expect-error - error expected :3
      const currentMembersJson = teamRecord.properties['Members (JSON)']?.rich_text?.[0]?.plain_text || '[]';
      
      try {
        const currentMembers = JSON.parse(currentMembersJson);
        const updatedMembers = currentMembers.filter((member: { id: string }) => member.id !== slackUserId);
        if (updatedMembers.length === 0) {
          await notion.blocks.delete({
            block_id: teamRecord.id
          });
        } else {
          await notion.pages.update({
            page_id: teamRecord.id,
            properties: {
              'Members (JSON)': {
                rich_text: [{
                  text: {
                    content: JSON.stringify(updatedMembers)
                  }
                }]
              },
              'Team Size': {
                number: updatedMembers.length
              }
            }
          });
        }
      } catch (error) {
        console.error('Error updating team members:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error leaving team:', error);
    return NextResponse.json({ error: 'Failed to leave team' }, { status: 500 });
  }
}