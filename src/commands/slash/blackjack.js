const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const serverData = require('../../serverData.json');
const sqlite3 = require('sqlite3').verbose();
const cmiDatabaseDir = '/home/minecraft/Main/plugins/CMI/cmi.sqlite.db';
const griggyDatabaseDir = '/home/minecraft/GriggyBot/database.db';
const cooldowns = {};

function formatNumber(num) {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

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
        // Check if gambling is enabled and server is online
        if (!config.gamblingEnabled || !serverData.online) {
            return interaction.reply({
                content: 'Gambling is currently disabled, or TLC is offline.',
                flags: MessageFlags.Ephemeral,
            });
        }
        const userId = interaction.user.id;
        const now = Date.now();
        const cooldownTime = 5 * 60 * 1000; // 5 minutes in milliseconds
        // Check if the user is on cooldown
        if (cooldowns[userId] && now - cooldowns[userId] < cooldownTime) {
            const remainingTime = Math.ceil((cooldownTime - (now - cooldowns[userId])) / 1000 / 60);
            return interaction.reply({
                content: `You must wait ${remainingTime} more minute(s) before playing slots again.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        function getUUIDFromDatabase(db, userId) {
            return new Promise((resolve, reject) => {
                db.get('SELECT minecraft_uuid FROM users WHERE discord_id = ?', [userId], (err, row) => {
                    if (err) {
                        return reject(err);
                    }
                    if (!row) {
                        return reject(new Error('No linked account found.'));
                    }
                    resolve(row.minecraft_uuid);
                });
            });
        }

        function getDataFromDatabase(db, uuid) {
            return new Promise((resolve, reject) => {
                db.get('SELECT * FROM users WHERE player_uuid = ?', [uuid], (err, row) => {
                    if (err) {
                        return reject(err);
                    }
                    if (!row) {
                        return reject(new Error('You must link your accounts to play slots.\n`/link`'));
                    }
                    resolve(row);
                });
            });
        }

        const bet = interaction.options.getInteger('bet');
        const consoleChannel = interaction.client.channels.cache.get(config.consoleChannelId);
        // Check if the user has the Linked role
        const linkedRole = interaction.guild.roles.cache.find(role => role.name === 'Linked');
        if (!interaction.member.roles.cache.has(linkedRole.id)) {
            return interaction.reply({ content: 'You must link your accounts to play slots.\n`/link`', flags: MessageFlags.Ephemeral });
        }

        // Database connections
        const griggydb = new sqlite3.Database(griggyDatabaseDir, sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                console.error(err.message);
            }
        });

        const cmidb = new sqlite3.Database(cmiDatabaseDir, sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                console.error(err.message);
            }
        });

        try {
            const uuid = await getUUIDFromDatabase(griggydb, userId);
            griggydb.close();
            const hyphenatedUUID = uuid.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
            const playerData = await getDataFromDatabase(cmidb, hyphenatedUUID);
            cmidb.close();
            const balance = playerData.Balance;
            const username = playerData.username;
            // Check user balance
            if (isNaN(balance)) {
                return interaction.reply({ content: 'An error occurred while retrieving your balance.', flags: MessageFlags.Ephemeral });
            }
            if (balance < bet) {
                return interaction.reply({ content: 'You do not have enough money to play blackjack.', flags: MessageFlags.Ephemeral });
            }
            // GAME START
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
                content: `Your cards: **${playerCards.join(', ')}** (Total: ${playerTotal})\n` +
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
                        cooldowns[userId] = now; // Add winner to cooldowns
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
                        cooldowns[userId] = now; // Add winner to cooldowns
                    } else if (playerTotal < dealerTotal) {
                        newBalance = balance - bet;
                        resultMessage += `Dealer wins! <:_:774859143495417867>\nNew balance: **$${formatNumber(newBalance)}**`;
                    } else {
                        newBalance = balance;
                        resultMessage += `It's a tie! <a:_:762492571523219466>\nBalance: **$${formatNumber(newBalance)}**`;
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