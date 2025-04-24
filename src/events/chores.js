const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.js');
const choreChannelId = config.chorechannelid;

// This event will fire at 9AM server time once per day

// Function to choose a random chore and its matching reward from choreList.txt
function chooseChore() {
    try {
        const filePath = path.join(__dirname, '../choreList.txt');
        const fileContent = fs.readFileSync(filePath, 'utf8');

        const chores = fileContent.split('\n').filter(line => line.trim() !== '');
        const randomIndex = Math.floor(Math.random() * chores.length);
        const randomChore = chores[randomIndex];
        const [description, reward] = randomChore.split(':');

        setSelectedChore(randomIndex);

        return {
            description: description.trim(),
            reward: parseInt(reward.trim(), 10),
        };
    } catch (error) {
        console.error('Error reading or parsing choreList.txt:', error);
        return null;
    }
}

// Function to create a formatted message to send to chores channel
function choreToEmbed(dailyChore, dailyReward) {
    try {
        const choreEmbed = new EmbedBuilder()
            .setTitle('Daily Chore')
            .setDescription(`Today's chore is **${dailyChore}**.\nComplete this chore and send proof to earn **$${dailyReward}** in-game.`)
            .setColor(config.defaultColor)
            .setFooter({ text: 'Use `!chore` to submit your proof' });

        return choreEmbed;
    } catch (error) {
        console.error('Error formatting chore message:', error);
        return null;
    }
}

// Function to update selected chore index in serverData.json
function setSelectedChore(index) {
    try {
        // Read the existing serverData.json
        let existingData = {};
        const filePath = path.join(__dirname, '../serverData.json');
        try {
            const rawData = fs.readFileSync(filePath, 'utf8');
            existingData = JSON.parse(rawData);
        } catch (err) {
            console.warn('No existing serverData.json found, creating a new one.');
        }

        // Update the selectedChoreIndex
        const updatedData = { ...existingData, selectedChoreIndex: index };

        // Write the merged data back to serverData.json
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 4), 'utf8');
    } catch (error) {
        console.error('Error updating selected chore index in serverData.json:', error);
    }
}

module.exports = async (client) => {
    const choreChannel = client.channels.cache.get(choreChannelId);
    if (!choreChannel) {
        console.error('Chore channel not found >.<');
        return;
    }

    const { description: dailyChore, reward: dailyReward } = chooseChore();
    if (!dailyChore || !dailyReward) {
        console.error('Failed to select a daily chore or reward >.<');
        return;
    }
    const choreEmbed = choreToEmbed(dailyChore, dailyReward);
    if (!choreEmbed) {
        console.error('Failed to generate the chore embed >.<');
        return;
    }

    try {
        await choreChannel.send({ embeds: [choreEmbed] });
    } catch (error) {
        console.error('Failed to send chore embed:', error);
    }
}