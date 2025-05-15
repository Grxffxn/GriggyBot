const fs = require('fs');
const path = require('path');
const readline = require('readline');
const sqlite3 = require('sqlite3').verbose();
const { saveConfig, reloadConfig } = require('../utils/configUtils');

async function findFile(basePath, targetDirectory, fileName, client) {
  const results = [];

  async function searchForPluginsFolder(directory) {
    try {
      const files = await fs.promises.readdir(directory, { withFileTypes: true });

      for (const file of files) {
        const filePath = path.join(directory, file.name);

        if (file.isDirectory()) {
          if (file.name === 'plugins') {
            return filePath;
          }
          const foundPath = await searchForPluginsFolder(filePath);
          if (foundPath) return foundPath;
        }
      }
    } catch (error) {
      client.log(`Error reading directory ${directory}: ${error.message}`, 'DEBUG');
    }
    return null;
  }

  async function searchDirectory(directory) {
    try {
      const files = await fs.promises.readdir(directory, { withFileTypes: true });

      for (const file of files) {
        const filePath = path.join(directory, file.name);

        if (file.isDirectory()) {
          await searchDirectory(filePath);
        } else if (file.name === fileName) {
          results.push(filePath);
        }
      }
    } catch (err) {
      client.log(`Couldn't find ${directory} - searching elsewhere...`, 'DEBUG');
    }
  }

  try {
    const baseDirectories = await fs.promises.readdir(basePath, { withFileTypes: true });

    for (const dir of baseDirectories) {
      if (dir.isDirectory()) {
        const potentialBase = path.join(basePath, dir.name);
        const pluginsPath = await searchForPluginsFolder(potentialBase);

        if (pluginsPath) {
          const targetPath = path.join(pluginsPath, targetDirectory);
          await searchDirectory(targetPath);
          if (results.length > 0) break;
        }
      }
    }
  } catch (error) {
    client.log(`Error reading base directory ${basePath}: ${error.message}`, 'ERROR');
  }

  if (results.length === 0) {
    client.log(`Could not find ${fileName} in the ${targetDirectory} directory.`, 'ERROR');
  }

  return results;
}

async function firstRun(client) {
  const config = client.config;
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

  // BOT OWNER
  if (!config.botOwner) {
    const guild = client.guilds.cache.get(updatedValues.guildId || config.guildId);
    const owner = guild?.fetchOwner();
    if (owner) {
      updatedValues.botOwner = owner.id;
      client.log(`Set guild owner as bot owner: ${owner.user.tag} (${owner.id})`, 'SUCCESS');
    } else {
      client.log('Couldn\'t auto-detect bot owner.', 'WARN');
      updatedValues.botOwner = await askForId('your Discord user ID', config.botOwner);
    }
    isFirstRun = true;
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

      try {
        const thread = await consoleChannel.threads.create({
          name: 'RCON',
          autoArchiveDuration: 4320,
          reason: 'RCON logging',
        });
        updatedValues.rconLogThreadId = thread.id;
      } catch (err) {
        client.log('Error creating RCON thread:', 'ERROR', err);
        updatedValues.rconLogThreadId = await askForId('rconLogThreadId (create the thread manually)', config.rconLogThreadId);
      }
    } else {
      client.log('No console channel found.', 'WARN');
      updatedValues.consoleChannelId = await askForId('consoleChannelId', config.consoleChannelId);

      if (updatedValues.consoleChannelId) {
        const consoleChannel = guild?.channels.cache.get(updatedValues.consoleChannelId);
        if (consoleChannel) {
          try {
            const thread = await consoleChannel.threads.create({
              name: 'RCON',
              autoArchiveDuration: 4320,
              reason: 'RCON logging',
            });
            updatedValues.rconLogThreadId = thread.id;
          } catch (err) {
            client.log('Error creating RCON thread:', 'ERROR', err);
            updatedValues.rconLogThreadId = await askForId('rconLogThreadId (create the thread manually)', config.rconLogThreadId);
          }
        } else {
          client.log('Couldn\'t find console channel with the provided ID.', 'WARN');
          updatedValues.rconLogThreadId = await askForId('rconLogThreadId (create the thread manually)', config.rconLogThreadId);
        }
      }
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
  if (!config.welcomeChannelId && config.enableUpdatingImage) {
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
  if (!config.welcomeMessageId && (config.welcomeChannelId || updatedValues.welcomeChannelId) && config.enableUpdatingImage) {
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
  if (!config.botspamChannelId) {
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

  // ATTEMPT PLUGIN DB LOCATION
  if (!config.cmi_sqlite_db || !config.accounts_aof || !config.luckperms_sqlite_db) {
    const relativePath = '../../..';
    const basePath = path.resolve(__dirname, relativePath);

    if (!config.cmi_sqlite_db) {
      client.log(`Searching for cmi.sqlite.db in the CMI directory... This may take a moment.`, 'INFO');
      const foundFiles = await findFile(basePath, 'CMI', 'cmi.sqlite.db', client);

      if (foundFiles.length > 0) {
        updatedValues.cmi_sqlite_db = foundFiles[0];
        client.log(`Found cmi.sqlite.db at ${foundFiles[0]}`, 'SUCCESS');
      } else {
        client.log(`Could not find cmi.sqlite.db. Please set the path in the config file.`, 'WARN');
      }
    }

    if (!config.accounts_aof) {
      client.log(`Searching for accounts.aof in the DiscordSRV directory... This may take a moment.`, 'INFO');
      const foundFiles = await findFile(basePath, 'DiscordSRV', 'accounts.aof', client);

      if (foundFiles.length > 0) {
        updatedValues.accounts_aof = foundFiles[0];
        client.log(`Found accounts.aof at ${foundFiles[0]}`, 'SUCCESS');
      } else {
        client.log(`Could not find accounts.aof. Please set the path in the config file.`, 'WARN');
      }
    }

    if (!config.luckperms_sqlite_db && config.enableInfo) {
      client.log(`Searching for luckperms-sqlite.db in the LuckPerms directory... This may take a moment.`, 'INFO');
      const foundFiles = await findFile(basePath, 'LuckPerms', 'luckperms-sqlite.db', client);

      if (foundFiles.length > 0) {
        updatedValues.luckperms_sqlite_db = foundFiles[0];
        client.log(`Found luckperms-sqlite.db at ${foundFiles[0]}`, 'SUCCESS');
      } else {
        client.log(`Could not find luckperms-sqlite.db. Please set the path in the config file.`, 'WARN');
      }
    }
    isFirstRun = true;
  }

  // DATABASE SETUP
  const databasePath = path.resolve(__dirname, '../../griggydatabase.db');
  if (!fs.existsSync(databasePath)) {
    try {
      client.log('No database found. Creating...');
      createDatabase(updatedValues, databasePath, client);
      isFirstRun = true;
    } catch (err) {
      client.log('Error creating database:', 'ERROR', err);
    }
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

function createDatabase(updatedValues, databasePath, client) {
  try {
    const db = new sqlite3.Database(databasePath);
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          discord_id TEXT NOT NULL,
          minecraft_uuid TEXT NOT NULL,
          profile_color TEXT DEFAULT '000000',
          profile_image TEXT NOT NULL,
          profile_description TEXT DEFAULT 'This user has not set a profile description.',
          profile_title TEXT,
          favorite_game TEXT DEFAULT 'Minecraft',
          vouchedIds TEXT,
          vouches INTEGER DEFAULT 0
      )`);
      db.run(`
        CREATE TABLE IF NOT EXISTS applications (
          message_id TEXT NOT NULL,
          player_name TEXT NOT NULL,
          role TEXT NOT NULL,
          answers TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          staff_reactions TEXT,
          discord_id TEXT NOT NULL,
          approvals INTEGER DEFAULT 0,
          thread_id TEXT NOT NULL
      )`);
      db.run(`
        CREATE TABLE IF NOT EXISTS todo (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          todo TEXT NOT NULL,
          status TEXT DEFAULT 'todo',
          assignee TEXT
      )`);
      db.run(`
        CREATE TABLE IF NOT EXISTS daily_streaks (
          user_id TEXT NOT NULL,
          streak INTEGER DEFAULT 0,
          last_claimed TEXT
      )`);
      db.run(`
        CREATE TABLE IF NOT EXISTS fishing (
          discord_id VARCHAR(50) PRIMARY KEY,
          inventory TEXT DEFAULT '',
          spices TEXT DEFAULT '',
          fishing_rod VARCHAR(50) DEFAULT 'training_rod',
          selected_rod VARCHAR(50) DEFAULT 'training_rod',
          xp INT DEFAULT 0,
          prestige_level INT DEFAULT 0,
          smoker TEXT DEFAULT NULL,
          last_fish_time BIGINT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`);
      db.run(`
        CREATE TRIGGER IF NOT EXISTS update_fishing_updated_at
        AFTER UPDATE ON fishing
        FOR EACH ROW
        BEGIN
          UPDATE fishing SET updated_at = CURRENT_TIMESTAMP WHERE discord_id = OLD.discord_id;
        END;
      `);
    });
    db.close();
    updatedValues.griggyDbPath = databasePath;
    client.log(`SQLite database initialized at ${updatedValues.griggyDbPath}`, 'SUCCESS');
  } catch (err) {
    client.log('Error creating database:', 'ERROR', err);

  }
}

module.exports = firstRun;