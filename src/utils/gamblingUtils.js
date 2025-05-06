const fs = require('fs');
const path = require('path');
const { getConfig } = require('./configUtils.js');
const { MessageFlags } = require('discord.js');
const { queryDB } = require('./databaseUtils.js');
const { checkLinked } = require('./roleCheckUtils.js');
const { hyphenateUUID } = require('./formattingUtils.js');
const { parseServerData } = require('./serverDataUtils.js');
const { sendMCCommand, logRCON, logRCONError } = require('./rconUtils.js');
const cooldownFilePath = path.resolve(__dirname, '../cooldowns.json');

function checkEnoughBalance(balance, wager) {
    return balance >= wager;
}

function checkCooldown(userId, commandName, cooldownTime) {
    const cooldowns = JSON.parse(fs.readFileSync(cooldownFilePath, 'utf8'));
    const now = Date.now();

    // Check if the user has a cooldown for the specific command
    if (cooldowns[userId] && cooldowns[userId][commandName] && now - cooldowns[userId][commandName] < cooldownTime) {
        return Math.ceil((cooldownTime - (now - cooldowns[userId][commandName])) / 1000); // Remaining time in seconds
    }
    return false;
}

function setCooldown(userId, commandName) {
    const cooldowns = JSON.parse(fs.readFileSync(cooldownFilePath, 'utf8'));

    // Initialize the user's cooldown object if it doesn't exist
    if (!cooldowns[userId]) cooldowns[userId] = {};

    cooldowns[userId][commandName] = Date.now();

    fs.writeFileSync(cooldownFilePath, JSON.stringify(cooldowns, null, 2));
}

async function preGameCheck(interaction, gameName) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger('bet');
    const config = getConfig();
    const griggyDatabaseDir = config.griggyDbPath;
    const cmiDatabaseDir = config.cmi_sqlite_db;
    const serverData = parseServerData();
    // CHECK LINKED
    if (!serverData.online) {
        await interaction.reply({ content: `${config.serverAcronym || config.serverName} is offline, cannot gamble right now.`, flags: MessageFlags.Ephemeral, });
        return { canProceed: false };
    }
    if (!checkLinked(interaction.member)) {
        await interaction.reply({ content: `You must link your accounts to play ${gameName}.\n\`/link\``, flags: MessageFlags.Ephemeral });
        return { canProceed: false };
    }
    // CHECK COOLDOWNS
    const gameCooldown = checkCooldown(userId, gameName, config.gamblingWinCooldown);
    const globalCooldown = checkCooldown(userId, 'global', config.gamblingGlobalCooldown);
    if (gameCooldown) {
        await interaction.reply({ content: `You are on cooldown! Please wait ${Math.ceil(gameCooldown / 60)} minutes before playing again.`, flags: MessageFlags.Ephemeral, });
        return { canProceed: false };
    }
    if (globalCooldown) {
        await interaction.reply({ content: `Slow down! Please wait ${globalCooldown} seconds before playing again! The server needs time to update.`, flags: MessageFlags.Ephemeral, });
        return { canProceed: false };
    }
    // GET & FORMAT UUID
    const userRow = await queryDB(griggyDatabaseDir, 'SELECT minecraft_uuid FROM users WHERE discord_id = ?', [userId], true);
    if (!userRow || !userRow.minecraft_uuid) {
        await interaction.reply({ content: 'Error: UUID retrieval failed. Sorry!', flags: MessageFlags.Ephemeral });
        return { canProceed: false };
    }
    const hyphenatedUUID = hyphenateUUID(userRow.minecraft_uuid);
    // GET & CHECK BALANCE
    const playerData = await queryDB(cmiDatabaseDir, 'SELECT * FROM users WHERE player_uuid = ?', [hyphenatedUUID], true);
    if (!playerData || playerData.Balance === undefined) {
        await interaction.reply({ content: 'Error: Balance retrieval failed. Sorry!', flags: MessageFlags.Ephemeral });
        return { canProceed: false };
    }
    if (!checkEnoughBalance(playerData.Balance, bet)) {
        await interaction.reply({ content: 'You do not have enough money to support your bet.', flags: MessageFlags.Ephemeral });
        return { canProceed: false };
    }
    // OK
    return { canProceed: true, playerData };
}

async function updateBalance(interaction, command) {
    try {
        const response = await sendMCCommand(command);
        await logRCON(command, response);
    } catch (err) {
        const config = getConfig();
        const botspamChannel = await interaction.guild.channels.fetch(config.botspamChannelId);
        interaction.client.log('Error updating player balance >.< RCON failed', 'ERROR', err);
        await logRCONError(command);
        await botspamChannel.send(`${interaction.user} This is awkward... I can't reach ${config.serverAcronym || config.serverName} >.<\nI've alerted the staff, and someone will update the balance soon.\nIn the meantime, please refrain from any other balance changes.`);
    }
}

module.exports = { checkEnoughBalance, checkCooldown, setCooldown, preGameCheck, updateBalance };