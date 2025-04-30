const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { formatNumber } = require('../../utils/formattingUtils.js');
const { setCooldown, preGameCheck, updateBalance } = require('../../utils/gamblingUtils.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play a game of blackjack')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount of money to bet')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(5000)),
    async run(interaction) {

        try {
            const userId = interaction.user.id;
            const bet = interaction.options.getInteger('bet');
            const { canProceed, playerData } = await preGameCheck(interaction, 'blackjack');
            if (!canProceed) return;

            const balance = playerData.Balance;
            const username = playerData.username;

            // GAME START
            // SET GLOBAL COOLDOWN
            setCooldown(userId, 'global');
            // Generate two "cards" for the player and dealer
            const playerCards = [Math.floor(Math.random() * 11) + 1, Math.floor(Math.random() * 11) + 1];
            const dealerCards = [Math.floor(Math.random() * 11) + 1, Math.floor(Math.random() * 11) + 1];
            const playerTotal = playerCards.reduce((a, b) => a + b, 0);
            // Let the player choose to hit or stand
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
                components: [row],
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
                        const command = `cmi money set ${username} ${newBalance}`;
                        await updateBalance(interaction, command);
                        
                        await interaction.editReply({
                            content: `🃏 You drew a **${newCard}**. Your cards: **${playerCards.join(', ')}** (Total: ${playerTotal})\n` +
                                `You busted! Dealer wins! <:_:774859143495417867>\nNew balance: **$${formatNumber(newBalance)}**`,
                            components: [],
                        });
                        collector.stop('game_over');

                    } else if (playerTotal === 21) {
                        // Player hits blackjack
                        const newBalance = balance + bet; // Add the bet to the player's balance
                        const command = `cmi money set ${username} ${newBalance}`;
                        await updateBalance(interaction, command);

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
                        const command = `cmi money set ${username} ${newBalance}`;
                        await updateBalance(interaction, command);
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

        } catch (err) {
            interaction.client.log('An error occurred:', 'ERROR', err);
            return interaction.reply({ content: 'An error occurred, sorry!', flags: MessageFlags.Ephemeral });
        }
    },
}