const fs = require('fs');
const path = require('path');

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
    return false; // No cooldown
}

function setCooldown(userId, commandName) {
    const cooldowns = JSON.parse(fs.readFileSync(cooldownFilePath, 'utf8'));

    // Initialize the user's cooldown object if it doesn't exist
    if (!cooldowns[userId]) {
        cooldowns[userId] = {};
    }

    // Set the cooldown for the specific command
    cooldowns[userId][commandName] = Date.now();

    fs.writeFileSync(cooldownFilePath, JSON.stringify(cooldowns, null, 2));
}

module.exports = { checkEnoughBalance, checkCooldown, setCooldown };