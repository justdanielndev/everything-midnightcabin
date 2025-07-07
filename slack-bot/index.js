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

const admins = ["U0929F6RWL9", "U08T4JQJRJA", "U07H08JHT2L"];

const banReasons = [
  "Harassment/bad speech",
  "Copy paste",
  "Multi-user account",
  "AI Fraud",
  "Hackatime Fraud",
  "Age Fraud"
];

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

async function updateNotionDatabase(databaseId, properties) {
  try {
    await notion.pages.update({
      page_id: databaseId,
      properties
    });
  } catch (error) {
    console.error('Error updating Notion database:', error);
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
    case 'checkbox':
      return property.checkbox || false;
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
    teamId: extractPropertyValue(props['Team ID']),
    banned: extractPropertyValue(props['Banned']),
    banreason: extractPropertyValue(props['Ban reason'])
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
    hours: extractPropertyValue(props['Hackatime Hours']),
    rejectreason: extractPropertyValue(props['Rejection Reason']),
    id: extractPropertyValue(props['Project ID'])
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

async function banUser(slackUserId, reason) {
  const members = await queryNotionDatabase(databaseIds.members, {
    property: 'Slack ID',
    rich_text: {
      equals: slackUserId
    }
  });
  if (members.length > 0) {
    const pageId = members[0].id;
    const properties = {
      'Banned': {
        checkbox: true
      },
      'Ban reason': {
        select: {
          name: reason
        }
      }
    };
    await updateNotionDatabase(pageId, properties);
  }
}

async function unbanUser(slackUserId) {
  const members = await queryNotionDatabase(databaseIds.members, {
    property: 'Slack ID',
    rich_text: {
      equals: slackUserId
    }
  });
  if (members.length > 0) {
    const pageId = members[0].id;
    const properties = {
      'Banned': {
        checkbox: false
      },
      'Ban reason': {
        select: {
          name: 'Unbanned'
        }
      }
    };
    await updateNotionDatabase(pageId, properties);
  }
}

async function findProjectById(projectId) {
  const projects = await queryNotionDatabase(databaseIds.projects, {
    property: 'Project ID',
    rich_text: {
      equals: projectId
    }
  });
  return projects.length > 0 ? formatProjectData(projects[0]) : null;
}

async function approveProject(projectId) {
  const projects = await queryNotionDatabase(databaseIds.projects, {
    property: 'Project ID',
    rich_text: {
      equals: projectId
    }
  });
  if (projects.length > 0) {
    const pageId = projects[0].id;
    const properties = {
      Status: {
        select: {
          name: 'Approved'
        }
      }
    };
    await updateNotionDatabase(pageId, properties);
  }
}

async function rejectProject(projectId, reason) {
  const projects = await queryNotionDatabase(databaseIds.projects, {
    property: 'Project ID',
    rich_text: {
      equals: projectId
    }
  });
  if (projects.length > 0) {
    const pageId = projects[0].id;
    const properties = {
      Status: {
        select: {
          name: 'Rejected'
        }
      },
      'Rejection Reason': {
        rich_text: [
          {
            text: {
              content: reason
            }
          }
        ]
      }
    };
    await updateNotionDatabase(pageId, properties);
  }
}

async function getPendingProjects() {
  const projects = await queryNotionDatabase(databaseIds.projects);
  return projects.filter(page => {
    const project = formatProjectData(page);
    return project.status === 'Submitted';
  }).map(page => formatProjectData(page));
}

app.command('/experience', async ({ command, ack, respond }) => {
  await ack();

  try {
    const slackUserId = command.user_id;

    let user = await findUserBySlackId(slackUserId);

    if (user) {
      if (user.banned) {
        await respond({
          text: `:no_entry: You're banned from Midnight Cabin for: ${user.banreason}. If you believe this is a mistake, please contact the staff.`
        });
        return;
      }
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
        text: `I can't find your user... Seems like you haven't started the quest to find the map to the Midnight Cabin yet! Why not begin now?`
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

    let user = await findUserBySlackId(slackUserId);

    if (user) {
      if (user.banned) {
        await respond({
          text: `:no_entry: You're banned from Midnight Cabin for: ${user.banreason}. If you believe this is a mistake, please contact the staff.`
        });
        return;
      }
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
        text: `*Your Profile*\n\n:yay: *Slack Name:* ${user.slackName}\n:lego_goldcoin: *Experience:* ${user.xp} XP\n:handshake-ani: *Team:* ${teamInfo}`
      });
    } else {
      await respond({
        text: `I can't find your user... Seems like you haven't started the quest to find the map to the Midnight Cabin yet! Why not begin now?`
      });
      return;
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

    let user = await findUserBySlackId(slackUserId);
    if (!user) {
      await respond({
        text: `I can't find your user... Seems like you haven't started the quest to find the map to the Midnight Cabin yet! Why not begin now?`
      });
      return;
    }

    if (user.banned) {
      await respond({
        text: `:no_entry: You're banned from Midnight Cabin for: ${user.banreason}. If you believe this is a mistake, please contact the staff.`
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
        let projectmessage = `• *${project.name}*\n`
        if (project.status == 'Rejected') {
          projectmessage += `  Status: ${project.status}\n  Reason for Rejection: ${project.rejectreason}\n`
        } else {
          projectmessage += `  Status: ${project.status}\n`
        }

        return projectmessage + `  Hours: ${project.hours}\n  ${project.description ? `Description: ${project.description}` : ''}\n  ${project.gitRepo ? `Repo: ${project.gitRepo}` : ''}`;
      }).join('\n\n');

      const teamData = await queryNotionDatabase(databaseIds.teams);
      const userTeam = teamData.find(page => {
        const team = formatTeamData(page);
        return team.teamId === user.teamId;
      });

      const teamName = userTeam ? formatTeamData(userTeam).name : user.teamId;

      await respond({
        text: `*Your Projects (Team ${teamName})*\n\n${projectList}`
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

    let user = await findUserBySlackId(slackUserId);
    if (!user) {
      await respond({
        text: `I can't find your user... Seems like you haven't started the quest to find the map to the Midnight Cabin yet! Why not begin now?`
      });
      return;
    }

    if (user.banned) {
        await respond({
          text: `:no_entry: You're banned from Midnight Cabin for: ${user.banreason}. If you believe this is a mistake, please contact the staff.`
        });
        return;
      }

    if (!user.teamId) {
      await respond({
        text: `I can't find your team... Seems like you haven't joined a team yet! Why not create/join one? You can be the only member if you want...`
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
      text: `*Your Team*\n\n${teamInfo}*Members:*\n${membersList || 'No members found'}\n\n*Projects:*\n${projectsList || 'No projects found'}`
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
      text: `*Statistics*\n\n:yay: *Total Users:* ${totalUsers}\n:wrench: *Total Projects:* ${totalProjects}\n\n${goalMessage}`
    });
  } catch (error) {
    console.error('Error in /mc-stats command:', error);
    await respond({ text: 'Sorry, there was an error retrieving statistics.' });
  }
});

app.command('/mc-help', async ({ ack, respond }) => {
  await ack();

  await respond({
    text: `*Midnight Cabin Bot Help*\n\n*Available Commands:*\n\n• \`/experience\` - Shows your experience points and level\n• \`/user\` - Shows info about you\n• \`/projects\` - Shows your projects\n• \`/team\` - Shows info about your team\n• \`/mc-stats\` - Shows total users and projects\n• \`/mc-help\` - Shows this help message :D\n• \`/mc-ping\` - Kindly asks the bot to reply with Pong and the time taken to respond with that.\n\nHave any questions? Check out our help center at https://help.midnightcabin.tech/en (you can also chat with us there!) or email help@midnightcabin.tech.`
  });
});

app.command('/mc-ping', async ({ ack, respond }) => {
  await ack();
  const startTime = Date.now();
  await respond({ text: 'Pong! 🏓' });
  const endTime = Date.now();
  await respond({ text: `Response took ${endTime - startTime}ms :D` });
});

app.command('/adm-mc-ban', async ({ ack, respond, command }) => {
  await ack();

  const parts = command.text.match(/^([^\s]+)\s+(.+)$/);
  if (!parts) {
    await respond({ text: 'Please provide a user ID and ban reason.' });
    return;
  }
  const userId = parts[1];
  const banReason = parts[2];
  if (!userId) {
    await respond({ text: 'Please provide a user ID to ban.' });
    return;
  }

  if (!admins.includes(command.user_id)) {
    await respond({ text: 'You are not authorized to use this command.' });
    return;
  }

  if (!banReason) {
    await respond({ text: 'Please provide a reason for the ban. Available reasons are: "Harassment/bad speech", "Copy paste", "Multi-user account", "AI Fraud", "Hackatime Fraud", "Age Fraud"' });
    return;
  }

  if (!banReasons.includes(banReason)) {
    await respond({ text: `Invalid ban reason. Available reasons are: ${banReasons.join(', ')}` });
    return;
  }

  let user = await findUserBySlackId(userId);
  if (!user) {
    await respond({ text: `User with ID ${userId} not found.` });
    return;
  }

  await banUser(userId, banReason);
  await respond({ text: `User ${user.slackName} has been banned for: ${banReason}` });
});

app.command('/adm-mc-unban', async ({ ack, respond, command }) => {
  await ack();

  const parts = command.text.match(/^([^\s]+)\s*$/);
  if (!parts) {
    await respond({ text: 'Please provide a user ID.' });
    return;
  }
  const userId = parts[1];
  if (!userId) {
    await respond({ text: 'Please provide a user ID to unban.' });
    return;
  }

  if (!admins.includes(command.user_id)) {
    await respond({ text: 'You are not authorized to use this command.' });
    return;
  }

  let user = await findUserBySlackId(userId);
  if (!user) {
    await respond({ text: `User with ID ${userId} not found.` });
    return;
  }

  await unbanUser(userId);
  await respond({ text: `User ${user.slackName} has been unbanned.` });
});

app.command('/adm-mc-approveproject', async ({ ack, respond, command }) => {
  await ack();
  const projectId = command.text.trim();
  if (!projectId) {
    await respond({ text: 'Please provide a project ID.' });
    return;
  }

  const project = await findProjectById(projectId);
  if (!project) {
    await respond({ text: `Project with ID ${projectId} not found.` });
    return;
  }

  await approveProject(projectId);
  await respond({ text: `Project ${project.name} has been approved.` });
});

app.command('/adm-mc-rejectproject', async ({ ack, respond, command }) => {
  await ack();
  const parts = command.text.match(/^([^\s]+)\s+(.+)$/);
  if (!parts) {
    await respond({ text: 'Please provide a project ID and a reason for rejection.' });
    return;
  }
  const projectId = parts[1];
  const reason = parts[2];

  const project = await findProjectById(projectId);

  if (!project) {
    await respond({ text: `Project with ID ${projectId} not found.` });
    return;
  }

  await rejectProject(projectId, reason);

  await respond({ text: `Project ${projectId} has been rejected for the following reason: ${reason}` });
});

app.command('/adm-mc-viewpendingprojects', async ({ ack, respond, command }) => {
  await ack();

  const userId = command.user_id;

  if (!admins.includes(userId)) {
    await respond({ text: 'You are not authorized to use this command.' });
    return;
  }

  const pendingProjects = await getPendingProjects();
  if (!pendingProjects || pendingProjects.length === 0) {
    await respond({ text: 'No pending projects found.' });
    return;
  }

  const projectList = pendingProjects.map(project => `• ${project.name} (ID: ${project.id}) - Team: ${project.teamId}`).join('\n');
  await respond({ text: `Pending Projects:\n${projectList}` });
});

(async () => {
  await app.start();
  console.log('[INFO] Midnight Cabin Bot :D - The bot is running! People can now run commands.');
  require('./discord.js');
})();
