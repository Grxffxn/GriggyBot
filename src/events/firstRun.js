const fs = require('fs');
const path = require('path');
const readline = require('readline');
const sqlite3 = require('sqlite3').verbose();
const { getConfig, saveConfig, reloadConfig } = require('../utils/configUtils');

async function firstRun(client) {
    const config = getConfig();
    const updatedValues = {};
    let isFirstRun = false;

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const ask = (question) => {
        return new Promise((resolve) => {
            rl.question(question, (answer) => resolve(answer.trim()));
        });
    };

    const askForId = async (label, originalValue) => {
        let value;
        do {
            value = await ask(`Enter ${label} (s to skip): `);
            if (value.toLowerCase() === 's') return originalValue;
        } while (!/^\d+$/.test(value));
        return value;
    };

    // GUILD ID
    if (!config.guildId) {
        const firstGuild = client.guilds.cache.first();
        if (firstGuild) {
            updatedValues.guildId = firstGuild.id;
            client.log(`Detected guild: ${firstGuild.name} (${firstGuild.id})`, 'SUCCESS');
        } else {
            client.log('Couldn\'t auto-detect guild.', 'WARN');
            updatedValues.guildId = await askForId('your Discord Server (guild) ID', config.guildId);
        }
        isFirstRun = true;
    }

    // GUILD LOGO
    if (!config.logoImageUrl) {
        const guild = client.guilds.cache.get(updatedValues.guildId || config.guildId);
        const logo = guild?.iconURL({ format: 'png', size: 512 });
        if (logo) {
            updatedValues.logoImageUrl = logo;
            isFirstRun = true;
            client.log(`Grabbed guild logo URL`, 'SUCCESS');
        } else {
            client.log('Couldn\'t auto-detect logo.', 'WARN');
        }
    }

    // CONSOLE CHANNEL & RCON THREAD
    if (!config.consoleChannelId) {
        const guild = client.guilds.cache.get(updatedValues.guildId || config.guildId);
        const consoleChannel = guild?.channels.cache.find(c =>
            c.name.toLowerCase().includes('console') && c.isTextBased()
        );

        if (consoleChannel) {
            updatedValues.consoleChannelId = consoleChannel.id;
            client.log(`Detected console channel: ${consoleChannel.name} (${consoleChannel.id})`, 'SUCCESS');

            const thread = await consoleChannel.threads.create({
                name: 'RCON',
                autoArchiveDuration: 4320,
                reason: 'RCON logging',
            });
            updatedValues.rconLogThreadId = thread.id;
        } else {
            client.log('No console channel found.', 'WARN');
            updatedValues.consoleChannelId = await askForId('consoleChannelId', config.consoleChannelId);
            updatedValues.rconLogThreadId = await askForId('rconLogThreadId (create the thread manually)', config.rconLogThreadId);
        }
        isFirstRun = true;
    }

    if (config.consoleChannelId && !config.rconLogThreadId) {
        const guild = client.guilds.cache.get(updatedValues.guildId || config.guildId);
        const consoleChannel = guild?.channels.cache.get(config.consoleChannelId);
        if (consoleChannel) {
            const thread = await consoleChannel.threads.create({
                name: 'RCON',
                autoArchiveDuration: 4320,
                reason: 'RCON logging',
            });
            updatedValues.rconLogThreadId = thread.id;
            client.log(`Created RCON thread in console channel: ${consoleChannel.name} (${consoleChannel.id})`, 'SUCCESS');
        } else {
            client.log('No console channel found.', 'WARN');
        }
        isFirstRun = true;
    }

    // WELCOME CHANNEL
    if (!config.welcomeChannelId) {
        const guild = client.guilds.cache.get(updatedValues.guildId || config.guildId);
        const welcomeChannel = guild?.channels.cache.find(c =>
            c.name.toLowerCase().includes('welcome') && c.isTextBased()
        );

        if (welcomeChannel) {
            updatedValues.welcomeChannelId = welcomeChannel.id;
            client.log(`Detected welcome channel: ${welcomeChannel.name} (${welcomeChannel.id})`, 'SUCCESS');
        } else {
            client.log('No welcome channel found.', 'WARN');
            updatedValues.welcomeChannelId = await askForId('welcomeChannelId', config.welcomeChannelId);
        }
        isFirstRun = true;
    }

    // INIT. WELCOME MESSAGE
    if (!config.welcomeMessageId && (config.welcomeChannelId || updatedValues.welcomeChannelId)) {
        const channelId = updatedValues.welcomeChannelId || config.welcomeChannelId;
        const guild = client.guilds.cache.get(updatedValues.guildId || config.guildId);
        const welcomeChannel = guild?.channels.cache.get(channelId);
        if (welcomeChannel) {
            const welcomeMessage = await welcomeChannel.send('Hello world! (please don\'t delete me)');
            updatedValues.welcomeMessageId = welcomeMessage.id;
            client.log(`Sent initial welcome message, if you delete it, you'll need to clear welcomeMessageId in config and restart the bot. (${welcomeMessage.id})`, 'SUCCESS');
        } else {
            client.log('No welcome channel found, please check config and restart.', 'WARN');
        }
        isFirstRun = true;
    }

    // BOTSPAM, CHORE, AUTOMSG CHANNELS
    if (config.botspamChannelId) {
        const guild = client.guilds.cache.get(updatedValues.guildId || config.guildId);
        const botspamChannel = guild?.channels.cache.find(c =>
            c.name.toLowerCase().includes('botspam') && c.isTextBased()
        );

        if (botspamChannel) {
            const id = botspamChannel.id;
            updatedValues.botspamChannelId = updatedValues.automsgchannelid = updatedValues.chorechannelid = id;
            client.log(`Detected botspam channel: ${botspamChannel.name} (${id})`, 'SUCCESS');
        } else {
            client.log('No botspam channel found.', 'WARN');
            const manualId = await askForId('a channel ID for botspam/automsg/chore', config.botspamChannelId);
            updatedValues.botspamChannelId = updatedValues.automsgchannelid = updatedValues.chorechannelid = manualId;
        }
        isFirstRun = true;
    }

    // MC CHAT CHANNEL
    if (!config.mcChatChannelId && config.enableApply && config.enableApplicationNotifications) {
        const guild = client.guilds.cache.get(updatedValues.guildId || config.guildId);
        const mcChatChannel = guild?.channels.cache.find(c =>
            c.name.toLowerCase().includes('minecraft') && c.isTextBased()
        );

        if (mcChatChannel) {
            updatedValues.mcChatChannelId = mcChatChannel.id;
            client.log(`Detected DiscordSRV chat channel: ${mcChatChannel.name} (${mcChatChannel.id})`, 'SUCCESS');
        } else {
            client.log('No DiscordSRV chat channel found.', 'WARN');
            updatedValues.mcChatChannelId = await askForId('mcChatChannelId', config.mcChatChannelId);
        }
        isFirstRun = true;
    }

    // RANK-APPLICATIONS CHANNEL
    if (config.enableApply && !config.rankSubmissionChannelId) {
        const guild = client.guilds.cache.get(updatedValues.guildId || config.guildId);
        const rankApplicationsChannel = guild?.channels.cache.find(c =>
            c.name.toLowerCase().includes('rank-applications') && c.isTextBased()
        );

        if (rankApplicationsChannel) {
            updatedValues.rankSubmissionChannelId = rankApplicationsChannel.id;
            client.log(`Detected rank applications channel: ${rankApplicationsChannel.name} (${rankApplicationsChannel.id})`, 'SUCCESS');
        } else {
            client.log('No rank applications channel found. Please create one to use /apply', 'WARN');
            updatedValues.rankSubmissionChannelId = await askForId('rankSubmissionChannelId', config.rankSubmissionChannelId);
        }
        client.log('Once setup has completed, restart the bot to apply this change or /apply will not work properly.', 'WARN');
        isFirstRun = true;
    }

    // DATABASE SETUP
    const databasePath = path.resolve(__dirname, '../../database.db');
    if (!fs.existsSync(databasePath)) {
        client.log('No database found. Creating...');
        createDatabase(databasePath, client);
        isFirstRun = true;
    }

    // CHECK CONFIG CONFLICTS
    if (config.enableVouch && !config.enableRankPoints) {
        client.log('enableVouch is enabled, but enableRankPoints is not. I have enabled rank points as it is required for vouching.', 'WARN');
        client.log('Please restart the bot to apply this change, otherwise rank applications may not work properly.', 'WARN');
        updatedValues.enableRankPoints = true;
        isFirstRun = true;
    }

    // SAVE AND RELOAD
    if (isFirstRun) {
        saveConfig(updatedValues, client);
        reloadConfig(client);
        client.log('Setup complete!', 'SUCCESS');
        client.log('REMINDER: CMI blocks RCON commands by default. In CMI\'s config.yml, set "AllowRconCommands:" and "CleanRconCommands:" to true.', 'WARN');
        client.log('I\'ve spent hundreds of hours on this project, please consider supporting further development <3');
        client.log('https://ko-fi.com/grxffxn');
    }

    rl.close();
    return isFirstRun;
}

function createDatabase(databasePath, client) {
    const db = new sqlite3.Database(databasePath);
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discord_id TEXT UNIQUE NOT NULL,
                minecraft_uuid TEXT UNIQUE,
                vouchedIds TEXT,
                vouches INTEGER DEFAULT 0
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discord_id TEXT UNIQUE NOT NULL,
                status TEXT DEFAULT 'pending',
                message_id TEXT
            )
        `);
    });
    db.close();
    client.log('SQLite database initialized.', 'SUCCESS');
}

module.exports = firstRun;