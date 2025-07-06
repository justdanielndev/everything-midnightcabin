const { App } = require('@slack/bolt');
const { Client } = require('@notionhq/client');
require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

const databaseIds = {
  members: process.env.NOTION_MEMBERS_DB_ID,
  projects: process.env.NOTION_PROJECTS_DB_ID,
  teams: process.env.NOTION_TEAMS_DB_ID
};

async function queryNotionDatabase(databaseId, filter = null) {
  try {
    const queryOptions = {
      database_id: databaseId
    };
    
    if (filter && Object.keys(filter).length > 0) {
      queryOptions.filter = filter;
    }
    
    const response = await notion.databases.query(queryOptions);
    return response.results;
  } catch (error) {
    console.error('Error w/ Notion database:', error);
    return [];
  }
}

function extractPropertyValue(property) {
  if (!property) return '';
  
  switch (property.type) {
    case 'title':
      return property.title.map(t => t.plain_text).join('');
    case 'rich_text':
      return property.rich_text.map(t => t.plain_text).join('');
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
    case 'formula':
      return property.formula?.string || property.formula?.number || '';
    case 'rollup':
      return property.rollup?.array?.map(item => extractPropertyValue(item)).join(', ') || '';
    default:
      return '';
  }
}

function formatMemberData(page) {
  const props = page.properties;
  return {
    name: extractPropertyValue(props.Name),
    email: extractPropertyValue(props['Email Address']),
    phone: extractPropertyValue(props['Phone Number']),
    birthday: extractPropertyValue(props.Birthday),
    slackId: extractPropertyValue(props['Slack ID']),
    slackName: extractPropertyValue(props['Slack Name']),
    xp: extractPropertyValue(props['Experience Points']),
    teamId: extractPropertyValue(props['Team ID'])
  };
}

function formatProjectData(page) {
  const props = page.properties;
  return {
    name: extractPropertyValue(props.Name),
    description: extractPropertyValue(props.Description),
    teamId: extractPropertyValue(props['Team ID']),
    gitRepo: extractPropertyValue(props['Git Repo']),
    dateSubmitted: extractPropertyValue(props['Date Submitted']),
    status: extractPropertyValue(props.Status),
    hours: extractPropertyValue(props['Hackatime Hours'])
  };
}

function formatTeamData(page) {
  const props = page.properties;
  return {
    name: extractPropertyValue(props['Team Name']),
    size: extractPropertyValue(props['Team Size']),
    members: extractPropertyValue(props['Members (JSON)']),
    teamId: extractPropertyValue(props['Team ID']),
    projects: extractPropertyValue(props['Projects (JSON)'])
  };
}

async function findUserBySlackId(slackUserId) {
  const members = await queryNotionDatabase(databaseIds.members, {
    property: 'Slack ID',
    rich_text: {
      equals: slackUserId
    }
  });
  return members.length > 0 ? formatMemberData(members[0]) : null;
}

async function findUserBySlackName(slackUsername) {
  const members = await queryNotionDatabase(databaseIds.members, {
    property: 'Slack Name',
    rich_text: {
      equals: slackUsername
    }
  });
  return members.length > 0 ? formatMemberData(members[0]) : null;
}

app.command('/experience', async ({ command, ack, respond }) => {
  await ack();
  
  try {
    const slackUserId = command.user_id;
    const slackUsername = command.user_name;
    
    let user = await findUserBySlackId(slackUserId);
    if (!user) {
      user = await findUserBySlackName(slackUsername);
    }
    
    if (user) {
      if (user.xp === 0 || user.xp === '0' || !user.xp) {
        await respond({
          text: `:lego_goldcoin: You still haven't earned any experience points!`
        });
      } else {
        const xpValue = parseInt(user.xp) || 0;
        const level = Math.floor(xpValue / 1000);
        await respond({
          text: `:lego_goldcoin: You have ${xpValue} experience points! This means you are level ${level}. Keep up the great work! :yay:`
        });
      }
    } else {
      await respond({
        text: `You haven't started the quest to find the map to the Midnight Cabin yet! Why not begin now?`
      });
    }
  } catch (error) {
    console.error('Error in /experience command:', error);
    await respond({ text: 'Sorry, there was an error retrieving your experience points.' });
  }
});

app.command('/user', async ({ command, ack, respond }) => {
  await ack();
  
  try {
    const slackUserId = command.user_id;
    const slackUsername = command.user_name;
    
    let user = await findUserBySlackId(slackUserId);
    if (!user) {
      user = await findUserBySlackName(slackUsername);
    }
    
    if (user) {
      const teamData = await queryNotionDatabase(databaseIds.teams);
      const teamMembers = await queryNotionDatabase(databaseIds.members);
      
      let teamInfo = 'Not assigned';
      if (user.teamId) {
        const userTeam = teamData.find(page => {
          const team = formatTeamData(page);
          return team.teamId === user.teamId;
        });
        
        const userTeamMembers = teamMembers.filter(page => {
          const member = formatMemberData(page);
          return member.teamId === user.teamId;
        });
        
        if (userTeam) {
          const team = formatTeamData(userTeam);
          const teamName = team.name && team.name.trim() ? team.name : `Team ${user.teamId}`;
          teamInfo = `${teamName} (${userTeamMembers.length} members)`;
        } else {
          teamInfo = `Team ${user.teamId} (${userTeamMembers.length} members)`;
        }
      }
      
      await respond({
        text: `*Your Midnight Cabin Profile*\n\n:yay: *Slack Name:* ${user.slackName}\n:lego_goldcoin: *Experience:* ${user.xp} XP\n:handshake-ani: *Team:* ${teamInfo}`
      });
    } else {
      await respond({
        text: `You haven't started the quest to find the map to the Midnight Cabin yet! Why not begin now?`
      });
    }
  } catch (error) {
    console.error('Error in /user command:', error);
    await respond({ text: 'Sorry, there was an error retrieving your profile.' });
  }
});

app.command('/projects', async ({ command, ack, respond }) => {
  await ack();
  
  try {
    const slackUserId = command.user_id;
    const slackUsername = command.user_name;
    
    let user = await findUserBySlackId(slackUserId);
    if (!user) {
      user = await findUserBySlackName(slackUsername);
    }
    
    if (!user) {
      await respond({
        text: `You haven't started the quest to find the map to the Midnight Cabin yet! Why not begin now?`
      });
      return;
    }
    
    const userProjects = await queryNotionDatabase(databaseIds.projects, {
      property: 'Team ID',
      rich_text: {
        equals: user.teamId
      }
    });
    
    if (userProjects.length > 0) {
      const projectList = userProjects.map(page => {
        const project = formatProjectData(page);
        return `• *${project.name}*\n  Status: ${project.status}\n  Hours: ${project.hours}\n  ${project.description ? `Description: ${project.description}` : ''}\n  ${project.gitRepo ? `Repo: ${project.gitRepo}` : ''}`;
      }).join('\n\n');
      
      const teamData = await queryNotionDatabase(databaseIds.teams);
      const userTeam = teamData.find(page => {
        const team = formatTeamData(page);
        return team.teamId === user.teamId;
      });
      
      const teamName = userTeam ? formatTeamData(userTeam).name : user.teamId;
      
      await respond({
        text: `*Your Midnight Cabin Projects (Team ${teamName})*\n\n${projectList}`
      });
    } else {
      await respond({
        text: `You haven't created any projects yet... why not do that?`
      });
    }
  } catch (error) {
    console.error('Error in /projects command:', error);
    await respond({ text: 'Sorry, there was an error retrieving your projects.' });
  }
});

app.command('/team', async ({ command, ack, respond }) => {
  await ack();
  
  try {
    const slackUserId = command.user_id;
    const slackUsername = command.user_name;
    
    let user = await findUserBySlackId(slackUserId);
    if (!user) {
      user = await findUserBySlackName(slackUsername);
    }
    
    if (!user) {
      await respond({
        text: `You haven't started the quest to find the map to the Midnight Cabin yet! Why not begin now?`
      });
      return;
    }
    
    if (!user.teamId) {
      await respond({
        text: `You haven't joined a team yet! Why not create/join one? You can be the only member if you want...`
      });
      return;
    }
    
    const teamData = await queryNotionDatabase(databaseIds.teams);
    const teamMembers = await queryNotionDatabase(databaseIds.members);
    const teamProjects = await queryNotionDatabase(databaseIds.projects);
    
    const userTeam = teamData.find(page => {
      const team = formatTeamData(page);
      return team.teamId === user.teamId;
    });
    
    const userTeamMembers = teamMembers.filter(page => {
      const member = formatMemberData(page);
      return member.teamId === user.teamId;
    });
    
    const userTeamProjects = teamProjects.filter(page => {
      const project = formatProjectData(page);
      return project.teamId === user.teamId;
    });
    
    let teamInfo = '';
    if (userTeam) {
      const team = formatTeamData(userTeam);
      const teamName = team.name && team.name.trim() ? team.name : `Team ${user.teamId}`;
      teamInfo = `*Team:* ${teamName}\n*Size:* ${team.size}\n\n`;
    } else {
      teamInfo = `*Team:* Team ${user.teamId}\n\n`;
    }
    
    const membersList = userTeamMembers.map(page => {
      const member = formatMemberData(page);
      return `• ${member.slackName} - ${member.xp} XP`;
    }).join('\n');
    
    const projectsList = userTeamProjects.map(page => {
      const project = formatProjectData(page);
      return `• ${project.name} - ${project.status}`;
    }).join('\n');
    
    await respond({
      text: `*Your Midnight Cabin Team*\n\n${teamInfo}*Members:*\n${membersList || 'No members found'}\n\n*Projects:*\n${projectsList || 'No projects found'}`
    });
    
  } catch (error) {
    console.error('Error in /team command:', error);
    await respond({ text: 'Sorry, there was an error retrieving your team.' });
  }
});

app.command('/mc-stats', async ({ ack, respond }) => {
  await ack();
  
  try {
    const allMembers = await queryNotionDatabase(databaseIds.members);
    const allProjects = await queryNotionDatabase(databaseIds.projects);
    
    const totalUsers = allMembers.length;
    const totalProjects = allProjects.length;
    
    let goalMessage;
    if (totalUsers >= 200) {
      goalMessage = "User goal reached! Amazing work everyone! :partying_face:";
    } else {
      const usersToGo = 200 - totalUsers;
      goalMessage = `${usersToGo} to go towards our goal of 200 users! :rocket:`;
    }
    
    await respond({
      text: `*Midnight Cabin Statistics*\n\n:yay: *Total Users:* ${totalUsers}\n:wrench: *Total Projects:* ${totalProjects}\n\n${goalMessage}`
    });
  } catch (error) {
    console.error('Error in /mc-stats command:', error);
    await respond({ text: 'Sorry, there was an error retrieving statistics.' });
  }
});

app.command('/mc-help', async ({ ack, respond }) => {
  await ack();
  
  await respond({
    text: `*Midnight Cabin Bot Help*\n\n*Available Commands:*\n\n• \`/experience\` - Shows your experience points and level\n• \`/user\` - Shows info about you\n• \`/projects\` - Shows your projects\n• \`/team\` - Shows info about your team\n• \`/mc-stats\` - Shows total users and projects\n• \`/mc-help\` - Shows this help message :D`
  });
});

(async () => {
  await app.start();
  console.log('Running!');
})();
