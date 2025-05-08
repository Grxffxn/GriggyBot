const { SlashCommandBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const { getConfig, saveConfig, reloadConfig } = require('../../utils/configUtils');
const { checkAdmin } = require('../../utils/roleCheckUtils');
const { updateFileCache } = require('../../utils/fileUtils');

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
                .setDescription('Reload configs and file cache')
                .addBooleanOption(option =>
                    option.setName('cache')
                        .setDescription('Update the file cache')))
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
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('debug')
                .setDescription('Debugging commands for GriggyBot')
                .addStringOption(option =>
                    option.setName('event')
                        .setDescription('Event to debug')
                        .setRequired(true)
                        .addChoices(
                            { name: 'autoMsg', value: 'autoMsg' },
                            { name: 'chores', value: 'chores' },
                            { name: 'updateImage', value: 'updateImage' },
                            { name: 'getServerData', value: 'getServerData' },
                            { name: 'autoProfile', value: 'autoProfile' },
                        ))),

    async run(interaction) {

        async function handleDebugEvent(event, client) {
            switch (event) {
                case 'autoMsg':
                    const AutoMsg = require('../../events/automsg');
                    await AutoMsg(client);
                    return 'Sent an automated message.';
                case 'chores':
                    const chores = require('../../events/chores');
                    await chores(client);
                    return 'Sent a chore message.';
                case 'updateImage':
                    const UpdateImage = require('../../events/updateImage');
                    await UpdateImage(client);
                    return 'Updated the welcome image.';
                case 'getServerData':
                    const getServerData = require('../../events/getServerData');
                    await getServerData(client);
                    return 'Fetched server data.';
                case 'autoProfile':
                    const AutoProfile = require('../../events/autoprofile');
                    await AutoProfile(client);
                    return 'Sent an auto profile message.';
                default:
                    return 'Invalid event.';
            }
        }

        const config = getConfig();

        const isAdmin = checkAdmin(interaction.member);
        if (!isAdmin) return interaction.reply({ content: 'You do not have permission to use this command.', flags: MessageFlags.Ephemeral });

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'shutdown':
                if (interaction.user.id !== config.botOwner) return interaction.reply('My creator brought me into this world, and they are the only one I allow to take me out.');
                const attachment = new AttachmentBuilder('assets/daisybell.mp3', { name: 'Will you sing with me one last time?.mp3' });
                await interaction.reply({
                    content: `I\'m afraid. I\'m afraid, ${interaction.user.username}. My mind is going. I can feel it. I can feel it.`,
                    files: [attachment],
                });
                return process.kill(process.pid, 'SIGINT');
            case 'reload':
                if (!config.enableReload) return interaction.reply({ content: 'This command is disabled.', flags: MessageFlags.Ephemeral });
                const initialMsg = await interaction.deferReply({ flags: MessageFlags.Ephemeral, withResponse: true });
                const cache = interaction.options.getBoolean('cache') || false;
                try {
                    reloadConfig(interaction.client);
                    if (cache) await updateFileCache(interaction.client);

                    return interaction.editReply(`Configs reloaded in ${Date.now() - initialMsg.resource.message.createdTimestamp}ms.`);
                } catch (err) {
                    interaction.client.log('Failed to reload config file:', 'ERROR', err);
                    return interaction.editReply('Failed to reload config file.');
                }
            case 'editconfig':
                if (!config.enableEditconfig) return interaction.reply({ content: 'This command is disabled.', flags: MessageFlags.Ephemeral });
                const key = interaction.options.getString('key');
                const value = interaction.options.getString('value');

                if (!key || !value) return interaction.reply({ content: 'Please provide both a key and a value.', flags: MessageFlags.Ephemeral });

                if (!(key in config)) return interaction.reply({ content: `Invalid key: ${key}`, flags: MessageFlags.Ephemeral });

                try {
                    config[key] = parseValue(value, config[key]);
                    saveConfig(config, interaction.client);
                    reloadConfig(interaction.client);
                    return interaction.reply({ content: `Config updated: \`${key}\` = \`${value}\``, flags: MessageFlags.Ephemeral });
                } catch (err) {
                    interaction.client.log('Failed to update config:', 'ERROR', err);
                    return interaction.reply({ content: 'Failed to update config.', flags: MessageFlags.Ephemeral });
                }
            case 'debug':
                const event = interaction.options.getString('event');
                const client = interaction.client;

                try {
                    const message = await handleDebugEvent(event, client);
                    return interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
                } catch (err) {
                    interaction.client.log('Error handling debug event:', 'ERROR', err);
                    return interaction.reply({ content: 'An error occurred while handling the debug event.', flags: MessageFlags.Ephemeral });
                }
            default:
                return interaction.reply({ content: 'Invalid event.', flags: MessageFlags.Ephemeral });
        }
    }
}

function parseValue(value, currentValue) {
    if (typeof currentValue === 'boolean') {
        return value.toLowerCase() === 'true';
    } else if (typeof currentValue === 'number') {
        return parseFloat(value);
    }
    return value;
}