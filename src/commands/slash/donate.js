const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('donate')
		.setDescription('TLC Donation Info'),
	async run(interaction) {
		const embedDescription = `Visit [our Patreon](${config.donateLinks.Patreon}) for VIP ranks\n\nFor one-time donations, visit [our PayPal](${config.donateLinks.PayPal}).`;

		await interaction.reply({
			embeds: [{
				color: parseInt(config.defaultColor, 16),
				title: 'The Legend Continues | Donate',
				description: embedDescription,
				footer: { text: 'Thank you for your interest in supporting TLC' },
				thumbnail: { url: `${config.logoImageUrl}` },
			}],
		});
	},
};