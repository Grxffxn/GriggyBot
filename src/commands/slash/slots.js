const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const config = require('../../config.js');
const sqlite3 = require('sqlite3').verbose();
const cmiDatabaseDir = '/home/minecraft/Main/plugins/CMI/cmi.sqlite.db';
const griggyDatabaseDir = '/home/minecraft/GriggyBot/database.db';
const cooldowns = {};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Play a game of slots')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount to bet')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(1000))
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
        const now = Date.now();
        const cooldownTime = 15 * 60 * 1000; // 15 minutes in milliseconds
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

        function getBalanceFromDatabase(db, uuid) {
            return new Promise((resolve, reject) => {
                db.get('SELECT * FROM users WHERE player_uuid = ?', [uuid], (err, row) => {
                    if (err) {
                        return reject(err);
                    }
                    if (!row) {
                        return reject(new Error('You must link your accounts to play slots.\n`/link`'));
                    }
                    resolve(row.Balance);
                });
            });
        }

        const bet = interaction.options.getInteger('bet');
        // Check if the user has the Linked role
        const linkedRole = interaction.guild.roles.cache.find(role => role.name === 'Linked');
        if (!interaction.member.roles.cache.has(linkedRole.id)) {
            return interaction.reply({ content: 'You must link your accounts to play slots.\n`/link`', flags: MessageFlags.Ephemeral });
        }
        // Get the user's Minecraft username from GriggyDB
        const griggydb = new sqlite3.Database(griggyDatabaseDir, sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                console.error(err.message);
            }
        });

        try {
            const uuid = await getUUIDFromDatabase(griggydb, userId);
            // Convert UUID to hyphenated format
            const hyphenatedUUID = uuid.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
            // Check if the user has enough balance via CMI's database
            // Resolve with the user's balance from column Balance where player_uuid = hyphenatedUUID
            const cmidb = new sqlite3.Database(cmiDatabaseDir, sqlite3.OPEN_READWRITE, (err) => {
                if (err) {
                    console.error(err.message);
                }
            });
            const balance = await getBalanceFromDatabase(cmidb, hyphenatedUUID);
            // Keep DB connection open until the game is finished
            // Check if the user has enough balance
            if (isNaN(balance)) {
                return interaction.reply({ content: 'An error occurred while retrieving your balance.', flags: MessageFlags.Ephemeral });
            }
            if (balance < bet) {
                return interaction.reply({ content: 'You do not have enough money to play slots.', flags: MessageFlags.Ephemeral });
            }
            // GAME START
            // Choose 3 random emojis from the array
            // Let the user select an emoji list (food, animals, etc.)
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
            if (emojis.length === 0) {
                return interaction.reply({ content: 'An error occurred: Theme selection failed.', flags: MessageFlags.Ephemeral });
            }
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
                cooldowns[userId] = now;
            }
            // Update the user's balance in CMI's database
            const updateBalance = (balance + winnings) - bet;
            const updateQuery = 'UPDATE users SET Balance = ? WHERE player_uuid = ?';
            cmidb.run(updateQuery, [updateBalance, hyphenatedUUID], (err) => {
                if (err) {
                    console.error(err.message);
                    return interaction.reply({ content: 'An error occurred while updating your balance.', flags: MessageFlags.Ephemeral });
                }
            });
            cmidb.close();

            // Response with delayed emoji reveal
            await interaction.reply(`# 🎰 Rolling the slots...\n-+-+-+-+-+-+-+-+-\n# ${randomEmojis[0]} ❓ ❓\n-+-+-+-+-+-+-+-+-`);

            setTimeout(async () => {
                await interaction.editReply(`# 🎰 Rolling the slots...\n-+-+-+-+-+-+-+-+-\n# ${randomEmojis[0]} ${randomEmojis[1]} ❓\n-+-+-+-+-+-+-+-+-`);
            }, 1000); // 1-second delay

            // Format numbers with commas and round to the nearest hundredth
            const formatNumber = (num) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);

            const formattedWinnings = formatNumber(winnings);
            const formattedBet = formatNumber(bet);
            const formattedUpdateBalance = formatNumber(updateBalance);

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
        } finally {
            griggydb.close();
        }
    }
}