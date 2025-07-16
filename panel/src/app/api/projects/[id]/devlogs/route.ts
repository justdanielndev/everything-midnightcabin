import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client } from '@notionhq/client';
import { v4 as uuidv4 } from 'uuid';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const projectsDbId = process.env.NOTION_PROJECTS_DB_ID!;
const membersDbId = process.env.NOTION_MEMBERS_DB_ID!;

function extractPropertyValue(property: any) {
  if (!property) return '';

  switch (property.type) {
    case 'title':
      return property.title?.map((t: any) => t.plain_text).join('') || '';
    case 'rich_text':
      return property.rich_text?.map((t: any) => t.plain_text).join('') || '';
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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { content, imageUrl } = await request.json();
    
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
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
    // @ts-expect-error - error expected :3
    const userName = userRecord.properties['Name']?.title?.[0]?.plain_text || 'Unknown User';
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
    const currentDevlogsJson = extractPropertyValue(projectProps['Devlogs (JSON)']) || '[]';
    let currentDevlogs = [];
    try {
      currentDevlogs = JSON.parse(currentDevlogsJson);
    } catch (error) {
      console.error('Error parsing devlogs JSON:', error);
      currentDevlogs = [];
    }
    const newDevlog = {
      id: uuidv4(),
      content: content.trim(),
      imageUrl: imageUrl?.trim() || undefined,
      timestamp: new Date().toISOString(),
      author: userName
    };
    const updatedDevlogs = [...currentDevlogs, newDevlog];
    const currentStatus = extractPropertyValue(projectProps['Status']);
    const updateProperties: any = {
      'Devlogs (JSON)': {
        rich_text: [
          {
            text: {
              content: JSON.stringify(updatedDevlogs)
            }
          }
        ]
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
      properties: updateProperties
    });

    return NextResponse.json({ 
      success: true, 
      devlog: newDevlog
    });
  } catch (error) {
    console.error('Error adding devlog:', error);
    return NextResponse.json({ error: 'Failed to add devlog' }, { status: 500 });
  }
}