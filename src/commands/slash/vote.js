const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vote')
    .setDescription('List of voting sites'),
  async run(interaction) {
    const config = interaction.client.config;
    const voteSites = Object.entries(config.voteSites);

    const map = voteSites.map(([siteName, siteURL], index) => {
      return `${index + 1}. [${siteName}](${siteURL})`;
    }).join('\n');

    const embed = {
      title: `${config.serverName} | Vote`,
      color: parseInt(config.defaultColor, 16),
      description: map,
      timestamp: new Date(),
      thumbnail: { url: `${config.logoImageUrl}` },
    };

    await interaction.reply({ embeds: [embed] });
  },
};