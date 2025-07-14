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
    // @ts-expect-error - error expected :3
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

async function getStoreItem(itemId: string) {
  try {
    const response = await notion.pages.retrieve({ page_id: itemId });
    // @ts-expect-error - error expected :3
    const properties = response.properties;
    
    return {
      id: response.id,
      name: extractPropertyValue(properties.Name),
      description: extractPropertyValue(properties.Description),
      xpPrice: extractPropertyValue(properties['XP Price']),
      stockStatus: extractPropertyValue(properties['Stock Status']),
      category: extractPropertyValue(properties.Category),
      limitPerPerson: extractPropertyValue(properties['Limit per person']),
    };
  } catch (error) {
    console.error('Error fetching store item:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const slackUserId = cookieStore.get('slack_user_id')?.value;
    
    if (!slackUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { itemId } = await request.json();
    
    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const user = await findUserBySlackId(slackUserId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const storeItem = await getStoreItem(itemId);
    if (!storeItem) {
      return NextResponse.json({ error: 'Store item not found' }, { status: 404 });
    }

    if (storeItem.stockStatus !== 'In stock') {
      return NextResponse.json({ error: 'Item is not in stock' }, { status: 400 });
    }

    if (user.xp < storeItem.xpPrice) {
      return NextResponse.json({ error: 'Insufficient XP' }, { status: 400 });
    }

    let purchasedItems = [];
    try {
      if (user.purchasedItems) {
        purchasedItems = JSON.parse(user.purchasedItems);
      }
    } catch (error) {
      console.error('Error parsing purchased items JSON:', error);
      purchasedItems = [];
    }

    if (storeItem.limitPerPerson > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemPurchases = purchasedItems.filter((item: any) => item.itemId === itemId);
      if (itemPurchases.length >= storeItem.limitPerPerson) {
        return NextResponse.json({ error: 'Purchase limit reached for this item' }, { status: 400 });
      }
    }

    const purchaseRecord = {
      itemId: itemId,
      itemName: storeItem.name,
      category: storeItem.category,
      xpPrice: storeItem.xpPrice,
      purchasedAt: new Date().toISOString(),
      used: false,
      usedAt: null
    };

    purchasedItems.push(purchaseRecord);
    const newXP = user.xp - storeItem.xpPrice;

    await notion.pages.update({
      page_id: user.id,
      properties: {
        'Experience Points': {
          number: newXP
        },
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
      purchase: purchaseRecord,
      newXP: newXP,
      message: `Successfully purchased ${storeItem.name} for ${storeItem.xpPrice} XP!`
    });

  } catch (error) {
    console.error('Error processing purchase:', error);
    return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 });
  }
}