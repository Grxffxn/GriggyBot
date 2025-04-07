const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { queryDB } = require('../../utils/databaseUtils.js');
const config = require('../../config.js');

const databasePath = '/home/minecraft/Main/plugins/CMI/cmi.sqlite.db';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the rank score leaderboard'),
    async run(interaction) {
        try {
            // Query the leaderboard
            const leaderboardQuery = `
                SELECT username, TotalPlayTime 
                FROM users 
                ORDER BY TotalPlayTime DESC 
                LIMIT 10
            `;
            const rows = await queryDB(databasePath, leaderboardQuery);

            if (!rows || rows.length === 0) {
                return interaction.reply('No data found in the leaderboard.');
            }

            // Format the leaderboard description
            const leaderboardDescription = rows
                .map(
                    (row, index) =>
                        `${index + 1}. ${row.username} - ${(row.TotalPlayTime / 3600000).toFixed(2)} hours`
                )
                .join('\n');

            const embed = new EmbedBuilder()
                .setTitle('TLC | Leaderboard')
                .setColor(`${config.defaultColor}`)
                .setDescription(leaderboardDescription)
                .setThumbnail(`${config.logoImageUrl}`);

            interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            interaction.reply('An error occurred while querying the leaderboard.');
        }
    },
};