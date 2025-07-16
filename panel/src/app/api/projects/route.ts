import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const projectsDbId = process.env.NOTION_PROJECTS_DB_ID!;
const teamsDbId = process.env.NOTION_TEAMS_DB_ID!;

type NotionProperty = {
  type: string;
  title?: { plain_text: string }[];
  rich_text?: { plain_text: string }[];
  select?: { name: string };
  number?: number;
  date?: { start: string };
  url?: string;
};

function extractPropertyValue(property: NotionProperty) {
  if (!property) return '';

  switch (property.type) {
    case 'title':
      return property.title?.map((t) => t.plain_text).join('') || '';
    case 'rich_text':
      return property.rich_text?.map((t) => t.plain_text).join('') || '';
    case 'select':
      return property.select?.name || '';
    case 'number':
      return property.number || 0;
    case 'date':
      return property.date?.start || '';
    case 'url':
      return property.url || '';
    default:
      return '';
  }
}

async function getTeamName(teamId: string) {
  if (!teamId) return 'Unknown Team';
  
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
      return team.properties['Team Name']?.rich_text?.[0]?.plain_text || 'Unknown Team';
    }
    
    return 'Unknown Team';
  } catch (error) {
    console.error('Error fetching team name:', error);
    return 'Unknown Team';
  }
}

async function getTeamMembers(teamId: string) {
  if (!teamId) return [];
  
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
      const team = response.results[0] as { properties: Record<string, NotionProperty> };
      const membersProperty = team.properties['Members (JSON)'];
      const membersJson = membersProperty?.rich_text?.[0]?.plain_text || '[]';
      try {
        return JSON.parse(membersJson);
      } catch (error) {
        console.error('Error parsing members JSON:', error);
        return [];
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching team members:', error);
    return [];
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const slackUserId = cookieStore.get('slack_user_id')?.value;
    
    if (!slackUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const projectsResponse = await notion.databases.query({
      database_id: projectsDbId,
    });

    const allProjects = [];
    
    for (const project of projectsResponse.results) {
      // @ts-expect-error - error expected :3
      const projectProps = project.properties;
      
      const projectId = extractPropertyValue(projectProps['Project ID']);
      const projectName = extractPropertyValue(projectProps['Name']);
      const description = extractPropertyValue(projectProps['Description']);
      const status = extractPropertyValue(projectProps['Status']);
      const teamId = extractPropertyValue(projectProps['Team ID']);
      const dateSubmitted = extractPropertyValue(projectProps['Date Submitted']);
      
      // @ts-expect-error - error expected :3
      const teamName = await getTeamName(teamId);
      // @ts-expect-error - error expected :3
      const members = await getTeamMembers(teamId);

      allProjects.push({
        id: projectId,
        name: projectName,
        description: description || 'No description provided',
        status: status,
        teamId: teamId,
        teamName: teamName,
        members: members.map((m: { name?: string; slackName?: string }) => m.name || m.slackName),
        createdAt: dateSubmitted,
        updatedAt: dateSubmitted
      });
    }

    return NextResponse.json({ projects: allProjects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}