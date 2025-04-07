const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');
const { queryDB } = require('../../utils/databaseUtils.js');

const griggyDatabaseDir = '/home/minecraft/GriggyBot/database.db';
const cmiDatabasePath = '/home/minecraft/Main/plugins/CMI/cmi.sqlite.db';
const luckPermsDatabasePath = '/home/minecraft/Main/plugins/LuckPerms/luckperms-sqlite.db';

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
            const username = interaction.options.getString('username');
            const { data } = await axios.get(`https://api.geysermc.org/v2/utils/uuid/bedrock_or_java/${username}?prefix=.`);

            if (!data) {
                return interaction.followUp({ content: 'Invalid username, or Mojang\'s API is down.', flags: MessageFlags.Ephemeral });
            }

            const trimmedUUID = data.id;
            let renderUrl = `https://visage.surgeplay.com/bust/256/${trimmedUUID}`;

            // Check if the user has linked their Discord account
            const row = await queryDB(griggyDatabaseDir, 'SELECT * FROM users WHERE minecraft_uuid = ?', [trimmedUUID], true);

            const linkedDiscordAccount = row ? row.minecraft_uuid === trimmedUUID : false;

            // Query the CMI and LuckPerms databases
            const sqls = [
                'SELECT * FROM `users` WHERE LOWER(`users`.`username`) = LOWER(?)',
                'SELECT `luckperms_players`.`primary_group` FROM `luckperms_players` WHERE LOWER(`luckperms_players`.`username`) = LOWER(?)',
            ];

            const results = await Promise.all([
                queryDB(cmiDatabasePath, sqls[0], [username], true),
                queryDB(luckPermsDatabasePath, sqls[1], [username], true)
            ]);

            const [result1, result2] = results;

            const vouchButton = new ButtonBuilder()
                .setCustomId(`vouchButton-${row?.discord_id || username}`)
                .setLabel('Vouch')
                .setStyle('Success');

            const actionRow = new ActionRowBuilder()
                .addComponents(vouchButton);

            const unlinkedVouchButton = new ButtonBuilder()
                .setCustomId('unlinkedVouchButton')
                .setLabel('Cannot Vouch')
                .setStyle('Secondary')
                .setDisabled(true);

            const unlinkedActionRow = new ActionRowBuilder()
                .addComponents(unlinkedVouchButton);

            const primary_group = result2 ? result2.primary_group.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown';
            const balance = result1 ? result1.Balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Unknown';
            const formattedBalance = `$${balance}`;
            const totalPlayTime = result1 ? result1.TotalPlayTime : 0; // Total playtime in milliseconds
            const hours = Math.floor(totalPlayTime / (1000 * 60 * 60)); // Convert milliseconds to hours
            const minutes = Math.floor((totalPlayTime % (1000 * 60 * 60)) / (1000 * 60)); // Remaining minutes

            let formattedDuration = '';
            if (hours > 0) {
                formattedDuration += `${hours} hours `;
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