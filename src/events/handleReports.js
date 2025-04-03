const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const databaseDir = '/home/minecraft/GriggyBot/database.db';
const axios = require('axios');
async function handleReports(interaction) {
	const userWhoWasReportedId = interaction.customId.split('-')[1];
	const userWhoWasReportedType = isNaN(userWhoWasReportedId) ? 'minecraft' : 'discord';
	const userWhoWasReportedUsername = userWhoWasReportedType === 'minecraft' ? userWhoWasReportedId : undefined;
	let userWhoWasReportedDiscordId = userWhoWasReportedType === 'minecraft' ? undefined : userWhoWasReportedId;
	const { data } = userWhoWasReportedType === 'minecraft' ? await axios.get(`https://api.mojang.com/users/profiles/minecraft/${userWhoWasReportedUsername}`) : undefined;
	const userWhoWasReportedUUID = userWhoWasReportedType === 'minecraft' ? data.id : undefined;
	if (userWhoWasReportedType === 'minecraft') {
		const griggydb = new sqlite3.Database(databaseDir, sqlite3.OPEN_READWRITE);
		const query = 'SELECT * FROM users WHERE minecraft_uuid = ?';
		const params = [userWhoWasReportedUUID];
		const result = await new Promise((resolve, reject) => {
			griggydb.get(query, params, (err, row) => {
				if (err) {
					console.error(err.message);
					reject(err);
				} else {
					resolve(row);
				}
			});
		});
		griggydb.close();
		userWhoWasReportedDiscordId = result ? result.discord_id : undefined;
	}
	const userWhoReported = interaction.user;
	const userWhoReportedId = userWhoReported.id;
	const reasonTextInput = new TextInputBuilder()
		.setPlaceholder('Reason')
		.setLabel('Reason for report')
		.setStyle(TextInputStyle.Paragraph)
		.setCustomId(`report-reason-${userWhoReportedId}`)
		.setRequired(true);
	const reportActionRow = new ActionRowBuilder()
		.addComponents(reasonTextInput);
	const reportModal = new ModalBuilder()
		.setCustomId(`report-reason-${userWhoReportedId}`)
		.setTitle(`Report ${userWhoWasReportedUsername}`)
		.setComponents(reportActionRow);
	await interaction.showModal(reportModal);
	const reasonModalInteraction = await interaction.awaitModalSubmit({ customId: `report-reason-${userWhoReportedId}`, time: 60000 });
	reasonModalInteraction.deferUpdate();
	const reason = reasonModalInteraction.fields.getTextInputValue(`report-reason-${userWhoReportedId}`);
	const griggydb = new sqlite3.Database(databaseDir, sqlite3.OPEN_READWRITE);
	const query = 'SELECT * FROM users WHERE minecraft_uuid = ? OR discord_id = ?';
	const params = [userWhoWasReportedUUID, userWhoWasReportedDiscordId];
	const result = await new Promise((resolve, reject) => {
		griggydb.get(query, params, (err, row) => {
			if (err) {
				console.error(err.message);
				reject(err);
			} else {
				resolve(row);
			}
		});
	});
	const reportEmbed = new EmbedBuilder()
		.setTitle(`Report for ${userWhoWasReportedUsername}`)
		.setDescription(`Reason: ${reason}`)
		.setColor('#FF5733')
		.setThumbnail(`https://visage.surgeplay.com/bust/256/${userWhoWasReportedUsername}`)
		.setAuthor({ name: userWhoReported.username, iconURL: userWhoReported.avatarURL() })
		.setFields({
			name: 'GriggyDB Entries',
			value: `\`\`\`json\n${JSON.stringify(result, null, 2)}\`\`\``,
		});
	const moderationChannel = interaction.guild.channels.cache.get('698701443602841730')
	if (!moderationChannel) {
		return interaction.reply({ content: 'Error: Moderation channel not found.', flags: MessageFlags.Ephemeral });
	}
	await moderationChannel.send({ embeds: [reportEmbed] });
	const reportSentEmbed = new EmbedBuilder()
		.setTitle('Report Sent')
		.setDescription('Your report was sent to the moderation channel.')
		.setColor('#FF5733');
	await interaction.followUp({ embeds: [reportSentEmbed], flags: MessageFlags.Ephemeral });
	griggydb.close();
}

module.exports = handleReports;