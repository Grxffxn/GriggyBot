const { SlashCommandBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const { getConfig, saveConfig, reloadConfig } = require('../../utils/configUtils');
const { checkAdmin } = require('../../utils/roleCheckUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Administrative commands for GriggyBot')
        .addSubcommand(subcommand =>
            subcommand
                .setName('shutdown')
                .setDescription('Shut down GriggyBot'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reload')
                .setDescription('Reload the config file'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('editconfig')
                .setDescription('Edit the config file')
                .addStringOption(option => {
                    const config = getConfig();
                    const simpleKeys = Object.keys(config).filter(key => {
                        const value = config[key];
                        return typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number';
                    });

                    const limitedKeys = simpleKeys.slice(0, 25);

                    option.setName('key')
                        .setDescription('Key to edit')
                        .setRequired(true);

                    limitedKeys.forEach(key => {
                        option.addChoices({ name: key, value: key });
                    });

                    return option;
                })
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('New value for the key')
                        .setRequired(true))),
    async run(interaction) {
        try {
            const config = getConfig();

            const isAdmin = checkAdmin(interaction.member);
            if (!isAdmin) {
                return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });
            }

            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'shutdown') {
                if (interaction.user.id !== config.botOwner) {
                    return interaction.reply('My creator brought me into this world, and they are the only one I allow to take me out.');
                }
                const attachment = new AttachmentBuilder('assets/daisybell.mp3', { name: 'Will you sing with me one last time?.mp3' });
                await interaction.reply({
                    content: `I\'m afraid. I\'m afraid, ${interaction.user.username}. My mind is going. I can feel it. I can feel it.`,
                    files: [attachment],
                });
                process.kill(process.pid, 'SIGINT');
            } else if (subcommand === 'reload') {
                if (!config.enableReload) return interaction.reply({ content: 'This command is disabled.', flags: MessageFlags.Ephemeral });
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    reloadConfig(interaction.client);
                    await interaction.editReply('Config file reloaded. Some changes may require a restart to take effect.');
                } catch (err) {
                    interaction.client.log('Failed to reload config file:', 'ERROR', err);
                    await interaction.editReply('Failed to reload config file.');
                }
            } else if (subcommand === 'editconfig') {
                if (!config.enableEditconfig) return interaction.reply({ content: 'This command is disabled.', flags: MessageFlags.Ephemeral });
                const key = interaction.options.getString('key');
                const value = interaction.options.getString('value');

                if (!key || !value) {
                    return interaction.reply({ content: 'Please provide both a key and a value.', flags: MessageFlags.Ephemeral });
                }

                if (!(key in config)) {
                    return interaction.reply({ content: `Invalid key: ${key}`, flags: MessageFlags.Ephemeral });
                }

                try {
                    config[key] = parseValue(value, config[key]);
                    saveConfig(config, interaction.client);
                    reloadConfig(interaction.client);
                    await interaction.reply({ content: `Config updated: \`${key}\` = \`${value}\``, flags: MessageFlags.Ephemeral });
                } catch (err) {
                    interaction.client.log('Failed to update config:', 'ERROR', err);
                    await interaction.reply({ content: 'Failed to update config.', flags: MessageFlags.Ephemeral });
                }
            }
        } catch (err) {
            interaction.client.log('Error in /admin command:', 'ERROR', err);
            await interaction.reply({ content: 'An error occurred while executing the command.', flags: MessageFlags.Ephemeral });
        }
    },
};

function parseValue(value, currentValue) {
    if (typeof currentValue === 'boolean') {
        return value.toLowerCase() === 'true';
    } else if (typeof currentValue === 'number') {
        return parseFloat(value);
    }
    return value;
}