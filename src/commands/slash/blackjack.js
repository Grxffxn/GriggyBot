const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const serverData = require('../../serverData.json');
const { formatNumber, hyphenateUUID } = require('../../utils/formattingUtils.js');
const { checkEnoughBalance, checkCooldown, setCooldown } = require('../../utils/gamblingUtils.js');
const { checkLinked } = require('../../utils/roleCheckUtils.js');
const { queryDB } = require('../../utils/databaseUtils.js');
const cmiDatabaseDir = '/home/minecraft/Main/plugins/CMI/cmi.sqlite.db';
const griggyDatabaseDir = '/home/minecraft/GriggyBot/database.db';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play a game of blackjack!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount of money to bet')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(5000)),
    async run(interaction) {
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger('bet');
        const consoleChannel = interaction.client.channels.cache.get(config.consoleChannelId);
        // CHECK IF GAMBLING IS ENABLED AND SERVER IS ONLINE
        if (!config.gamblingEnabled || !serverData.online) return interaction.reply({ content: 'Gambling is currently disabled, or TLC is offline.', flags: MessageFlags.Ephemeral, });
        // CHECK LINKED
        if (!checkLinked(interaction.member)) {
            return interaction.reply({ content: 'You must link your accounts to play slots.\n`/link`', flags: MessageFlags.Ephemeral });
        }
        // CHECK COOLDOWNS
        const slotsCooldown = checkCooldown(userId, 'slots', config.gamblingWinCooldown);
        const globalCooldown = checkCooldown(userId, 'global', config.gamblingGlobalCooldown);
        if (slotsCooldown) return interaction.reply({ content: `You are on cooldown! Please wait ${Math.ceil(slotsCooldown / 60)} minutes before playing again.`, flags: MessageFlags.Ephemeral, });
        if (globalCooldown) return interaction.reply({ content: `Slow down! Please wait ${globalCooldown} seconds before playing again! The server needs time to update.`, flags: MessageFlags.Ephemeral, });

        try {
            // Get UUIDs, hyphenate them, and get player data (balances and usernames) then check if they have enough balance
            const hyphenatedUUID = hyphenateUUID((await queryDB(griggyDatabaseDir, 'SELECT minecraft_uuid FROM users WHERE discord_id = ?', [userId])).minecraft_uuid);
            const playerData = await queryDB(cmiDatabaseDir, 'SELECT * FROM users WHERE player_uuid = ?', [hyphenatedUUID]);
            const balance = playerData.Balance;
            const username = playerData.username;
            if (!checkEnoughBalance(balance, bet)) return interaction.reply({ content: 'You do not have enough money to support your bet.', flags: MessageFlags.Ephemeral });

            // GAME START
            // SET GLOBAL COOLDOWN
            setCooldown(userId, 'global');
            // Generate two "cards" for the player and dealer
            const playerCards = [Math.floor(Math.random() * 11) + 1, Math.floor(Math.random() * 11) + 1];
            const dealerCards = [Math.floor(Math.random() * 11) + 1, Math.floor(Math.random() * 11) + 1];
            const playerTotal = playerCards.reduce((a, b) => a + b, 0);
            // Let the player choose to hit or stand
            // Use buttons to choose hit or stand
            const dynamicCustomId = Date.now();
            const hitButton = new ButtonBuilder()
                .setCustomId(`hit-${userId}-${dynamicCustomId}`)
                .setLabel('Hit')
                .setStyle(ButtonStyle.Primary);
            const standButton = new ButtonBuilder()
                .setCustomId(`stand-${userId}-${dynamicCustomId}`)
                .setLabel('Stand')
                .setStyle(ButtonStyle.Secondary);
            const row = new ActionRowBuilder().addComponents(hitButton, standButton);
            // Show the player their cards and the dealer's first card
            await interaction.reply({
                content: `🃏 Your cards: **${playerCards.join(', ')}** (Total: ${playerTotal})\n` +
                    `Dealer's visible card: **${dealerCards[0]}**\n` +
                    `What would you like to do?`,
                components: [row], // Add the "Hit" and "Stand" buttons
            });
            // Wait for the player's response
            const filter = (i) => (i.customId === `hit-${userId}-${dynamicCustomId}` || i.customId === `stand-${userId}-${dynamicCustomId}`) && i.user.id === userId;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });
            collector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.customId.startsWith('hit')) {
                    // Player chooses to "Hit"
                    const newCard = Math.floor(Math.random() * 11) + 1;
                    playerCards.push(newCard);
                    const playerTotal = playerCards.reduce((a, b) => a + b, 0); // Recalculate playerTotal

                    if (playerTotal > 21) {
                        // Player busts
                        const newBalance = balance - bet; // Deduct the bet from the player's balance
                        await consoleChannel.send(`money set ${username} ${newBalance}`);
                        await interaction.editReply({
                            content: `🃏 You drew a **${newCard}**. Your cards: **${playerCards.join(', ')}** (Total: ${playerTotal})\n` +
                                `You busted! Dealer wins! <:_:774859143495417867>\nNew balance: **$${formatNumber(newBalance)}**`,
                            components: [],
                        });
                        collector.stop('game_over');
                    } else if (playerTotal === 21) {
                        // Player hits blackjack
                        const newBalance = balance + bet; // Add the bet to the player's balance
                        await consoleChannel.send(`money set ${username} ${newBalance}`);
                        await interaction.editReply({
                            content: `🃏 You drew a **${newCard}**. Your cards: **${playerCards.join(', ')}** (Total: ${playerTotal})\n` +
                                `You hit blackjack! You win! <a:_:774429683876888576>\nNew balance: **$${formatNumber(newBalance)}**`,
                            components: [],
                        });
                        setCooldown(userId, 'blackjack'); // Add winner to cooldowns
                        collector.stop('game_over');
                    } else {
                        // Update the message and let the player decide again
                        await interaction.editReply({
                            content: `🃏 You drew a **${newCard}**. Your cards: **${playerCards.join(', ')}** (Total: ${playerTotal})\n` +
                                `Dealer's visible card: **${dealerCards[0]}**\n` +
                                `What would you like to do?`,
                            components: [row],
                        });
                    }
                    await buttonInteraction.deferUpdate();
                } else if (buttonInteraction.customId.startsWith('stand')) {
                    collector.stop('player_stand');

                    // Dealer's turn
                    let dealerTotal = dealerCards.reduce((a, b) => a + b, 0);
                    while (dealerTotal < 17) {
                        const newCard = Math.floor(Math.random() * 11) + 1;
                        dealerCards.push(newCard);
                        dealerTotal = dealerCards.reduce((a, b) => a + b, 0);
                    }

                    // Determine the winner
                    const playerTotal = playerCards.reduce((a, b) => a + b, 0); // Recalculate playerTotal
                    let resultMessage = `🃏 Your cards: **${playerCards.join(', ')}** (Total: ${playerTotal})\n` +
                        `Dealer's cards: **${dealerCards.join(', ')}** (Total: ${dealerTotal})\n`;

                    let newBalance;
                    if (playerTotal > 21) {
                        newBalance = balance - bet;
                        resultMessage += `You busted! Dealer wins! <:_:774859143495417867>\nNew balance: **$${formatNumber(newBalance)}**`;
                    } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
                        newBalance = balance + bet;
                        resultMessage += `You win! <:_:1162276681323642890>\nNew balance: **$${formatNumber(newBalance)}**`;
                        setCooldown(userId, 'blackjack'); // Add winner to cooldowns
                    } else if (playerTotal < dealerTotal) {
                        newBalance = balance - bet;
                        resultMessage += `Dealer wins! <:_:774859143495417867>\nNew balance: **$${formatNumber(newBalance)}**`;
                    } else {
                        resultMessage += `It's a tie! <a:_:762492571523219466>\nBalance: **$${formatNumber(balance)}**`;
                    }

                    await interaction.editReply({ content: resultMessage, components: [] });
                    // If it's a tie, do not update balance
                    if (playerTotal !== dealerTotal) {
                        await consoleChannel.send(`money set ${username} ${newBalance}`);
                    }
                    collector.stop('game_over');
                }
            });

            collector.on('end', async (reason) => {
                if (reason === 'time') {
                    // Handle timeout
                    await interaction.editReply({
                        content: `The game timed out. Please try again.`,
                        components: [],
                    });
                    return;
                } else if (reason === 'game_over') {
                    return;
                }
            });

        } catch (error) {
            console.error(error);
            return interaction.reply({ content: 'An error occurred, sorry!', flags: MessageFlags.Ephemeral });
        }
    },
}