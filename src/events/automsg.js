const config = require('../config.js');
const { EmbedBuilder } = require('discord.js');

// Function to generate a random integer between min (inclusive) and max (exclusive)
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

// Function to create an embed dynamically from a message object
function createEmbed(message) {
    const embed = new EmbedBuilder()
        .setTitle('The Legend Continues | AutoMsg')
        .setColor(config.defaultColor)
        .setDescription(message.description)
        .setThumbnail(config.logoImageUrl);

    if (message.footer) {
        embed.setFooter(message.footer);
    }

    return embed;
}

// Function to send auto messages
async function AutoMsg(client) {
    const channel = client.channels.cache.get(config.automsgchannelid);

    if (!channel) {
        console.error('AutoMsg Error: Channel not found.');
        return;
    }

    // Get a random message from config.autoMessages
    const randomIndex = getRandomInt(0, config.autoMessages.length);
    const selectedMessage = config.autoMessages[randomIndex];

    // Create the embed
    const embed = createEmbed(selectedMessage);

    try {
        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending AutoMsg:', error);
    }
}

module.exports = AutoMsg;