const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getConfig } = require('../utils/configUtils');

// This event will fire at 9AM server time once per day

// Function to choose a random chore and update the selected index in serverData.json
function chooseChore(client) {
    try {
        const filePath = path.join(__dirname, '../choreList.txt');
        const fileContent = fs.readFileSync(filePath, 'utf8');

        const chores = fileContent.split('\n').filter(line => line.trim() !== '');

        // Read the existing serverData.json
        const serverDataPath = path.join(__dirname, '../serverData.json');
        let existingData = {};
        try {
            const rawData = fs.readFileSync(serverDataPath, 'utf8');
            existingData = JSON.parse(rawData);
        } catch (err) {
            client.log('No existing serverData.json found, starting fresh.', 'WARN');
        }

        const previousIndex = existingData.selectedChoreIndex ?? -1;

        // Select a new random chore index, ensuring it's not the same as the previous one
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * chores.length);
        } while (randomIndex === previousIndex && chores.length > 1);

        const randomChore = chores[randomIndex];
        const [description, reward] = randomChore.split(':');

        // Update the selected chore index in serverData.json
        existingData.selectedChoreIndex = randomIndex;
        fs.writeFileSync(serverDataPath, JSON.stringify(existingData, null, 4), 'utf8');

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

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('redraw_chore')
                .setLabel('Redraw')
                .setStyle(ButtonStyle.Primary)
        );

        return { embed: choreEmbed, components: [actionRow] };
    } catch (err) {
        client.log('Error formatting chore message:', 'ERROR', err);
        return null;
    }
}

module.exports = async (client) => {
    const config = getConfig();
    const choreChannel = client.channels.cache.get(config.choreChannelId);
    if (!choreChannel) return client.log('Chore channel not found >.<', 'ERROR');

    const { description: dailyChore, reward: dailyReward } = chooseChore(client);
    if (!dailyChore || !dailyReward) return client.log('Failed to select a daily chore/reward >.<', 'ERROR');

    const { embed: choreEmbed, components } = choreToEmbed(dailyChore, dailyReward, config, client);
    if (!choreEmbed) return client.log('Failed to generate the chore embed >.<', 'ERROR');

    await choreChannel.send({ embeds: [choreEmbed], components })
        .catch(err => client.log('Failed to send the chore embed >.<', 'ERROR', err));
};

module.exports.handleRedraw = async (interaction) => {
    const client = interaction.client;
    const config = getConfig();

    try {
        const { description: dailyChore, reward: dailyReward } = chooseChore(client);
        if (!dailyChore || !dailyReward) {
            client.log('Failed to select a daily chore/reward >.<', 'ERROR');
            return interaction.reply({ content: 'Failed to select a daily chore/reward >.<', flags: MessageFlags.Ephemeral });
        }

        const { embed: choreEmbed, components } = choreToEmbed(dailyChore, dailyReward, config, client);
        if (!choreEmbed) {
            client.log('Failed to generate the chore embed >.<', 'ERROR');
            return interaction.reply({ content: 'Failed to generate the chore embed >.<', flags: MessageFlags.Ephemeral });
        }

        await interaction.update({ embeds: [choreEmbed], components });
    } catch (err) {
        client.log('Error handling chore redraw:', 'ERROR', err);
        return interaction.reply({ content: 'An error occurred while redrawing the chore.', flags: MessageFlags.Ephemeral });
    }
}