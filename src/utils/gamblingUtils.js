const fs = require('fs');
const path = require('path');
const config = require('../config.js');
const { MessageFlags } = require('discord.js');
const { queryDB } = require('./databaseUtils.js');
const { checkLinked } = require('./roleCheckUtils.js');
const { hyphenateUUID } = require('./formattingUtils.js');
const { parseServerData } = require('./serverDataUtils.js');
const cooldownFilePath = path.resolve(__dirname, '../cooldowns.json');
const griggyDatabaseDir = '/home/minecraft/GriggyBot/database.db';
const cmiDatabaseDir = '/home/minecraft/Main/plugins/CMI/cmi.sqlite.db';

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
    if (!cooldowns[userId]) {
        cooldowns[userId] = {};
    }

    cooldowns[userId][commandName] = Date.now();

    fs.writeFileSync(cooldownFilePath, JSON.stringify(cooldowns, null, 2));
}

async function preGameCheck(interaction, gameName) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger('bet');
    const serverData = parseServerData();
    // CHECK LINKED
    if (!config.gamblingEnabled || !serverData.online) {
        await interaction.reply({ content: 'Gambling is currently disabled, or TLC is offline.', flags: MessageFlags.Ephemeral, });
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

module.exports = { checkEnoughBalance, checkCooldown, setCooldown, preGameCheck };