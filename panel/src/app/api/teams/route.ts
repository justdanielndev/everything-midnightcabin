import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

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
    const teams = response.results.map((page: any) => {
      const properties = page.properties;
      
      return {
        id: page.id,
        name: properties.Name?.title?.[0]?.text?.content || '',
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time,
      };
    });

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}