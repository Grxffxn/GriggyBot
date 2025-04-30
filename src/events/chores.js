const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getConfig } = require('../utils/configUtils');

// This event will fire at 9AM server time once per day

// Function to choose a random chore and its matching reward from choreList.txt
function chooseChore(client) {
    try {
        const filePath = path.join(__dirname, '../choreList.txt');
        const fileContent = fs.readFileSync(filePath, 'utf8');

        const chores = fileContent.split('\n').filter(line => line.trim() !== '');
        const randomIndex = Math.floor(Math.random() * chores.length);
        const randomChore = chores[randomIndex];
        const [description, reward] = randomChore.split(':');

        setSelectedChore(randomIndex, client);

        return {
            description: description.trim(),
            reward: parseInt(reward.trim(), 10),
        };
    } catch (err) {
        client.log('Error reading or parsing choreList.txt:', 'ERROR', err);
        return null;
    }
}

// Function to create a formatted message to send to chores channel
function choreToEmbed(dailyChore, dailyReward, config, client) {
    try {
        const choreEmbed = new EmbedBuilder()
            .setTitle('Daily Chore')
            .setDescription(`Today's chore is **${dailyChore}**.\nComplete this chore and send proof to earn **$${dailyReward}** in-game.`)
            .setColor(config.defaultColor)
            .setFooter({ text: 'Use `!chore` to submit your proof' });

        return choreEmbed;
    } catch (err) {
        client.log('Error formatting chore message:', 'ERROR', err);
        return null;
    }
}

// Function to update selected chore index in serverData.json
function setSelectedChore(index, client) {
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
    } catch (err) {
        client.log('Error updating selected chore index in serverData.json:', 'ERROR', err);
    }
}

module.exports = async (client) => {
    const config = getConfig();
    const choreChannelId = config.chorechannelid;
    const choreChannel = client.channels.cache.get(choreChannelId);
    if (!choreChannel) {
        client.log('Chore channel not found >.<', 'ERROR');
        return;
    }

    const { description: dailyChore, reward: dailyReward } = chooseChore(client);
    if (!dailyChore || !dailyReward) {
        client.log('Failed to select a daily chore/reward >.<', 'ERROR');
        return;
    }
    const choreEmbed = choreToEmbed(dailyChore, dailyReward, config, client);
    if (!choreEmbed) {
        client.log('Failed to generate the chore embed >.<', 'ERROR');
        return;
    }

    try {
        await choreChannel.send({ embeds: [choreEmbed] });
    } catch (err) {
        client.log('Failed to send the chore embed >.<', 'ERROR', err);
    }
}