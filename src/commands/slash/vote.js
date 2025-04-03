const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('vote')
		.setDescription('List of Voting Sites'),
	async run(interaction) {
		// Create an array of vote site names and URLs from config
		const voteSites = Object.entries(config.voteSites);

		// Format array for Discord embed
		const map = voteSites.map(([siteName, siteURL], index) => {
			return `${index + 1}. [${siteName}](${siteURL})`;
		}).join('\n');

		const embed = {
			title: 'The Legend Continues | Vote',
			color: parseInt(config.defaultColor, 16),
			description: map,
			footer: { text: 'Run `/vote shop` in-game' },
			timestamp: new Date(),
			thumbnail: { url: `${config.logoImageUrl}` },
		};

		await interaction.reply({ embeds: [embed] });
	},
};
