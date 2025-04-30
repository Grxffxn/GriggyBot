const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { reloadConfig } = require('../../utils/configUtils');
const { checkStaff } = require('../../utils/roleCheckUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reload the config file'),
    
    async run(interaction) {
        const isStaff = checkStaff(interaction.user);
        if (!isStaff) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }
        await interaction.deferReply();
        await interaction.editReply({ content: 'Reloading config file...', flags: MessageFlags.Ephemeral });

        try {
            reloadConfig();
            await interaction.editReply({ content: 'Config file reloaded.', flags: MessageFlags.Ephemeral });
        } catch (err) {
            interaction.client.log('Failed to reload config file:', 'ERROR', err);
            await interaction.editReply({ content: 'Failed to reload config file.', flags: MessageFlags.Ephemeral });
        }
    }
};