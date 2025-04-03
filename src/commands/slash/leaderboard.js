const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const databaseDir = '/home/minecraft/Main/plugins/CMI/';
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the rank score leaderboard'),
    async run(interaction) {
        // Find the database file
        fs.readdir(databaseDir, (err, files) => {
            if (err) {
                console.error(err);
                return;
            }
            const databaseFile = files.find(file => path.extname(file) === '.db');
            if (!databaseFile) {
                console.error('Error: No database file found in directory.');
                return;
            }
            const databasePath = path.join(databaseDir, databaseFile);

            // Define your database connection
            const database = new sqlite3.Database(databasePath);

            const leaderboardLink =
                'SELECT username, TotalPlayTime FROM users ORDER BY TotalPlayTime DESC LIMIT 10';

            database.all(leaderboardLink, [], (err, rows) => {
                if (err) {
                    console.error(err);
                    return interaction.reply('An error occurred while querying the database.');
                }

                if (rows.length === 0) {
                    return interaction.reply('No data found in the leaderboard.');
                }

                const leaderboardDescription = rows
                    .map(
                        (row, index) =>
                            `${index + 1}. ${row.username} - ${(row.TotalPlayTime / 3600000).toFixed(2)} hours`,
                    )
                    .join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('TLC | Leaderboard')
                    .setColor(`${config.defaultColor}`)
                    .setDescription(leaderboardDescription)
                    .setThumbnail(`${config.logoImageUrl}`);

                interaction.reply({ embeds: [embed] });
            });
        });
    },
};