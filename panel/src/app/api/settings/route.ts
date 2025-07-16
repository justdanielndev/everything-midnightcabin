import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const settingsDbId = process.env.NOTION_GLOBAL_SETTINGS_DB_ID!;

type NotionProperty = {
  type: string;
  title?: { plain_text: string }[];
  rich_text?: { plain_text: string }[];
  select?: { name: string };
  checkbox?: boolean;
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
    case 'checkbox':
      return property.checkbox || false;
    default:
      return '';
  }
}

export async function GET() {
  try {
    if (!settingsDbId) {
      return NextResponse.json({ error: 'Settings database ID not configured' }, { status: 500 });
    }

    const response = await notion.databases.query({
      database_id: settingsDbId,
    });

    const settings: Record<string, string | boolean> = {};

    response.results.forEach((page) => {
      // @ts-expect-error - error expected :3
      const props = page.properties;
      
      const item = extractPropertyValue(props.Item);
      const value = extractPropertyValue(props.Value);
      
      if (item) {
        if (value === 'true' || value === 'false') {
          // @ts-expect-error - error expected :3
          settings[item] = value === 'true';
        } else {
          // @ts-expect-error - error expected :3
          settings[item] = value;
        }
      }
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching global settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}