const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { queryDB } = require('../../utils/databaseUtils');
const { checkStaff } = require('../../utils/roleCheckUtils');
const { getConfig } = require('../../utils/configUtils');

const config = getConfig();
const ranks = config.ranks;
const griggyDatabaseDir = config.griggyDbPath;

module.exports = {
  data: (() => {
    const command = new SlashCommandBuilder()
      .setName('deleteapplication')
      .setDescription('Delete an application')
      .addStringOption(option => {
        option.setName('rank')
          .setDescription('The rank application to delete.')
          .setRequired(true);

        ranks.forEach(rank => {
          option.addChoices({ name: rank.displayName, value: rank.name });
        });

        return option;
      })
      .addStringOption(option =>
        option.setName('playername')
          .setDescription('Your in-game Minecraft username.')
          .setRequired(true)
      );

    return command;
  })(),

  async run(interaction) {
    const rank = interaction.options.getString('rank');
    const playerName = interaction.options.getString('playername');

    const row = await queryDB(griggyDatabaseDir, `SELECT * FROM applications WHERE role = ? AND player_name = ?`, [rank, playerName], true);

    if (!row) return interaction.reply({ content: 'No active application found for the specified rank and player.', flags: MessageFlags.Ephemeral });
    if (row.status !== 'active') return interaction.reply({ content: 'You can only delete active applications.', flags: MessageFlags.Ephemeral });

    const isStaff = checkStaff(interaction.member);
    if (interaction.user.id !== row.discord_id && !isStaff) return interaction.reply({ content: 'You are not authorized to delete this application.', flags: MessageFlags.Ephemeral });

    const embed = new EmbedBuilder()
      .setTitle('Delete Application Confirmation')
      .setDescription(`Rank: **${rank}**\nPlayer: **${playerName}**\nStatus: **${row.status}**`)
      .setColor(0xFF0000);

    await interaction.reply({ embeds: [embed] });
    const confirmationMessage = await interaction.fetchReply();

    confirmationMessage.react('✅').catch(err => interaction.client.log('Failed to react:', 'ERROR', err));

    const filter = (reaction, user) => reaction.emoji.name === '✅' && user.id === interaction.user.id;
    const collector = confirmationMessage.createReactionCollector({ filter, time: 30000 });

    collector.on('collect', async () => {
      try {
        const applicationThread = await interaction.guild.channels.fetch(row.thread_id);

        // Delete the thread
        await applicationThread.delete().catch(err => interaction.client.log('Failed to delete application thread:', 'ERROR', err));

        // Delete the application record from the database
        await queryDB(griggyDatabaseDir, `DELETE FROM applications WHERE discord_id = ? AND role = ? AND status = ?`, [row.discord_id, rank, 'active']);
        interaction.followUp({ content: `The application for **${playerName}** (${rank}) and its associated thread/message have been successfully deleted.`, flags: MessageFlags.Ephemeral });
        collector.stop();
      } catch (err) {
        interaction.client.log('Failed to delete application:', 'ERROR', err);
        await interaction.followUp({ content: 'Failed to delete the application thread.', flags: MessageFlags.Ephemeral });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason !== 'messageDelete') confirmationMessage.delete();
    });
  }
};