import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const membersDbId = process.env.NOTION_MEMBERS_DB_ID!;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPropertyValue(property: any) {
  if (!property) return '';

  switch (property.type) {
    case 'title':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return property.title.map((t: any) => t.plain_text).join('');
    case 'rich_text':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return property.rich_text.map((t: any) => t.plain_text).join('');
    case 'email':
      return property.email || '';
    case 'phone_number':
      return property.phone_number || '';
    case 'date':
      return property.date?.start || '';
    case 'select':
      return property.select?.name || '';
    case 'number':
      return property.number || 0;
    case 'url':
      return property.url || '';
    case 'checkbox':
      return property.checkbox || false;
    default:
      return '';
  }
}

async function findUserBySlackId(slackUserId: string) {
  const members = await notion.databases.query({
    database_id: membersDbId,
    filter: {
      property: 'Slack ID',
      rich_text: {
        equals: slackUserId
      }
    }
  });
  
  if (members.results.length > 0) {
    const member = members.results[0];
    // @ts-expect-error - error expected :3 - Notion API response typing is complex
    const props = member.properties;
    return {
      id: member.id,
      name: extractPropertyValue(props.Name),
      email: extractPropertyValue(props['Email Address']),
      slackId: extractPropertyValue(props['Slack ID']),
      slackName: extractPropertyValue(props['Slack Name']),
      xp: extractPropertyValue(props['Experience Points']),
      teamId: extractPropertyValue(props['Team ID']),
      banned: extractPropertyValue(props['Banned']),
      banreason: extractPropertyValue(props['Ban reason']),
      purchasedItems: extractPropertyValue(props['Store Items Bought (JSON)'])
    };
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const slackUserId = cookieStore.get('slack_user_id')?.value;
    
    if (!slackUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { purchaseIndex, markAsUsed } = await request.json();
    
    if (typeof purchaseIndex !== 'number' || typeof markAsUsed !== 'boolean') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const user = await findUserBySlackId(slackUserId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let purchasedItems = [];
    try {
      if (user.purchasedItems) {
        purchasedItems = JSON.parse(user.purchasedItems);
      }
    } catch (error) {
      console.error('Error parsing purchased items JSON:', error);
      return NextResponse.json({ error: 'Invalid purchase data' }, { status: 500 });
    }

    if (purchaseIndex < 0 || purchaseIndex >= purchasedItems.length) {
      return NextResponse.json({ error: 'Invalid purchase index' }, { status: 400 });
    }

    purchasedItems[purchaseIndex] = {
      ...purchasedItems[purchaseIndex],
      used: markAsUsed,
      usedAt: markAsUsed ? new Date().toISOString() : null
    };

    await notion.pages.update({
      page_id: user.id,
      properties: {
        'Store Items Bought (JSON)': {
          rich_text: [
            {
              text: {
                content: JSON.stringify(purchasedItems)
              }
            }
          ]
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Item marked as ${markAsUsed ? 'used' : 'unused'}`,
      updatedItem: purchasedItems[purchaseIndex]
    });

  } catch (error) {
    console.error('Error toggling item usage:', error);
    return NextResponse.json({ error: 'Failed to update item usage' }, { status: 500 });
  }
}