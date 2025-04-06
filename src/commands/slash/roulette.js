const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const config = require('../../config.js');
const serverData = require('../../serverData.json');
const sqlite3 = require('sqlite3').verbose();
const cmiDatabaseDir = '/home/minecraft/Main/plugins/CMI/cmi.sqlite.db';
const griggyDatabaseDir = '/home/minecraft/GriggyBot/database.db';
const cooldowns = {};
const globalCooldowns = {};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Play a game of roulette')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount to bet')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(5000))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('The color to bet on')
                .setRequired(true)
                .addChoices(
                    { name: 'Red', value: 'red' },
                    { name: 'Black', value: 'black' },
                    { name: 'Green', value: 'green' },
                ))
        .addStringOption(option =>
            option.setName('range')
                .setDescription('Bet on high (19-36) or low (1-18)')
                .addChoices(
                    { name: 'High', value: 'high' },
                    { name: 'Low', value: 'low' },
                )),
    async run(interaction) {
        // Check if gambling is enabled and server is online
        if (!config.gamblingEnabled || !serverData.online) {
            return interaction.reply({
                content: 'Gambling is currently disabled, or TLC is offline.',
                flags: MessageFlags.Ephemeral,
            });
        }
        const userId = interaction.user.id;
        const consoleChannel = interaction.client.channels.cache.get(config.consoleChannelId);
        const now = Date.now();
        const cooldownTime = 5 * 60 * 1000; // 5 minutes in milliseconds
        const globalCooldownTime = 5 * 1000; // 5 seconds in milliseconds

        // Check if the user is on cooldown
        if (cooldowns[userId] && now - cooldowns[userId] < cooldownTime) {
            const remainingTime = Math.ceil((cooldownTime - (now - cooldowns[userId])) / 1000 / 60);
            return interaction.reply({
                content: `You must wait ${remainingTime} more minute(s) before playing roulette again.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        // Check if the user is on the global 5-second cooldown
        if (globalCooldowns[userId] && now - globalCooldowns[userId] < globalCooldownTime) {
            const remainingTime = Math.ceil((globalCooldownTime - (now - globalCooldowns[userId])) / 1000);
            return interaction.reply({
                content: `Slow down! Please wait ${remainingTime} more second(s)! The server needs time to update.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        globalCooldowns[userId] = now;

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
                        return reject(new Error('No balance found.'));
                    }
                    resolve(row);
                });
            });
        }

        // Function to format numbers with commas and two decimal places
        const formatNumber = (num) => {
            return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
        }

        function calculatePayout(betAmount, colorBet, rangeBet, winningColor, winningRange) {
            let payoutMultiplier = 0;

            // Handle color bet
            if (colorBet) {
                if (colorBet === 'green' && winningColor === 'green') {
                    payoutMultiplier += 5;
                } else if (colorBet === winningColor) {
                    payoutMultiplier += 1;
                }
            }

            // Handle range bet
            if (rangeBet && rangeBet === winningRange) {
                payoutMultiplier += 1;
            }

            // Calculate total winnings
            const totalWinnings = betAmount * payoutMultiplier;
            const formattedBetAmount = formatNumber(betAmount);
            const formattedWinnings = formatNumber(totalWinnings);

            // Construct the final payout message
            let payoutMessage;
            if (payoutMultiplier === 0) {
                payoutMessage = `<:_:774859143495417867> You lost your bet of **$${formattedBetAmount}**. Better luck next time!`;
            } else if (totalWinnings === betAmount) {
                payoutMessage = `<a:_:762492571523219466> You broke even with your bet of **$${formattedBetAmount}**.`;
            } else {
                payoutMessage = `<a:_:774429683876888576> You won **$${formattedWinnings}**!`;
            }

            return { payoutMultiplier, payoutMessage };
        }

        const betAmount = interaction.options.getInteger('bet');
        const colorBet = interaction.options.getString('color');
        // Set rangeBet to null if colorBet is green
        const rangeBet = colorBet === 'green' ? null : interaction.options.getString('range');
        // If rangeBet is null and color is NOT green, cancel game and tell user to pick a range
        if (!rangeBet && colorBet !== 'green') {
            return interaction.reply({
                content: 'You must pick a range if you are not betting on green.',
                flags: MessageFlags.Ephemeral,
            });
        }

        // Open DBs
        const cmiDb = new sqlite3.Database(cmiDatabaseDir);
        const griggyDb = new sqlite3.Database(griggyDatabaseDir);
        // Check if the user has the Linked role
        const linkedRole = interaction.guild.roles.cache.find(role => role.name === 'Linked');
        if (!interaction.member.roles.cache.has(linkedRole.id)) {
            return interaction.reply({ content: 'You must link your accounts to play roulette.\n`/link`', flags: MessageFlags.Ephemeral });
        }

        try {
            const uuid = await getUUIDFromDatabase(griggyDb, userId);
            const hyphenatedUUID = uuid.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
            const playerData = await getDataFromDatabase(cmiDb, hyphenatedUUID);
            const balance = playerData.Balance;
            if (isNaN(balance)) {
                return interaction.reply({ content: 'An error occurred while retrieving your balance.', flags: MessageFlags.Ephemeral });
            }
            if (betAmount > balance) {
                return interaction.reply({
                    content:
                        `You do not have enough money to play roulette. Your balance is ${balance}.`,
                    flags: MessageFlags.Ephemeral,
                });
            }
            // GAME START
            const winningNumber = Math.floor(Math.random() * 37);
            const winningColor = winningNumber === 0 ? 'green' : (winningNumber % 2 === 0 ? 'red' : 'black');
            const winningRange = winningNumber <= 18 ? 'low' : 'high';

            const { payoutMultiplier, payoutMessage } = calculatePayout(betAmount, colorBet, rangeBet, winningColor, winningRange);
            let newBalance = balance - betAmount + (betAmount * payoutMultiplier);
            // If payoutMultiplier is not equal to 1, update balance, otherwise leave it alone
            if (payoutMultiplier !== 1) {
                await consoleChannel.send(`money set ${playerData.username} ${newBalance}`);
            }
            // If payoutMultiplier is greater than 0 (win), add user to cooldown. Otherwise do not.
            if (payoutMultiplier > 0) {
                cooldowns[userId] = now;
            }
            const winningNumberEmoji = winningNumber === 0 ? '🟢' : (winningColor === 'red' ? '🔴' : '⚫');

            return interaction.reply({
                content: `# ${winningNumberEmoji} **${winningNumber}**\n${payoutMessage}\nYour new balance is **${formatNumber(newBalance)}**`,
            });
        } catch (error) {
            console.error('Error:', error);
            return interaction.reply({
                content: 'An error occurred while processing your request.',
                flags: MessageFlags.Ephemeral,
            });
        } finally {
            cmiDb.close();
            griggyDb.close();
        }
    }
}