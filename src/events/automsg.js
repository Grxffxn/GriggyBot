const { getConfig } = require('../utils/configUtils');
const { EmbedBuilder } = require('discord.js');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function createEmbed(message, config) {
    const embed = new EmbedBuilder()
        .setTitle(`${config.serverName} | AutoMsg`)
        .setColor(config.defaultColor)
        .setDescription(message.description)
        .setThumbnail(config.logoImageUrl);

    if (message.footer) {
        embed.setFooter(message.footer);
    }

    return embed;
}

async function AutoMsg(client) {
    const config = getConfig();
    const channel = client.channels.cache.get(config.automsgchannelid);

    if (!channel) {
        client.log('AutoMsg Error: Channel not found.', 'ERROR');
        return;
    }

    // Get a random message from config.autoMessages
    const randomIndex = getRandomInt(0, config.autoMessages.length);
    const selectedMessage = config.autoMessages[randomIndex];

    const embed = createEmbed(selectedMessage, config);

    try {
        await channel.send({ embeds: [embed] });
    } catch (err) {
        client.log('Error sending AutoMsg:', 'ERROR', err);
    }
}

module.exports = AutoMsg;