const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getConfig } = require('../../utils/configUtils');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('link')
		.setDescription('Information on linking MC & Discord accounts')
		.addStringOption(option =>
			option.setName('message')
				.setDescription('The message link to respond to')
				.setRequired(false)
		),
	async run(interaction) {
		const config = getConfig();
		const messageLink = interaction.options.getString('message');
		const linkingEmbed = new EmbedBuilder()
			.setTitle('**How do I link my Minecraft and Discord accounts?**')
			.setDescription(`Linking your accounts earns you your first rank, Linked, and allows you to vouch for players, create rank applications, and customize your server profile on Discord.\n\n**Step 1**\nRun the command \`/discord link\` in-game and take note of the 4-digit code\n\n**Step 2**\nDM the code to ${config.discordsrvBotId ? `<@${config.discordsrvBotId}>.` : 'the DiscordSRV linking bot.'}\n\n**This should work.** If it doesn't, you've likely DM'd an incorrect code or DM'd the wrong bot. Reach out for support if you're having issues.`)
			.setColor(config.defaultColor);
		if (messageLink) {

			// Extract guild, channel, and message IDs
			const match = messageLink.match(/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
			if (!match) {
				return interaction.reply({ content: '😞 can\'t find that message. Please check the link and try again.\n-# Maybe I\'m going blind?', flags: MessageFlags.Ephemeral });
			}

			const [, guildId, channelId, messageId] = match;

			try {
				const guild = await interaction.client.guilds.fetch(guildId);
				const channel = await guild.channels.fetch(channelId);
				const message = await channel.messages.fetch(messageId);
				const displayName = interaction.user.globalName ?? interaction.user.username;
				const avatarURL = interaction.user.displayAvatarURL({ dynamic: true, size: 512 });
				linkingEmbed.setFooter({ text: `Requested by ${displayName}`, iconURL: avatarURL });

				await message.reply({ embeds: [linkingEmbed] });
				return interaction.reply({ content: `Replied to ${messageLink} with the linking instructions.`, flags: MessageFlags.Ephemeral });
			} catch (err) {
				interaction.client.log('An error occurred within the /link command:', 'ERROR', err);
				return interaction.reply({ content: '😞 can\'t find that message. Please check the link and try again.\n-# Maybe I\'m going blind?', flags: MessageFlags.Ephemeral });
			}
		} else {
			return interaction.reply({ embeds: [linkingEmbed], flags: MessageFlags.Ephemeral });
		}
	}
};