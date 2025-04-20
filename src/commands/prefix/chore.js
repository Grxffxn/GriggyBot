const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
    name: 'chore',
    description: 'Submit proof for the daily chore',
    aliases: ['submitchore'],
    async run(client, message, args) {
        const proof = args.join(' ').trim();
        if (!proof && message.attachments.size === 0) {
            return message.reply('Please provide proof of your chore completion (text or attachments).');
        }

        const choreChannel = client.channels.cache.get(config.chorechannelid);
        if (!choreChannel) {
            return message.reply('Chore channel not found. Please contact an admin.');
        }

        // Create the embed for the submission
        const embed = new EmbedBuilder()
            .setTitle('Chore Submission')
            .setDescription(`**User:** ${message.author.tag}\n**Proof:** ${proof || 'No text provided.'}`)
            .setColor(config.defaultColor)
            .setFooter({ text: 'Awaiting approval...' });

        // Add the first attachment (if any) to the embed
        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            embed.setImage(attachment.url); // Use the first attachment as an image
        }

        // Create the "Approve" button
        const approveButton = new ButtonBuilder()
            .setCustomId(`approve_${message.author.id}`) // Custom ID includes the user's Discord ID
            .setLabel('Approve')
            .setStyle('Success');

        const actionRow = new ActionRowBuilder().addComponents(approveButton);

        // Send the submission to the chore channel
        await choreChannel.send({ embeds: [embed], components: [actionRow] });

        // Acknowledge the user's submission
        await message.reply('Your chore submission has been sent for approval!');
    },
};