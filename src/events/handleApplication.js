const { ButtonBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const { queryDB } = require('../utils/databaseUtils');
const { sendMCCommand, logRCON } = require('../utils/rconUtils.js');

function createButtons(applicantUserId, rank, data, config) {
  const buttons = [{ id: `approveApplication:${applicantUserId}/${rank}`, label: `Approve (${data.approvals}/${data.requiredApprovals})`, style: 'Primary' }];

  if (config.enableVouch) buttons.push({ id: `vouchButton:${applicantUserId}`, label: `Vouch (${data.vouches} Received)`, style: 'Success' });
  if (config.enableRankPoints) buttons.push({ id: `accumulatedPts`, label: `Points: ${data.userPoints}/${data.requiredPts}`, style: 'Secondary', disabled: true });

  buttons.push({ id: `refreshApplication:${applicantUserId}/${rank}`, label: 'Refresh', style: 'Secondary' });

  const row = new ActionRowBuilder();
  buttons.forEach(({ id, label, style, disabled = false }) => {
    row.addComponents(new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style).setDisabled(disabled));
  });
  return row;
}

async function approveApplication(interaction, applicantUserId, rank) {
  await interaction.deferUpdate();
  const config = interaction.client.config;
  const griggyDatabaseDir = config.griggyDbPath;

  const application = await queryDB(griggyDatabaseDir, 'SELECT * FROM applications WHERE message_id = ?', [interaction.message.id], true);
  if (!application) return interaction.followUp({ content: `No active application found for <@${applicantUserId}>.`, flags: MessageFlags.Ephemeral });

  const approvals = parseInt(application.approvals || 0, 10);
  const updatedApprovals = approvals + 1;
  await queryDB(griggyDatabaseDir, 'UPDATE applications SET approvals = ? WHERE message_id = ?', [updatedApprovals, interaction.message.id]);

  await interaction.channel.send(`<@${interaction.user.id}> has approved this application. Multiple approvals may be required for higher ranks.`);
  await refreshApplication(interaction, applicantUserId, rank);
}

async function refreshApplication(interaction, applicantUserId, rank) {
  const config = interaction.client.config;
  const griggyDatabaseDir = config.griggyDbPath;
  const cmiDatabaseDir = config.cmi_sqlite_db;
  const rankConfig = config.ranks.find(r => r.name === rank);
  if (!rankConfig) return interaction.reply({ content: `The rank "${rank}" is not configured.`, flags: MessageFlags.Ephemeral });
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();

  const application = await queryDB(griggyDatabaseDir, `SELECT * FROM applications WHERE message_id = ?`, [interaction.message.id], true);

  if (!application) return interaction.followUp({ content: `No active application found for <@${applicantUserId}>.`, flags: MessageFlags.Ephemeral });

  const { approvals = 0 } = application;
  const { vouches = 0 } = await queryDB(griggyDatabaseDir, 'SELECT * FROM users WHERE discord_id = ?', [applicantUserId], true) || {};
  const userPoints = config.enableRankPoints
    ? await queryDB(cmiDatabaseDir, 'SELECT UserMeta FROM users WHERE username = ? COLLATE NOCASE', [application.player_name], true)
      .then(row => parseFloat((row.UserMeta || '').split('%%')[1], 10) || 0)
    : 0;

  const buttonRow = createButtons(applicantUserId, rank, {
    approvals,
    requiredApprovals: rankConfig.requiredStaffApprovals,
    requiredPts: rankConfig.requiredPoints,
    vouches,
    userPoints,
  }, config);

  const submissionMessage = await interaction.channel.messages.fetch(application.message_id).catch(() => null);
  if (!submissionMessage) return interaction.followUp({ content: 'Error: The application message could not be found. It may have been deleted.', flags: MessageFlags.Ephemeral });

  if (
    approvals >= rankConfig.requiredStaffApprovals &&
    (config.enableRankPoints ? userPoints >= rankConfig.requiredPoints : true)
  ) {
    const guild = interaction.guild;
    const member = await guild.members.fetch(applicantUserId).catch(() => null);
    if (member) {
      const role = await guild.roles.cache.find(r => r.name.toLowerCase() === rank.toLowerCase());
      if (role) {
        const command = `lp user ${application.player_name} promote player`;
        try {
          const response = await sendMCCommand(command);
          logRCON(command, response);
          await member.roles.add(role);
          await interaction.channel.send(`Your application has been approved, congratulations <@${member.id}>! 🎉`);
          await interaction.channel.setLocked(true);
          await queryDB(griggyDatabaseDir, 'UPDATE applications SET status = ? WHERE message_id = ?', ['approved', interaction.message.id]);
        } catch (error) {
          await interaction.followUp({ content: `An error occurred while promoting the user. Please try again later.`, flags: MessageFlags.Ephemeral });
          interaction.client.log('Error promoting user:', 'ERROR', error);
          return;
        }
      } else {
        return interaction.followUp({ content: `Role "${rank}" not found in the server. Please check role setup.`, flags: MessageFlags.Ephemeral });
      }
    } else {
      return interaction.followUp({ content: `Could not fetch member <@${applicantUserId}>. They might not be in the server.`, flags: MessageFlags.Ephemeral });
    }
  }

  await submissionMessage.edit({ components: [buttonRow] });
  if (approvals < rankConfig.requiredStaffApprovals || (config.enableRankPoints && userPoints < rankConfig.requiredPoints)) return;
}

module.exports = { approveApplication, refreshApplication };