import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const membersDbId = process.env.NOTION_MEMBERS_DB_ID!;
const teamsDbId = process.env.NOTION_TEAMS_DB_ID!;

type NotionProperty = {
  type: string;
  title?: { plain_text: string }[];
  rich_text?: { plain_text: string }[];
  email?: string;
  phone_number?: string;
  date?: { start: string };
  select?: { name: string };
  number?: number;
  url?: string;
  checkbox?: boolean;
};

function extractPropertyValue(property: NotionProperty) {
  if (!property) return '';

  switch (property.type) {
    case 'title':
      return property.title?.map((t) => t.plain_text).join('') || '';
    case 'rich_text':
      return property.rich_text?.map((t) => t.plain_text).join('') || '';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryNotionDatabase(databaseId: string, filter: any = null) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryOptions: any = {
      database_id: databaseId
    };

    if (filter && Object.keys(filter).length > 0) {
      queryOptions.filter = filter;
    }

    const response = await notion.databases.query(queryOptions);
    return response.results;
  } catch (error) {
    console.error('Error querying Notion database:', error);
    return [];
  }
}

async function getTeamNameById(teamId: string) {
  if (!teamId) return 'No Team Assigned';
  
  try {
    const teams = await queryNotionDatabase(teamsDbId, {
      property: 'Team ID',
      rich_text: {
        equals: teamId
      }
    });
    
    if (teams.length > 0) {
      const team = teams[0];
      // @ts-expect-error - error expected :3
      const props = team.properties;
      const teamName = extractPropertyValue(props['Team Name']);
      return teamName || 'No Team Assigned';
    }
    
    return 'No Team Assigned';
  } catch (error) {
    console.error('Error fetching team name:', error);
    return 'No Team Assigned';
  }
}

async function getMemberXP(slackId: string): Promise<number> {
  try {
    const response = await notion.databases.query({
      database_id: membersDbId,
      filter: {
        property: 'Slack ID',
        rich_text: {
          equals: slackId
        }
      }
    });
    
    if (response.results.length > 0) {
      const member = response.results[0];
      // @ts-expect-error - error expected :3
      return member.properties['Experience Points']?.number || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error fetching member XP:', error);
    return 0;
  }
}

export async function GET() {
  try {
    const members = await queryNotionDatabase(membersDbId);
    
    const usersWithTeams = await Promise.all(
      members.map(async (member) => {
        // @ts-expect-error - error expected :3
        const props = member.properties;
        const teamId = extractPropertyValue(props['Team ID']);
        // @ts-expect-error - error expected :3
        const teamName = await getTeamNameById(teamId);
        
        return {
          id: extractPropertyValue(props['Slack ID']),
          name: extractPropertyValue(props.Name),
          slackName: extractPropertyValue(props['Slack Name']),
          xp: Number(extractPropertyValue(props['Experience Points'])) || 0,
          teamId: teamId,
          teamName: teamName,
          banned: extractPropertyValue(props['Banned'])
        };
      })
    );

    const activeUsers = usersWithTeams
      .filter(user => !user.banned && user.xp > 0)
      .sort((a, b) => b.xp - a.xp)
      .map((user, index) => ({
        ...user,
        rank: index + 1
      }));

    const teamsResponse = await notion.databases.query({
      database_id: teamsDbId,
    });

    const teamsArray = await Promise.all(
      teamsResponse.results.map(async (page: unknown) => {
        const properties = (page as { properties: Record<string, unknown> }).properties;
        
        let members: { id: string; name: string }[] = [];
        try {
          const membersJson = (properties['Members (JSON)'] as { rich_text?: { plain_text: string }[] })?.rich_text?.[0]?.plain_text || '[]';
          members = JSON.parse(membersJson);
        } catch (error) {
          console.error('Error parsing members JSON:', error);
        }

        const membersWithXP = await Promise.all(members.map(async (member: { id: string; name: string }) => ({
          ...member,
          xp: await getMemberXP(member.id)
        })));

        const totalXP = membersWithXP.reduce((sum, member) => sum + member.xp, 0);
        const memberCount = membersWithXP.length;

        return {
          // @ts-expect-error - error expected :3
          teamName: properties['Team Name']?.rich_text?.[0]?.plain_text || '',
          totalXP: totalXP,
          memberCount: memberCount,
          averageXP: memberCount > 0 ? Math.round(totalXP / memberCount) : 0
        };
      })
    );

    const sortedTeams = teamsArray
      .filter(team => team.teamName && team.memberCount > 0)
      .sort((a, b) => b.totalXP - a.totalXP)
      .map((team, index) => ({
        ...team,
        rank: index + 1
      }));

    return NextResponse.json({
      users: activeUsers.slice(0, 100),
      teams: sortedTeams
    });

  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard data' }, { status: 500 });
  }
}