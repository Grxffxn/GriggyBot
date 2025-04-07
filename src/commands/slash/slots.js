const { SlashCommandBuilder, MessageFlags } = require('discord.js');
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
        .setName('slots')
        .setDescription('Play a game of slots')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount to bet')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(5000))
        .addStringOption(option =>
            option.setName('theme')
                .setDescription('The theme to use')
                .addChoices(
                    { name: 'Food', value: 'food' },
                    { name: 'Animals', value: 'animals' },
                    { name: 'Fruits', value: 'fruits' },
                    { name: 'Vehicles', value: 'vehicles' },
                    { name: 'Sports', value: 'sports' },
                    { name: 'Nature', value: 'nature' },
                    { name: 'VIP', value: 'VIP' },
                )),
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
            // Get UUID, hyphenate it, and get player data (balance and username) then check if they have enough balance
            const hyphenatedUUID = hyphenateUUID((await queryDB(griggyDatabaseDir, 'SELECT minecraft_uuid FROM users WHERE discord_id = ?', [userId])).minecraft_uuid);
            const playerData = await queryDB(cmiDatabaseDir, 'SELECT * FROM users WHERE player_uuid = ?', [hyphenatedUUID]);
            const balance = playerData.Balance;
            if (!checkEnoughBalance(balance, bet)) return interaction.reply({ content: 'You do not have enough money to support your bet.', flags: MessageFlags.Ephemeral });

            // GAME START
            // SET GLOBAL COOLDOWN
            setCooldown(userId, 'global');
            let emojis = [];
            if (!interaction.options.getString('theme')) {
                emojis = ['🍒', '🍋', '🍊', '🍉', '🍇', '🍓', '🍈', '🍍', '🍌', '🍑'];
            } else if (interaction.options.getString('theme') === 'food') {
                emojis = ['🍔', '🍕', '🌭', '🍟', '🍿', '🍩', '🍪', '🍰', '🎂', '🥪'];
            } else if (interaction.options.getString('theme') === 'animals') {
                emojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🦁', '🐨'];
            } else if (interaction.options.getString('theme') === 'fruits') {
                emojis = ['🍒', '🍋', '🍊', '🍉', '🍇', '🍓', '🍈', '🍍', '🍌', '🍑'];
            } else if (interaction.options.getString('theme') === 'vehicles') {
                emojis = ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚜'];
            } else if (interaction.options.getString('theme') === 'sports') {
                emojis = ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🏓', '🏸', '🥊'];
            } else if (interaction.options.getString('theme') === 'nature') {
                emojis = ['🌳', '🌲', '🌴', '🌵', '🌾', '🍂', '🍃', '🍁', '🌼', '🌺'];
            } else if (interaction.options.getString('theme') === 'VIP') {
                emojis = ['<:_:776297828645470218>', '<:_:1353522852581605517>', '<:_:1353523579634843758>', '<:_:1353523822401421392>', '<:_:776297828678369300>', '<:_:1353524143177334846>', '<:_:1355689894575472791>', '<:_:1353524874668408953>', '<:_:1354650114236350664>', '<:_:1354987808477151292>'];
            }

            // CHOOSE 3 RANDOM EMOJIS
            const randomEmojis = [];
            for (let i = 0; i < 3; i++) {
                const randomIndex = Math.floor(Math.random() * emojis.length);
                randomEmojis.push(emojis[randomIndex]);
            }
            // Check if the emojis match
            const allMatch = randomEmojis.every((val, i, arr) => val === arr[0]);
            const twoMatch = randomEmojis[0] === randomEmojis[1] || randomEmojis[1] === randomEmojis[2] || randomEmojis[0] === randomEmojis[2];
            let winnings = 0;
            if (allMatch) {
                winnings = bet * 10;
            } else if (twoMatch) {
                winnings = bet * 2;
            }
            // Set the cooldown for the user
            if (allMatch || twoMatch) {
                setCooldown(userId, 'slots');
            }
            // Update the user's balance via Console Channel
            const updateBalance = (balance + winnings) - bet;
            await consoleChannel.send(`money set ${playerData.username} ${updateBalance}`);
            // Format numbers with commas and round to the nearest hundredth
            const formattedWinnings = formatNumber(winnings);
            const formattedBet = formatNumber(bet);
            const formattedUpdateBalance = formatNumber(updateBalance);

            // Response with delayed emoji reveal
            await interaction.reply(`# 🎰 Rolling the slots...\n-+-+-+-+-+-+-+-+-\n# ${randomEmojis[0]} ❓ ❓\n-+-+-+-+-+-+-+-+-`);

            setTimeout(async () => {
                await interaction.editReply(`# 🎰 Rolling the slots...\n-+-+-+-+-+-+-+-+-\n# ${randomEmojis[0]} ${randomEmojis[1]} ❓\n-+-+-+-+-+-+-+-+-`);
            }, 1000); // 1-second delay

            setTimeout(async () => {
                if (allMatch) {
                    await interaction.editReply(`# <a:_:774429683876888576> You hit the jackpot! <a:_:780596404044955651>\n-+-+-+-+-+-+-+-+-\n# ${randomEmojis.join(' ')}\n-+-+-+-+-+-+-+-+-\nYou won **$${formattedWinnings}!**\nYour new balance is **$${formattedUpdateBalance}**`);
                } else if (twoMatch) {
                    await interaction.editReply(`# <:_:1162276681323642890> You won **$${formattedWinnings}!**\n-+-+-+-+-+-+-+-+-\n# ${randomEmojis.join(' ')}\n-+-+-+-+-+-+-+-+-\nYour new balance is **$${formattedUpdateBalance}**`);
                } else {
                    await interaction.editReply(`# <:_:774859143495417867> Better luck next time!\n-+-+-+-+-+-+-+-+-\n# ${randomEmojis.join(' ')}\n-+-+-+-+-+-+-+-+-\nYou lost **$${formattedBet}!**\nYour new balance is **$${formattedUpdateBalance}**\n-# You may roll again with no cooldown!`);
                }
            }, 2000); // 2-second delay
        } catch (error) {
            console.error('Error:', error);
            interaction.reply({ content: 'An error occurred while processing your request.', flags: MessageFlags.Ephemeral });
        }
    }
}