const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { queryDB } = require('../../utils/databaseUtils.js');
const { getConfig } = require('../../utils/configUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the rank score leaderboard')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The type of leaderboard to view')
                .addChoices(
                    { name: 'Playtime', value: 'playtime' },
                    { name: 'Money', value: 'money' },
                    { name: 'Streak', value: 'streak' }
                )
                .setRequired(false)),
    async run(interaction) {
        const config = getConfig();
        const leaderboardType = interaction.options.getString('type') || 'playtime';
        const cmiDatabasePath = config.cmi_sqlite_db;
        const griggyDatabasePath = config.griggyDbPath;
        let leaderboardDescription;

        if (leaderboardType === 'playtime') {
            const leaderboardQuery = `
                SELECT username, TotalPlayTime 
                FROM users 
                ORDER BY TotalPlayTime DESC 
                LIMIT 10
            `;
            try {
                const rows = await queryDB(cmiDatabasePath, leaderboardQuery);
                if (!rows || rows.length === 0) {
                    return interaction.reply('No data found in the leaderboard.');
                }
                leaderboardDescription = rows
                    .map(
                        (row, index) =>
                            `${index + 1}. ${row.username} - ${(row.TotalPlayTime / 3600000).toFixed(2)} hours`
                    )
                    .join('\n');
            } catch (err) {
                interaction.client.log(`An error occurred while querying the ${leaderboardType} leaderboard:`, 'ERROR', err);
                return interaction.reply(`An error occurred while querying the ${leaderboardType} leaderboard.`);
            }
        }

        if (leaderboardType === 'money') {
            const leaderboardQuery = `
                SELECT username, Balance 
                FROM users 
                WHERE username NOT LIKE 'town-%'
                ORDER BY Balance DESC 
                LIMIT 10
            `;
            try {
                const rows = await queryDB(cmiDatabasePath, leaderboardQuery);
                if (!rows || rows.length === 0) {
                    return interaction.reply('No data found in the leaderboard.');
                }
                leaderboardDescription = rows
                    .map(
                        (row, index) =>
                            `${index + 1}. ${row.username} - $${row.Balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    )
                    .join('\n');
            } catch (err) {
                interaction.client.log(`An error occurred while querying the ${leaderboardType} leaderboard:`, 'ERROR', err);
                return interaction.reply(`An error occurred while querying the ${leaderboardType} leaderboard.`);
            }
        }

        if (leaderboardType === 'streak') {
            const leaderboardQuery = `
                SELECT user_id, streak
                FROM daily_streaks
                ORDER BY streak DESC
                LIMIT 10
            `;
            try {
                const rows = await queryDB(griggyDatabasePath, leaderboardQuery);
                if (!rows || rows.length === 0) {
                    return interaction.reply('No data found in the leaderboard.');
                }
                leaderboardDescription = rows
                    .map(
                        (row, index) =>
                            `${index + 1}. <@${row.user_id}> - ${row.streak} days`
                    )
                    .join('\n');
            } catch (err) {
                interaction.client.log(`An error occurred while querying the ${leaderboardType} leaderboard:`, 'ERROR', err);
                return interaction.reply(`An error occurred while querying the ${leaderboardType} leaderboard.`);
            }
        }
        // Create the embed message
        const embed = new EmbedBuilder()
            .setTitle(`${config.serverAcronym || config.serverName} | ${leaderboardType.charAt(0).toUpperCase() + leaderboardType.slice(1)} Leaderboard`)
            .setColor(`${config.defaultColor}`)
            .setDescription(leaderboardDescription)
            .setThumbnail(`${config.logoImageUrl}`);

        try {
            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            interaction.client.log('An error occurred while sending the leaderboard embed:', 'ERROR', err);
            return interaction.reply('An error occurred while sending the leaderboard embed.');
        }
    }
};