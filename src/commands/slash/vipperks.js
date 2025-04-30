const { SlashCommandBuilder } = require('discord.js');
const { getConfig } = require('../../utils/configUtils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('vipperks')
		.setDescription('Display perks for VIP tiers'),
	async run(interaction) {
		// Function to generate increasingly brighter colors, for aesthetics :D
		function brightenColor(hex, factor) {
			const num = parseInt(hex.replace('#', ''), 16);
			const r = Math.min(255, Math.floor((num >> 16) * factor));
			const g = Math.min(255, Math.floor(((num >> 8) & 0x00ff) * factor));
            const b = Math.min(255, Math.floor((num & 0x0000ff) * factor));
			return (r << 16) + (g << 8) + b;
		}

		const config = getConfig();

		// Create multiple embeds based on how many are listed in config.vipTiers
		const embeds = config.vipTiers.map((tier, index) => {
			let description = '';
			if (tier.discordPerks) {
				description += `## Discord\n${tier.discordPerks}\n`;
			}
			if (tier.minecraftPerks) {
				description += `## Minecraft\n${tier.minecraftPerks}`;
			}

			const embedColor = tier.color && tier.color.trim()
				? parseInt(tier.color.replace('#', ''), 16)
				: brightenColor(config.defaultColor, 1 + index * 0.1);

			return {
				color: embedColor,
				title: `${tier.name}`,
				description: description || 'No perks listed',
			}
		});

		// Add server logo to the last embed
		embeds[embeds.length - 1].thumbnail = { url: config.logoImageUrl };

		await interaction.reply({ embeds });
	},
};