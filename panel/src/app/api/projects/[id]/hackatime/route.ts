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

async function fetchHackatimeStats(slackId: string) {
  try {
    const response = await fetch(`https://hackatime.hackclub.com/api/v1/users/${slackId}/stats?features=projects`);
    if (!response.ok) {
      console.error(`Failed to fetch Hackatime stats for ${slackId}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching Hackatime stats for ${slackId}:`, error);
    return null;
  }
}

type HackatimeProject = {
  name: string;
  hours: number;
  lastUpdated: string;
};

async function calculateProjectHours(projectId: string, hackatimeProjects: HackatimeProject[]) {
  if (!hackatimeProjects || hackatimeProjects.length === 0) {
    return 0;
  }

  let totalHours = 0;

  for (const hackatimeProject of hackatimeProjects) {
    let projectName: string;
    let userId: string;
    if (typeof hackatimeProject === 'string') {
      projectName = hackatimeProject;
      const projectResponse = await notion.databases.query({
        database_id: projectsDbId,
        filter: {
          property: 'Project ID',
          rich_text: {
            equals: projectId
          }
        }
      });

      if (projectResponse.results.length === 0) {
        continue;
      }

      const projectRecord = projectResponse.results[0];
      // @ts-expect-error - error expected :3
      const projectProps = projectRecord.properties;
      const teamId = extractPropertyValue(projectProps['Team ID']);
      const teamsResponse = await notion.databases.query({
        database_id: teamsDbId,
        filter: {
          property: 'Team ID',
          rich_text: {
            // @ts-expect-error - error expected :3
            equals: teamId
          }
        }
      });

      if (teamsResponse.results.length === 0) {
        continue;
      }

      const teamRecord = teamsResponse.results[0];
      // @ts-expect-error - error expected :3
      const membersJson = teamRecord.properties['Members (JSON)']?.rich_text?.[0]?.plain_text || '[]';
      
      let members = [];
      try {
        members = JSON.parse(membersJson);
      } catch (error) {
        console.error('Error parsing members JSON:', error);
        continue;
      }
      for (const member of members) {
        const stats = await fetchHackatimeStats(member.id);
        if (stats && stats.data && stats.data.projects) {
          const project = stats.data.projects.find((p: { name: string }) => p.name === projectName);
          if (project) {
            totalHours += project.total_seconds / 3600;
          }
        }
      }
    } else {
      // @ts-expect-error - error expected :3
      projectName = hackatimeProject.projectName;
      // @ts-expect-error - error expected :3
      userId = hackatimeProject.userId;
      
      const stats = await fetchHackatimeStats(userId);
      if (stats && stats.data && stats.data.projects) {
        const project = stats.data.projects.find((p: { name: string }) => p.name === projectName);
        if (project) {
          totalHours += project.total_seconds / 3600;
        }
      }
    }
  }

  return Math.round(totalHours * 100) / 100;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { projectName } = await request.json();
    
    if (!projectName?.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
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
    const currentHackatimeProjectsJson = extractPropertyValue(projectProps['Hackatime Projects (JSON)']) || '[]';
    let currentHackatimeProjects = [];
    try {
      // @ts-expect-error - error expected :3
      currentHackatimeProjects = JSON.parse(currentHackatimeProjectsJson);
    } catch (error) {
      console.error('Error parsing Hackatime projects JSON:', error);
      currentHackatimeProjects = [];
    }

    const userResponse = await notion.databases.query({
      database_id: membersDbId,
      filter: {
        property: 'Slack ID',
        rich_text: {
          equals: slackUserId
        }
      }
    });

    let userName = 'Unknown User';
    let userSlackName = 'Unknown User';
    if (userResponse.results.length > 0) {
      const userRecord = userResponse.results[0];
      // @ts-expect-error - error expected :3
      userName = userRecord.properties['Name']?.title?.[0]?.plain_text || 'Unknown User';
      // @ts-expect-error - error expected :3
      userSlackName = userRecord.properties['Slack Name']?.rich_text?.[0]?.plain_text || 'Unknown User';
    }

    const existingProject = currentHackatimeProjects.find((p: { projectName: string; userId: string }) => 
      p.projectName === projectName.trim() && p.userId === slackUserId
    );
    
    if (existingProject) {
      return NextResponse.json({ error: 'This Hackatime project is already linked for you' }, { status: 400 });
    }

    const newProject = {
      projectName: projectName.trim(),
      userId: slackUserId,
      userName: userName,
      userSlackName: userSlackName
    };
    
    const updatedHackatimeProjects = [...currentHackatimeProjects, newProject];
    const updatedHours = await calculateProjectHours(id, updatedHackatimeProjects);
    const currentStatus = extractPropertyValue(projectProps['Status']);
    const updateProperties: Record<string, unknown> = {
      'Hackatime Projects (JSON)': {
        rich_text: [
          {
            text: {
              content: JSON.stringify(updatedHackatimeProjects)
            }
          }
        ]
      },
      'Hackatime Hours': {
        number: updatedHours
      }
    };
    if (currentStatus === 'Created') {
      updateProperties['Status'] = {
        select: {
          name: 'In development'
        }
      };
    }

    await notion.pages.update({
      page_id: projectRecord.id,
      // @ts-expect-error - error expected :3
      properties: updateProperties
    });

    return NextResponse.json({ 
      success: true, 
      hackatimeProject: newProject,
      updatedHours: updatedHours
    });
  } catch (error) {
    console.error('Error adding Hackatime project:', error);
    return NextResponse.json({ error: 'Failed to add Hackatime project' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { projectName, userId } = await request.json();
    
    if (!projectName?.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
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

    const currentHackatimeProjectsJson = extractPropertyValue(projectProps['Hackatime Projects (JSON)']) || '[]';
    let currentHackatimeProjects = [];
    try {
      // @ts-expect-error - error expected :3
      currentHackatimeProjects = JSON.parse(currentHackatimeProjectsJson);
    } catch (error) {
      console.error('Error parsing Hackatime projects JSON:', error);
      currentHackatimeProjects = [];
    }

    const updatedHackatimeProjects = currentHackatimeProjects.filter((p: { projectName: string; userId: string }) => {
      if (typeof p === 'string') {
        return p !== projectName.trim();
      }
      const targetUserId = userId || slackUserId;
      return !(p.projectName === projectName.trim() && p.userId === targetUserId);
    });

    const updatedHours = await calculateProjectHours(id, updatedHackatimeProjects);

    await notion.pages.update({
      page_id: projectRecord.id,
      properties: {
        'Hackatime Projects (JSON)': {
          rich_text: [
            {
              text: {
                content: JSON.stringify(updatedHackatimeProjects)
              }
            }
          ]
        },
        'Hackatime Hours': {
          number: updatedHours
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      updatedHours: updatedHours
    });
  } catch (error) {
    console.error('Error removing Hackatime project:', error);
    return NextResponse.json({ error: 'Failed to remove Hackatime project' }, { status: 500 });
  }
}