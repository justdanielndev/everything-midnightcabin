import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client } from '@notionhq/client';
import { v4 as uuidv4 } from 'uuid';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const projectsDbId = process.env.NOTION_PROJECTS_DB_ID!;
const teamsDbId = process.env.NOTION_TEAMS_DB_ID!;
const membersDbId = process.env.NOTION_MEMBERS_DB_ID!;

export async function POST(request: Request) {
  try {
    const { projectName, description } = await request.json();
    
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

    if (!userTeamId) {
      return NextResponse.json({ error: 'User must be on a team to create projects' }, { status: 400 });
    }

    const existingProjects = await notion.databases.query({
      database_id: projectsDbId,
      filter: {
        and: [
          {
            property: 'Team ID',
            rich_text: {
              equals: userTeamId
            }
          },
          {
            property: 'Name',
            title: {
              equals: projectName.trim()
            }
          }
        ]
      }
    });

    if (existingProjects.results.length > 0) {
      return NextResponse.json({ error: 'Project with this name already exists' }, { status: 400 });
    }

    const projectId = uuidv4();
    
    await notion.pages.create({
      parent: { database_id: projectsDbId },
      properties: {
        'Name': {
          title: [
            {
              text: {
                content: projectName.trim()
              }
            }
          ]
        },
        'Description': {
          rich_text: [
            {
              text: {
                content: description?.trim() || 'No description provided'
              }
            }
          ]
        },
        'Team ID': {
          rich_text: [
            {
              text: {
                content: userTeamId
              }
            }
          ]
        },
        'Project ID': {
          rich_text: [
            {
              text: {
                content: projectId
              }
            }
          ]
        },
        'Status': {
          select: {
            name: 'Created'
          }
        },
        'Date Submitted': {
          date: {
            start: new Date().toISOString().split('T')[0]
          }
        },
        'Hackatime Hours': {
          number: 0
        }
      }
    });

    const teamsResponse = await notion.databases.query({
      database_id: teamsDbId,
      filter: {
        property: 'Team ID',
        rich_text: {
          equals: userTeamId
        }
      }
    });

    if (teamsResponse.results.length > 0) {
      const teamRecord = teamsResponse.results[0];
      // @ts-expect-error - error expected :3
      const currentProjectsJson = teamRecord.properties['Projects (JSON)']?.rich_text?.[0]?.plain_text || '[]';
      
      try {
        const currentProjects = JSON.parse(currentProjectsJson);
        const updatedProjects = [...currentProjects, projectName.trim()];
        
        await notion.pages.update({
          page_id: teamRecord.id,
          properties: {
            'Projects (JSON)': {
              rich_text: [{
                text: {
                  content: JSON.stringify(updatedProjects)
                }
              }]
            }
          }
        });
      } catch (error) {
        console.error('Error updating team projects:', error);
      }
    }

    return NextResponse.json({ 
      success: true, 
      project: {
        id: projectId,
        name: projectName.trim(),
        description: description?.trim() || 'No description provided',
        status: 'Created',
        teamId: userTeamId
      }
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}