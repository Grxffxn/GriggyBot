const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('notstaff')
		.setDescription('TLC Not Staff'),
	async run(interaction) {
		await interaction.reply({
			embeds: [{
				color: parseInt(config.defaultColor, 16),
				title: 'The Legend Continues | Not Staff',
				description: '**1.** Glitch',
				thumbnail: {
					url: 'https://static.wikia.nocookie.net/minecraft/images/c/c7/GuardianNew.png/revision/latest?cb=20190927024703',
				},
			}],
		});
	},
};