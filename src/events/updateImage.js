const { getConfig } = require('../utils/configUtils');
const { parseServerData } = require('../utils/serverDataUtils.js');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const nodeHtmlToImage = require('node-html-to-image');
const path = require('path');
const fs = require('fs');
const base64Image = fs.readFileSync('assets/16-9-logo.png').toString('base64');
const base64DataUrl = `data:image/png;base64,${base64Image}`;

const fontPath = path.resolve(__dirname, '../../assets/fonts/Minecraft.ttf');

async function UpdateImage(client) {
    const config = getConfig();
    const guild = await client.guilds.fetch(config.guildId);
    const imageChannel = await guild.channels.fetch(config.welcomeChannelId);
    if (!imageChannel) {
        client.log('Image channel not found. Please check your configuration.', 'ERROR');
        return;
    }
    const messageToEdit = await imageChannel.messages.fetch(config.welcomeMessageId);
    if (!messageToEdit) {
        client.log('Message to edit not found. Please check your configuration, or set welcomeMessageId to an empty string in config and restart.', 'ERROR');
        return;
    }

    async function generateImage(sanitizedNumberOnline, sanitizedServerVersion, tps, formattedSchedule) {
        try {
            const fontData = fs.readFileSync(fontPath).toString('base64');
            const fontBase64 = `data:font/ttf;base64,${fontData}`;
            const htmlTemplatePath = path.resolve(__dirname, '../welcomeImage.html');
            let htmlTemplate = fs.readFileSync(htmlTemplatePath, 'utf8');

            htmlTemplate = htmlTemplate
                .replace('{{fontBase64}}', fontBase64)
                .replace('{{backgroundImage}}', base64DataUrl)
                .replace('{{numberOnline}}', sanitizedNumberOnline)
                .replace('{{serverVersion}}', sanitizedServerVersion)
                .replace('{{tps}}', tps)
                .replace('{{tpsColor}}', tps >= 17 ? 'green' : tps >= 13 ? 'yellow' : 'red')
                .replace('{{formattedSchedule}}', formattedSchedule)
                .replace('{{serverIp}}', config.serverIp);

            await nodeHtmlToImage({
                output: 'assets/dynamicserverinfo.png',
                html: htmlTemplate,
                transparent: true,
            });
        } catch (err) {
            client.log('Error processing welcome image:', 'ERROR', err);
        }
    }

    try {
        const serverData = parseServerData();
        const sanitizedNumberOnline = serverData.numberOnline;
        const sanitizedServerVersion = serverData.serverVersion;
        const tps = serverData.tps;
        const formattedSchedule = serverData.restartSchedule;

        await generateImage(sanitizedNumberOnline, sanitizedServerVersion, tps, formattedSchedule); // Generate the image

        const attachment = new AttachmentBuilder('assets/dynamicserverinfo.png', { name: 'dynamicserverinfo.png' });

        // default rules embed
        const rulesEmbed = new EmbedBuilder();
        if (config.useRulesInWelcomeMessage && config.rules && Array.isArray(config.rules)) {
            rulesEmbed.setTitle(`📖 ${config.serverAcronym || config.serverName} Rules`);
            rulesEmbed.setColor(0xef5327);

            config.rules.forEach((ruleObj, index) => {
                rulesEmbed.addFields({
                    name: `**${index + 1}. ${ruleObj.rule}**`,
                    value: ruleObj.description || '-+-+-+-+--+-+-+-+',
                });
            });
            if (config.rulesFooter) {
                rulesEmbed.setFooter({ text: config.rulesFooter });
            }
        }

        const dynamicEmbed = new EmbedBuilder()
            .setTitle(`${config.welcomeServerInfoTitle || 'Server Info'}`)
            .setColor(config.defaultColor)
            .setImage('attachment://dynamicserverinfo.png');

        if (config.welcomeServerInfoFields) {
            config.welcomeServerInfoFields.forEach((field) => {
                dynamicEmbed.addFields({
                    name: field.name,
                    value: field.value,
                    inline: true,
                });
            });
        }

        if (config.useRulesInWelcomeMessage) {
            await messageToEdit.edit({ content: config.welcomeIntro + `${config.staffEmojisList ? `\n-# ${config.staffEmojisList}` : ''}`, embeds: [rulesEmbed, dynamicEmbed], files: [attachment] });
        } else {
            await messageToEdit.edit({ content: config.welcomeIntro + `${config.staffEmojisList ? `\n-# ${config.staffEmojisList}` : ''}`, embeds: [dynamicEmbed], files: [attachment] });
        }
    } catch (err) {
        client.log('Error updating welcome image or message:', 'ERROR', err);
    }
}

module.exports = UpdateImage;