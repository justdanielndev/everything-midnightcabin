import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const projectsDbId = process.env.NOTION_PROJECTS_DB_ID!;
const teamsDbId = process.env.NOTION_TEAMS_DB_ID!;
const membersDbId = process.env.NOTION_MEMBERS_DB_ID!;

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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
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
    const userTeamId = userRecord.properties['Team ID']?.rich_text?.[0]?.plain_text;

    const projectResponse = await notion.databases.query({
      database_id: projectsDbId,
      filter: {
        property: 'Project ID',
        rich_text: {
          equals: id
        }
      }
    });

    if (projectResponse.results.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectRecord = projectResponse.results[0];
    // @ts-expect-error - error expected :3
    const projectProps = projectRecord.properties;
    
    const projectTeamId = extractPropertyValue(projectProps['Team ID']);
    if (userTeamId !== projectTeamId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // @ts-expect-error - error expected :3
    const teamName = await getTeamName(projectTeamId);
    const devlogsJson = extractPropertyValue(projectProps['Devlogs (JSON)']) || '[]';
    let devlogs = [];
    try {
      // @ts-expect-error - error expected :3
      devlogs = JSON.parse(devlogsJson);
    } catch (error) {
      console.error('Error parsing devlogs JSON:', error);
      devlogs = [];
    }
    const hackatimeProjectsJson = extractPropertyValue(projectProps['Hackatime Projects (JSON)']) || '[]';
    let hackatimeProjects = [];
    try {
      // @ts-expect-error - error expected :3
      hackatimeProjects = JSON.parse(hackatimeProjectsJson);
    } catch (error) {
      console.error('Error parsing Hackatime projects JSON:', error);
      hackatimeProjects = [];
    }

    const project = {
      id: extractPropertyValue(projectProps['Project ID']),
      name: extractPropertyValue(projectProps['Name']),
      description: extractPropertyValue(projectProps['Description']),
      status: extractPropertyValue(projectProps['Status']),
      teamId: projectTeamId,
      teamName: teamName,
      gitRepo: extractPropertyValue(projectProps['Git Repo']),
      dateSubmitted: extractPropertyValue(projectProps['Date Submitted']),
      hackatimeHours: extractPropertyValue(projectProps['Hackatime Hours']),
      rejectionReason: extractPropertyValue(projectProps['Rejection Reason']),
      devlogs: devlogs,
      hackatimeProjects: hackatimeProjects
    };

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { description, gitRepo } = await request.json();
    
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
    const userTeamId = userRecord.properties['Team ID']?.rich_text?.[0]?.plain_text;
    const projectResponse = await notion.databases.query({
      database_id: projectsDbId,
      filter: {
        property: 'Project ID',
        rich_text: {
          equals: id
        }
      }
    });

    if (projectResponse.results.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectRecord = projectResponse.results[0];
    // @ts-expect-error - error expected :3
    const projectProps = projectRecord.properties;
    
    const projectTeamId = extractPropertyValue(projectProps['Team ID']);
    if (userTeamId !== projectTeamId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const updateProperties: Record<string, unknown> = {};
    
    if (description !== undefined) {
      updateProperties['Description'] = {
        rich_text: [
          {
            text: {
              content: description.trim()
            }
          }
        ]
      };
    }
    
    if (gitRepo !== undefined) {
      updateProperties['Git Repo'] = {
        url: gitRepo.trim() || null
      };
    }

    await notion.pages.update({
      page_id: projectRecord.id,
      // @ts-expect-error - error expected :3
      properties: updateProperties
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}