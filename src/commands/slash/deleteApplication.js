const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { queryDB } = require('../../utils/databaseUtils');
const { checkStaff } = require('../../utils/roleCheckUtils');
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

        const row = await queryDB(databaseDir, `SELECT * FROM applications WHERE role = ? AND player_name = ? AND status = 'active'`, [rank, playerName], true);

        if (!row) {
            await interaction.reply({ content: 'No active application found for the specified rank and player.', flags: MessageFlags.Ephemeral });
            return;
        }

        const isStaff = checkStaff(interaction.user);
        if (interaction.user.id !== row.discord_id && !isStaff) {
            await interaction.reply({ content: 'You are not authorized to delete this application.', flags: MessageFlags.Ephemeral });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('Delete Application Confirmation')
            .setDescription(`Rank: **${rank}**\nPlayer: **${playerName}**\nStatus: **${row.status}**`)
            .setColor(0xFF0000);

        const confirmationMessage = await interaction.reply({ embeds: [embed], fetchReply: true });

        confirmationMessage.react('✅').catch(err => interaction.client.log('Failed to react:', 'ERROR', err));

        const filter = (reaction, user) => reaction.emoji.name === '✅' && user.id === interaction.user.id;
        const collector = confirmationMessage.createReactionCollector({ filter, time: 30000 });

        collector.on('collect', async () => {
            try {
                const applicationThread = await interaction.guild.channels.fetch(row.thread_id);

                // Delete the thread
                await applicationThread.delete().catch(err => interaction.client.log('Failed to delete application thread:', 'ERROR', err));

                // Delete the application record from the database
                await queryDB(databaseDir, `DELETE FROM applications WHERE discord_id = ? AND role = ? AND status = ?`, [row.discord_id, rank, 'active']);
                interaction.followUp({ content: `The application for **${playerName}** (${rank}) and its associated thread/message have been successfully deleted.`, flags: MessageFlags.Ephemeral });
                collector.stop();
            } catch (err) {
                interaction.client.log('Failed to delete application:', 'ERROR', err);
                await interaction.followUp({ content: 'Failed to delete the application thread.', flags: MessageFlags.Ephemeral });
            }
        });

        collector.on('end', (_, reason) => {
            if (reason !== 'messageDelete') {
                confirmationMessage.reactions.removeAll().catch(err => interaction.client.log('Failed to remove reactions:', 'ERROR', err));
            }
        });
    }
};