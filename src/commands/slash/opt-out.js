const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isUserOptedOut } = require('../../utils/metricsUtils.js');
const { queryDB } = require('../../utils/databaseUtils.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('opt-out')
    .setDescription('Opt out of Griggy\'s usage metrics collection.')
    .addBooleanOption(option =>
      option.setName('opt-in')
        .setDescription('Opt in to Griggy\'s usage metrics collection.')),

  async run(interaction) {
    const client = interaction.client;
    const userId = interaction.user.id;
    const databaseDir = client.config.griggyDbPath;

    const trackingDisabled = await isUserOptedOut(client, databaseDir, userId);
    const optIn = interaction.options.getBoolean('opt-in');

    if (optIn) {
      if (!trackingDisabled) return interaction.reply({
        content: 'You are already opted in to usage metrics.',
        flags: MessageFlags.Ephemeral
      })
      const sql = 'DELETE FROM metrics_opt_out WHERE user_id = ?';
      try {
        await queryDB(databaseDir, sql, [userId]);
        return interaction.reply({
          content: 'You have successfully opted in to Griggy\'s usage metrics.',
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        client.log(`Failed to opt in user ${userId}: ${error.message}`, 'ERROR');
        return interaction.reply({
          content: 'An error occurred while processing your request. Please try again later.',
          flags: MessageFlags.Ephemeral
        });
      }
    } else {
      if (trackingDisabled) return interaction.reply({
        content: 'You are already opted out of usage metrics.',
        flags: MessageFlags.Ephemeral
      })
      const sql = 'INSERT INTO metrics_opt_out (user_id) VALUES (?)';
      try {
        await queryDB(databaseDir, sql, [userId]);
        return interaction.reply({
          content: 'You have successfully opted out of Griggy\'s usage metrics.',
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        client.log(`Failed to opt out user ${userId}: ${error.message}`, 'ERROR');
        return interaction.reply({
          content: 'An error occurred while processing your request. Please try again later.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};