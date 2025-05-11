const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('map')
    .setDescription('Live server map'),
  async run(interaction) {
    const config = interaction.client.config;
    const mapEmbed = {
      title: `${config.serverName} | Map`,
      color: parseInt(config.defaultColor, 16),
      url: `${config.mapUrl || 'https://www.minecraft.net/'}`,
      description: 'View a live map of our server!',
      thumbnail: {
        url: `${config.logoImageUrl}`,
      },
    };

    await interaction.reply({ embeds: [mapEmbed], flags: MessageFlags.Ephemeral })
      .catch(err => interaction.client.log('Error within the /map command:', 'ERROR', err));
  },
};