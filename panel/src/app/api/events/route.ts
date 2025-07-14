import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export async function GET() {
  try {
    const eventsDbId = process.env.NOTION_EVENTS_DB_ID;
    
    if (!eventsDbId) {
      return NextResponse.json({ error: 'Events database ID not configured' }, { status: 500 });
    }

    const response = await notion.databases.query({
      database_id: eventsDbId,
      sorts: [
        {
          property: 'Day of week',
          direction: 'ascending',
        },
        {
          property: 'Hour',
          direction: 'ascending',
        },
      ],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = response.results.map((page: any) => {
      const properties = page.properties;
      const extras = properties.Extras?.multi_select || [];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isMainEvent = extras.some((tag: any) => tag.name === 'Main event');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isStoreUnlockable = extras.some((tag: any) => tag.name === 'Store-unlockable');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasLimitedAttendees = extras.some((tag: any) => tag.name === 'Limited attendees');
      const storeItemRelation = properties['Store Item']?.relation?.[0];
      
      return {
        id: page.id,
        name: properties.Name?.title?.[0]?.text?.content || '',
        location: properties.Location?.rich_text?.[0]?.text?.content || '',
        description: properties.Description?.rich_text?.[0]?.text?.content || '',
        dayOfWeek: properties['Day of week']?.select?.name || '',
        hour: properties.Hour?.rich_text?.[0]?.text?.content || '',
        isMainEvent,
        isStoreUnlockable,
        hasLimitedAttendees,
        xpToBuy: isStoreUnlockable ? (properties['XP to buy']?.rich_text?.[0]?.text?.content || '') : null,
        maxAttendees: hasLimitedAttendees ? (properties['Max Attendees']?.number || null) : null,
        storeItemId: storeItemRelation?.id || null,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time,
      };
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}