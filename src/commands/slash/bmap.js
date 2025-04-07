const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const config = require('../../config.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bmap')
		.setDescription('TLC BlueMap'),
	async run(interaction) {
		const bluemapEmbed = {
			title: 'The Legend Continues | BlueMap',
			color: parseInt(config.defaultColor, 16),
			url: config.bluemapUrl,
			description: 'View a live map of all of our worlds,\nnow in 3D!',
			thumbnail: {
				url: `${config.logoImageUrl}`,
			},
		};

		await interaction.reply({ embeds: [bluemapEmbed], flags: MessageFlags.Ephemeral })
			.catch(console.error);
	},
};