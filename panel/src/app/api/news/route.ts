import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export async function GET() {
  try {
    const newsDbId = process.env.NOTION_NEWS_DB_ID;
    
    if (!newsDbId) {
      return NextResponse.json({ error: 'News database ID not configured' }, { status: 500 });
    }

    const response = await notion.databases.query({
      database_id: newsDbId,
      sorts: [
        {
          property: 'Publication Date',
          direction: 'descending',
        },
      ],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const news = response.results.map((page: any) => {
      const properties = page.properties;
      
      return {
        id: page.id,
        name: properties.Name?.title?.[0]?.text?.content || '',
        description: properties.Description?.rich_text?.[0]?.text?.content || '',
        mdContent: properties['MD Content']?.rich_text?.[0]?.text?.content || '',
        author: properties.Author?.rich_text?.[0]?.text?.content || '',
        publicationDate: properties['Publication Date']?.date?.start || null,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time,
      };
    });

    return NextResponse.json({ news });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}