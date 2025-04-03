const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('vipperks')
		.setDescription('Display premium perks for Minecraft server VIP tiers.'),
	async run(interaction) {
		const vipPerks = {
			color: 0xA682FF,
			title: 'VIP:',
			description: config.vipPerksDescription,
			fields: config.vipPerksFields,
		};

		const vipPlusPerks = {
			color: 0x715AFF,
			title: 'VIP+:',
			description: config.vipPlusPerksDescription,
			fields: config.vipPlusPerksFields,
		};

		const vipPlusPlusPerks = {
			color: 0xDB2763,
			title: 'VIP++:',
			description: config.vipPlusPlusPerksDescription,
			thumbnail: {
				url: `${config.logoImageUrl}`,
			},
			fields: config.vipPlusPlusPerksFields,
		};

		// Send the embed message for each tier of VIP.
		await interaction.reply({ embeds: [vipPerks, vipPlusPerks, vipPlusPlusPerks] });
	},
};
