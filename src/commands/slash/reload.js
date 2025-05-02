const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { reloadConfig } = require('../../utils/configUtils');
const { checkStaff } = require('../../utils/roleCheckUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reload the config file'),
    
    async run(interaction) {
        const isStaff = checkStaff(interaction.member);
        if (!isStaff) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.editReply('Reloading config file...');

        try {
            reloadConfig();
            await interaction.editReply('Config file reloaded. Some changes may require a restart to take effect.');
        } catch (err) {
            interaction.client.log('Failed to reload config file:', 'ERROR', err);
            await interaction.editReply('Failed to reload config file.');
        }
    }
};