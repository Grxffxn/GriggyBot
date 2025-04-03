const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const moment = require('moment');

// Define griggyDB connection and query
const griggyDatabaseDir = '/home/minecraft/GriggyBot/database.db';
const idquery = 'SELECT * FROM users WHERE minecraft_uuid = ?';

const databaseDirs = [
	'/home/minecraft/Main/plugins/CMI/',
	'/home/minecraft/Main/plugins/LuckPerms/',
	'/home/minecraft/Main/plugins/CMI/'
];

module.exports = {
	data: new SlashCommandBuilder()
		.setName('info')
		.setDescription('View Minecraft Player Information')
		.addStringOption(option =>
			option.setName('username')
				.setDescription('Minecraft Username')
				.setRequired(true)),

	async run(interaction) {
		try {
			await interaction.deferReply();
			const griggydb = new sqlite3.Database(griggyDatabaseDir, sqlite3.OPEN_READWRITE);
			const username = interaction.options.getString('username');
			//const { data } = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`);
			const { data } = await axios.get(`https://api.geysermc.org/v2/utils/uuid/bedrock_or_java/${username}?prefix=.`)

			if (!data) {
				return interaction.followUp({ content: 'Invalid username, or Mojang\'s API is down.', flags: MessageFlags.Ephemeral });
			}

			const trimmedUUID = data.id;
			console.log(trimmedUUID);
			let renderUrl = `https://visage.surgeplay.com/bust/256/${trimmedUUID}`;

			// Check if the user has linked their Discord account
			const row = await new Promise((resolve, reject) => {
				griggydb.get(idquery, trimmedUUID, (err, row) => {
					if (err) {
						console.error(err.message);
						reject(err);
					} else {
						resolve(row);
					}
				});
			});

			const linkedDiscordAccount = row ? row.minecraft_uuid === trimmedUUID : false;

			const databases = await Promise.all(databaseDirs.map(async (databaseDir) => {
				const files = await fs.readdir(databaseDir);
				const databaseFile = files.find(file => path.extname(file) === '.db');
				if (!databaseFile) {
					throw new Error('Error: No database file found in directory.');
				}
				const databasePath = path.join(databaseDir, databaseFile);
				const database = new sqlite3.Database(databasePath);
				return database;
			}));

			const sqls = [
				'SELECT * FROM `users` WHERE LOWER(`users`.`username`) = LOWER(?)',
				'SELECT `luckperms_players`.`primary_group` FROM `luckperms_players` WHERE LOWER(`luckperms_players`.`username`) = LOWER(?)',
			];

			const results = await Promise.all(sqls.map(async (sql, index) => {
				const database = databases[index];
				const result = await new Promise((resolve, reject) => {
					database.get(sql, username, (err, result) => {
						if (err) {
							reject(err);
						} else {
							resolve(result);
						}
					});
				});
				database.close();
				return result;
			}));

			const [result1, result2] = results;

			const vouchButton = new ButtonBuilder()
				.setCustomId(`vouchButton-${row?.discord_id || username}`)
				.setLabel('Vouch')
				.setStyle('Success');

			const reportButton = new ButtonBuilder()
				.setCustomId(`reportButton-${username}`)
				.setLabel('Report')
				.setStyle('Danger');

			const actionRow = new ActionRowBuilder()
				.addComponents(vouchButton, reportButton);

			const unlinkedVouchButton = new ButtonBuilder()
				.setCustomId('unlinkedVouchButton')
				.setLabel('Cannot Vouch')
				.setStyle('Secondary')
				.setDisabled(true);

			const unlinkedActionRow = new ActionRowBuilder()
				.addComponents(unlinkedVouchButton, reportButton);

			const primary_group = result2 ? result2.primary_group.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown';
			const balance = result1 ? result1.Balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Unknown';
			const formattedBalance = `$${balance}`;
			const hours = result1 ? moment.duration(result1.TotalPlayTime).asHours() : 0;
			const finalHours = Math.floor(hours);
			const minutes = result1 ? moment.duration(result1.TotalPlayTime).minutes() : 0;
			let formattedDuration = '';
			if (hours > 0) {
				formattedDuration += `${finalHours} hours `;
			}
			formattedDuration += `${minutes} minutes`;
			const finalPlayTime = formattedDuration ? formattedDuration : 'Unknown';

			const finalColor = row?.profile_color || '391991';
			const finalDescription = `${row?.profile_description ? `**Username:** ${username}\n**Current Rank:** ${primary_group}\n**Total Playtime:** ${finalPlayTime}\n**Current Balance:** ${formattedBalance}\n\n${row.profile_description}\n` : `**Username:** ${username}\n**Current Rank:** ${primary_group}\n**Total Playtime:** ${finalPlayTime}\n**Current Balance:** ${formattedBalance}`}`;
			const finalUrl = row?.profile_image || renderUrl;
			const finalAccountStatus = linkedDiscordAccount ? `<@${row.discord_id}>` : 'Not Linked';
			const finalTitle = row?.profile_title || `${username}'s Profile`;
			const finalFavoriteGame = row?.favorite_game || 'Minecraft';
			const finalVouches = parseFloat(row?.vouches || '0');
			const userMetaValue = (result1?.UserMeta || '').split('%%')[1];
			const points = parseFloat(userMetaValue || '0');
			const finalRankPoints = points - finalVouches;
			const totalPoints = finalRankPoints + finalVouches;
			
			const embed = new EmbedBuilder()
				.setTitle(finalTitle)
				.setDescription(finalDescription)
				.setColor(finalColor)
				.setThumbnail(finalUrl)
				.setFields(
					{ name: 'Vouches', value: finalVouches.toString(), inline: true },
					{ name: 'Rank Points', value: finalRankPoints.toString(), inline: true },
					{ name: 'Total Points', value: totalPoints.toString(), inline: true },
					{ name: 'Discord Account', value: finalAccountStatus, inline: true },
					{ name: 'Favorite Game', value: finalFavoriteGame }
				);

			if (linkedDiscordAccount) {
				interaction.followUp({ embeds: [embed], components: [actionRow] });
			} else {
				interaction.followUp({ embeds: [embed], components: [unlinkedActionRow] });
			}

		} catch (err) {
			console.error(err);
			interaction.followUp({ content: 'Command failed </3 Try again or ping Griggy\nPlayer data could be formatted improperly.', flags: MessageFlags.Ephemeral });
		}
	}
};