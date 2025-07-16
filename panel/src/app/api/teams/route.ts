import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const membersDbId = process.env.NOTION_MEMBERS_DB_ID!;

async function getMemberXP(slackId: string): Promise<number> {
  try {
    const response = await notion.databases.query({
      database_id: membersDbId,
      filter: {
        property: 'Slack ID',
        rich_text: {
          equals: slackId
        }
      }
    });
    
    if (response.results.length > 0) {
      const member = response.results[0];
      // @ts-expect-error - error expected :3
      return member.properties['Experience Points']?.number || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error fetching member XP:', error);
    return 0;
  }
}

export async function GET() {
  try {
    const teamsDbId = process.env.NOTION_TEAMS_DB_ID;
    
    if (!teamsDbId) {
      return NextResponse.json({ error: 'Teams database ID not configured' }, { status: 500 });
    }

    const response = await notion.databases.query({
      database_id: teamsDbId,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teams = await Promise.all(response.results.map(async (page: any) => {
      const properties = page.properties;
      
      let members = [];
      try {
        const membersJson = properties['Members (JSON)']?.rich_text?.[0]?.plain_text || '[]';
        members = JSON.parse(membersJson);
      } catch (error) {
        console.error('Error parsing members JSON:', error);
      }

      let projects = [];
      try {
        const projectsJson = properties['Projects (JSON)']?.rich_text?.[0]?.plain_text || '[]';
        projects = JSON.parse(projectsJson);
      } catch (error) {
        console.error('Error parsing projects JSON:', error);
      }

      let joinRequests = [];
      try {
        const joinRequestsJson = properties['Join Requests (JSON)']?.rich_text?.[0]?.plain_text || '[]';
        joinRequests = JSON.parse(joinRequestsJson);
      } catch (error) {
        console.error('Error parsing join requests JSON:', error);
      }

      const membersWithXP = await Promise.all(members.map(async (member: { id: string; name: string; slackName: string }) => ({
        ...member,
        xp: await getMemberXP(member.id)
      })));
      
      return {
        id: page.id,
        teamId: properties['Team ID']?.rich_text?.[0]?.plain_text || '',
        name: properties['Team Name']?.rich_text?.[0]?.plain_text || '',
        teamSize: properties['Team Size']?.number || 0,
        members: membersWithXP,
        projects: projects,
        joinRequests: joinRequests,
        type: properties['Type']?.select?.name || 'Public',
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time,
      };
    }));

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}