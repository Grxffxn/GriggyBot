const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getConfig } = require('../../utils/configUtils');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('List all of my commands'),

    async run(interaction) {
        const config = getConfig();
        const slashCommands = await interaction.client.application.commands.fetch();
        const prefixCommandsPath = path.join(__dirname, '../prefix');
        const prefixCommands = [];

        fs.readdirSync(prefixCommandsPath).forEach(file => {
            if (file.endsWith('.js')) {
                const command = require(path.join(prefixCommandsPath, file));
                if (command.name && command.description) {
                    prefixCommands.push(command);
                }
            }
        });

        const enabledPrefixCommands = prefixCommands.filter(cmd => {
            const featureName = `enable${cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1)}`;
            return config[featureName] !== false;
        });

		// Alphabetize commands
        const sortedSlashCommands = [...slashCommands.values()]
            .sort((a, b) => a.name.localeCompare(b.name));

        const sortedPrefixCommands = enabledPrefixCommands.sort((a, b) => a.name.localeCompare(b.name));

        // Create the help embed
        const helpEmbed = new EmbedBuilder()
            .setTitle(`${config.serverName} | Help`)
            .setColor(parseInt(config.defaultColor, 16))
            .setDescription('**Available Commands**')
            .setThumbnail(config.logoImageUrl)
            .setFooter({ text: 'Bot created by Griggy' });

        // Add slash commands to the embed
        if (sortedSlashCommands.length > 0) {
            helpEmbed.addFields({
                name: 'Slash Commands',
                value: sortedSlashCommands
                    .map(cmd => `\`/${cmd.name}\` - ${cmd.description}`)
                    .join('\n'),
            });
        }

        // Add prefix commands to the embed
        if (sortedPrefixCommands.length > 0) {
            helpEmbed.addFields({
                name: 'Prefix Commands',
                value: sortedPrefixCommands
                    .map(cmd => `\`${config.prefix}${cmd.name}\` - ${cmd.description}`)
                    .join('\n'),
            });
        }

        await interaction.reply({ embeds: [helpEmbed] });
    },
};