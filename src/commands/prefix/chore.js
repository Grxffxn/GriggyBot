const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const { getConfig } = require('../../utils/configUtils');
const fs = require('fs');
const path = require('path');

const choreFilePath = path.join(__dirname, '../../choreList.txt');
const serverDataPath = path.join(__dirname, '../../serverData.json');

module.exports = {
    name: 'chore',
    description: 'Submit proof for the daily chore',
    aliases: ['submitchore'],
    async run(client, message, args) {
        const config = getConfig();
        if (!config.enableChore) return message.reply('The server owner has disabled the chores feature.');
        const proof = args.join(' ').trim();
        if (!proof && message.attachments.size === 0) {
            return message.reply('Please provide proof of your chore completion (text or attachments).');
        }

        const choreChannel = client.channels.cache.get(config.chorechannelid);
        if (!choreChannel) {
            return message.reply('Chore channel not found. Please contact an admin.');
        }

        // Get the daily chore and its matching reward
        const serverData = JSON.parse(fs.readFileSync(serverDataPath, 'utf8'));
        const fileContent = fs.readFileSync(choreFilePath, 'utf8');
        const chores = fileContent.split('\n').filter(line => line.trim() !== '');

        const selectedChoreIndex = serverData.selectedChoreIndex;
        const choreEntry = chores[selectedChoreIndex];
        const [description, reward] = choreEntry.split(':');
        const selectedChoreDescription = description.trim();
        const selectedChoreReward = parseInt(reward.trim(), 10);

        let embedDescription = `completed **"${selectedChoreDescription}"**`
        if (proof) embedDescription += `\n**Proof:** ${proof}`

        // Create the embed for the submission
        const embed = new EmbedBuilder()
            .setTitle('Chore Submission')
            .setDescription(embedDescription)
            .setColor(config.defaultColor)
            .setFooter({ text: 'Awaiting approval...' })
            .setAuthor({
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            });

        // Add the first attachment (if any) to the embed
        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            embed.setImage(attachment.url);
        }

        // Create the "Approve" button
        const approveButton = new ButtonBuilder()
            .setCustomId(`approve_${message.author.id}_${selectedChoreReward}`)
            .setLabel('Approve')
            .setStyle('Success');

        const actionRow = new ActionRowBuilder().addComponents(approveButton);

        // Send the submission to the chore channel
        await choreChannel.send({ embeds: [embed], components: [actionRow] });

        // Acknowledge the user's submission
        await message.reply('Your chore submission has been sent for approval!');
    },
};