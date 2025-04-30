const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getConfig, saveConfig, reloadConfig } = require('../../utils/configUtils.js');
const { checkStaff } = require('../../utils/roleCheckUtils.js');

module.exports = {
    data: (() => {
        const config = getConfig();
        const simpleKeys = Object.keys(config).filter(key => {
            const value = config[key];
            return typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number';
        });

        const command = new SlashCommandBuilder()
            .setName('editconfig')
            .setDescription('Edit the config file')
            .addStringOption(option => {
                option.setName('key')
                    .setDescription('Key to edit')
                    .setRequired(true);

                simpleKeys.forEach(key => {
                    option.addChoices({ name: key, value: key });
                });

                return option;
            })
            .addStringOption(option =>
                option.setName('value')
                    .setDescription('New value for the key')
                    .setRequired(true)
            );

        return command;
    })(),

    async run(interaction) {
        const isStaff = checkStaff(interaction.member);
        if (!isStaff) {
            return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply();
        const key = interaction.options.getString('key');
        const value = interaction.options.getString('value');

        if (!key || !value) {
            return interaction.editReply({ content: 'Please provide both a key and a value.', flags: MessageFlags.Ephemeral });
        }

        try {
            const config = getConfig();

            if (!(key in config)) {
                return interaction.editReply({ content: `Invalid key: ${key}`, flags: MessageFlags.Ephemeral });
            }

            config[key] = parseValue(value, config[key]);
            saveConfig(config, interaction.client);
            reloadConfig(interaction.client);

            await interaction.editReply({ content: `Config updated: ${key} = ${value}`, flags: MessageFlags.Ephemeral });
        } catch (err) {
            await interaction.editReply({ content: 'Failed to update config.', flags: MessageFlags.Ephemeral });
            interaction.client.log('Failed to update config:', 'ERROR', err);
        }
    }
};

function parseValue(value, currentValue) {
    if (typeof currentValue === 'boolean') {
        return value.toLowerCase() === 'true';
    } else if (typeof currentValue === 'number') {
        return parseFloat(value);
    }
    return value;
}