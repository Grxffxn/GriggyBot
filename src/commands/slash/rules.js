const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getConfig } = require('../../utils/configUtils.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rules')
        .setDescription('View the server rules'),
    
    async run(interaction) {
        const config = getConfig();
        const rules = config.rules || [];
        if (rules.length === 0) return interaction.reply({ content: 'No rules have been set up for this server.', flags: MessageFlags.Ephemeral });

        const rulesEmbed = {
            color: parseInt(config.defaultColor, 16),
            title: `${config.serverAcronym || config.serverName} Rules`,
            description: rules
                .map((ruleObj, index) => {
                    const ruleDescription = ruleObj.description ? ruleObj.description : '';
                    return `**${index + 1}. ${ruleObj.rule}**↪ ${ruleDescription}`;
                })
                .join('\n'),
        };

        await interaction.reply({ embeds: [rulesEmbed], flags: MessageFlags.Ephemeral });
    }
};