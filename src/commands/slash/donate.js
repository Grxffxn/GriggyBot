const { SlashCommandBuilder } = require('discord.js');
const { getConfig } = require('../../utils/configUtils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('donate')
		.setDescription('Donation info'),
	async run(interaction) {
		const config = getConfig();
		const embedDescription = Object.entries(config.donateLinks)
			.map(([site, url]) => `- [${site}](${url})`)
			.join('\n');

		await interaction.reply({
			embeds: [{
				color: parseInt(config.defaultColor, 16),
				title: `${config.serverName} | Donate`,
				description: embedDescription || 'No donation links set.',
				footer: { text: `Thank you for your interest in supporting ${config.serverAcronym || config.serverName}` },
				thumbnail: { url: `${config.logoImageUrl}` },
			}],
		});
	},
};