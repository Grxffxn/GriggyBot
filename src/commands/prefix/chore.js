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

        const embed = new EmbedBuilder()
            .setTitle('Chore Submission')
            .setDescription(embedDescription)
            .setColor(config.defaultColor)
            .setFooter({ text: 'Awaiting approval...' })
            .setAuthor({
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            });

        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            embed.setImage(attachment.url);
        }

        const approveButton = new ButtonBuilder()
            .setCustomId(`approve_${message.author.id}_${selectedChoreReward}`)
            .setLabel('Approve')
            .setStyle('Success');

        const actionRow = new ActionRowBuilder().addComponents(approveButton);

        await choreChannel.send({ embeds: [embed], components: [actionRow] });

        await message.react('✅');
    },
};