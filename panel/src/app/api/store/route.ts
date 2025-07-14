import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export async function GET() {
  try {
    const storeDbId = process.env.NOTION_STOREITEMS_DB_ID;
    
    if (!storeDbId) {
      return NextResponse.json({ error: 'Store items database ID not configured' }, { status: 500 });
    }

    const response = await notion.databases.query({
      database_id: storeDbId,
      sorts: [
        {
          property: 'Category',
          direction: 'ascending',
        },
        {
          property: 'XP Price',
          direction: 'ascending',
        },
      ],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storeItems = await Promise.all(response.results.map(async (page: any) => {
      const properties = page.properties;
      
      const eventRelation = properties.Event?.relation?.[0];
      let relatedEvent = null;
      
      if (eventRelation?.id) {
        try {
          const eventPage = await notion.pages.retrieve({ page_id: eventRelation.id });
          // @ts-expect-error - error expected :3
          const eventProps = eventPage.properties;
          relatedEvent = {
            id: eventPage.id,
            name: eventProps.Name?.title?.[0]?.text?.content || '',
            dayOfWeek: eventProps['Day of week']?.select?.name || '',
            hour: eventProps.Hour?.rich_text?.[0]?.text?.content || '',
          };
        } catch (error) {
          console.error(`Error fetching related event for item ${properties.Name?.title?.[0]?.text?.content}:`, error);
          relatedEvent = null;
        }
      }

      return {
        id: page.id,
        name: properties.Name?.title?.[0]?.text?.content || '',
        description: properties.Description?.rich_text?.[0]?.text?.content || '',
        xpPrice: properties['XP Price']?.number || 0,
        stockStatus: properties['Stock Status']?.select?.name || 'No stock',
        category: properties.Category?.select?.name || 'Other',
        limitPerPerson: properties['Limit per person']?.number || 1,
        relatedEvent: relatedEvent,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time,
      };
    }));

    return NextResponse.json({ storeItems });
  } catch (error) {
    console.error('Error fetching store items:', error);
    return NextResponse.json({ error: 'Failed to fetch store items' }, { status: 500 });
  }
}