const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const databaseDir = '/home/minecraft/GriggyBot/database.db';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deleteapplication')
        .setDescription('Delete an active rank application')
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('Rank')
                .setRequired(true)
                .addChoices(
                    { name: 'Fabled', value: 'fabled' },
                    { name: 'Heroic', value: 'heroic' },
                    { name: 'Mythical', value: 'mythical' },
                    { name: 'Apocryphal', value: 'apocryphal' },
                    { name: 'Legend', value: 'legend' },
                ))
        .addStringOption(option =>
            option.setName('playername')
                .setDescription('Minecraft username')
                .setRequired(true)),

    async run(interaction) {
        const rank = interaction.options.getString('rank');
        const playerName = interaction.options.getString('playername');
        const db = new sqlite3.Database(databaseDir);

        db.get(
            `SELECT * FROM applications WHERE role = ? AND player_name = ? AND status = 'active'`,
            [rank, playerName],
            async (err, row) => {
                if (err) {
                    console.error(err);
                    await interaction.reply({ content: 'An error occurred while fetching data.', ephemeral: true });
                    return;
                }

                if (!row) {
                    await interaction.reply({ content: 'No active application found for the specified rank and player.', ephemeral: true });
                    return;
                }

                const allowedRoles = ['Moderator', 'Engineer', 'Admin', 'Owner'];
                const isStaff = interaction.member.roles.cache.some(role => allowedRoles.includes(role.name));
                if (interaction.user.id !== row.discord_id && !isStaff) {
                    await interaction.reply({ content: 'You are not authorized to delete this application.', ephemeral: true });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle('Delete Application Confirmation')
                    .setDescription(`Rank: **${rank}**\nPlayer: **${playerName}**\nStatus: **${row.status}**`)
                    .setColor(0xFF0000);

                const confirmationMessage = await interaction.reply({ embeds: [embed], fetchReply: true });

                confirmationMessage.react('✅').catch(console.error);

                const filter = (reaction, user) => reaction.emoji.name === '✅' && user.id === interaction.user.id;
                const collector = confirmationMessage.createReactionCollector({ filter, time: 30000 });

                collector.on('collect', async () => {
                    try {
                        const applicationThread = await interaction.guild.channels.fetch(row.thread_id);

                        // Delete the thread
                        await applicationThread.delete().catch(console.error);

                        // Delete the application record from the database
                        db.run(
                            `DELETE FROM applications WHERE discord_id = ? AND role = ? AND status = ?`,
                            [row.discord_id, rank, 'active'],
                            (err) => {
                                if (err) {
                                    console.error(err);
                                    interaction.followUp({ content: 'An error occurred while deleting the application.', ephemeral: true });
                                    return;
                                }

                                interaction.followUp({ content: `The application for **${playerName}** (${rank}) and its associated thread/message have been successfully deleted.`, ephemeral: true });
                            }
                        );

                        collector.stop();
                    } catch (error) {
                        console.error(error);
                        await interaction.followUp({ content: 'Failed to delete the application thread.', ephemeral: true });
                    } 
                });

                collector.on('end', (_, reason) => {
                    if (reason !== 'messageDelete') {
                        confirmationMessage.reactions.removeAll().catch(console.error);
                    }

                    db.close();
                });
            }
        );
    }
};