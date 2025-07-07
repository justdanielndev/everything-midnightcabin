const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { Client: NotionClient } = require('@notionhq/client');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const notion = new NotionClient({
  auth: process.env.NOTION_API_KEY
});

const databaseIds = {
  members: process.env.NOTION_MEMBERS_DB_ID,
  projects: process.env.NOTION_PROJECTS_DB_ID,
  teams: process.env.NOTION_TEAMS_DB_ID
};

const admins = ["483347547415642142"];

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

async function findUserBySlackId(slackUserId) {
  const members = await queryNotionDatabase(databaseIds.members, {
    property: 'Slack ID',
    rich_text: {
      equals: slackUserId
    }
  });
  return members.length > 0 ? formatMemberData(members[0]) : null;
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

const commands = [
  new SlashCommandBuilder()
    .setName('viewpendingprojects')
    .setDescription('View all pending projects'),
  
  new SlashCommandBuilder()
    .setName('approveproject')
    .setDescription('Approve a project')
    .addStringOption(option =>
      option.setName('project_id')
        .setDescription('The project ID to approve')
        .setRequired(true)
    ),
  
  new SlashCommandBuilder()
    .setName('rejectproject')
    .setDescription('Reject a project')
    .addStringOption(option =>
      option.setName('project_id')
        .setDescription('The project ID to reject')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for rejection')
        .setRequired(true)
    ),
  
  new SlashCommandBuilder()
    .setName('banuser')
    .setDescription('Ban a user')
    .addStringOption(option =>
      option.setName('user_id')
        .setDescription('The Slack user ID to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for ban')
        .setRequired(true)
        .addChoices(
          { name: 'Harassment/bad speech', value: 'Harassment/bad speech' },
          { name: 'Copy paste', value: 'Copy paste' },
          { name: 'Multi-user account', value: 'Multi-user account' },
          { name: 'AI Fraud', value: 'AI Fraud' },
          { name: 'Hackatime Fraud', value: 'Hackatime Fraud' },
          { name: 'Age Fraud', value: 'Age Fraud' }
        )
    ),
  
  new SlashCommandBuilder()
    .setName('unbanuser')
    .setDescription('Unban a user')
    .addStringOption(option =>
      option.setName('user_id')
        .setDescription('The Slack user ID to unban')
        .setRequired(true)
    )
];

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
  
  try {
    console.log('Started refreshing application (/) commands.');
    
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands
    });
    
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (!admins.includes(interaction.user.id)) {
    await interaction.reply({ content: 'You are not authorized to use this command.', ephemeral: true });
    return;
  }

  const { commandName } = interaction;

  try {
    await interaction.deferReply({ ephemeral: true });

    if (commandName === 'viewpendingprojects') {
      const pendingProjects = await getPendingProjects();
      if (!pendingProjects || pendingProjects.length === 0) {
        await interaction.followUp({ content: 'No pending projects found.', ephemeral: true });
        return;
      }

      const projectList = pendingProjects.map(project => `${project.name} (ID: ${project.id}) - Team: ${project.teamId}`).join('\n');
      await interaction.followUp({ content: `**Pending Projects:**\n${projectList}`, ephemeral: true });
    } else if (commandName === 'approveproject') {
      const projectId = interaction.options.getString('project_id');
      
      const project = await findProjectById(projectId);
      if (!project) {
        await interaction.followUp({ content: `Project with ID ${projectId} not found.`, ephemeral: true });
        return;
      }

      await approveProject(projectId);
      await interaction.followUp({ content: `Project ${project.name} has been approved.`, ephemeral: true });
    } else if (commandName === 'rejectproject') {
      const projectId = interaction.options.getString('project_id');
      const reason = interaction.options.getString('reason');
      
      const project = await findProjectById(projectId);
      if (!project) {
        await interaction.followUp({ content: `Project with ID ${projectId} not found.`, ephemeral: true });
        return;
      }

      await rejectProject(projectId, reason);
      await interaction.followUp({ content: `Project ${projectId} has been rejected for the following reason: ${reason}`, ephemeral: true });
    } else if (commandName === 'banuser') {
      const userId = interaction.options.getString('user_id');
      const banReason = interaction.options.getString('reason');
      
      let user = await findUserBySlackId(userId);
      if (!user) {
        await interaction.followUp({ content: `User with ID ${userId} not found.`, ephemeral: true });
        return;
      }

      await banUser(userId, banReason);
      await interaction.followUp({ content: `User ${user.slackName} has been banned for: ${banReason}`, ephemeral: true });
    } else if (commandName === 'unbanuser') {
      const userId = interaction.options.getString('user_id');
      
      let user = await findUserBySlackId(userId);
      if (!user) {
        await interaction.followUp({ content: `User with ID ${userId} not found.`, ephemeral: true });
        return;
      }

      await unbanUser(userId);
      await interaction.followUp({ content: `User ${user.slackName} has been unbanned.`, ephemeral: true });
    }
  } catch (error) {
    console.error('Error handling Discord command:', error);
    try {
      await interaction.followUp({ content: 'An error occurred while processing your command.', ephemeral: true });
    } catch (followUpError) {
      console.error('Error sending followup:', followUpError);
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
