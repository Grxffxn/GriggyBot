const fs = require('fs');
const { queryDB } = require('../utils/databaseUtils');
const { getConfig } = require('../utils/configUtils');

async function AutoProfile(client) {
    const config = getConfig();
    const databaseDir = config.griggyDbPath;
    const accountsFilePath = config.accounts_aof;
    let linkedAccountsData;
    try {
        linkedAccountsData = fs.readFileSync(accountsFilePath, 'utf8');
    } catch (err) {
        return client.log('Error reading accounts.aof file:', 'ERROR', err);
    }

    const linkedAccounts = {};
    const linkedAccountsLines = linkedAccountsData.split('\n');
    for (const line of linkedAccountsLines) {
        const [discordId, minecraftUUID] = line.trim().split(' ');
        if (discordId && minecraftUUID) {
            linkedAccounts[discordId] = minecraftUUID.replace(/-/g, '');
        }
    }

    try {
        const existingProfiles = await queryDB(
            databaseDir,
            'SELECT discord_id FROM users WHERE discord_id IN (' +
                Object.keys(linkedAccounts).map(() => '?').join(', ') +
                ')',
            Object.keys(linkedAccounts)
        );

        const existingDiscordIds = new Set(existingProfiles.map(profile => profile.discord_id));

        const newProfiles = [];
        for (const [discordId, minecraftUUID] of Object.entries(linkedAccounts)) {
            if (!existingDiscordIds.has(discordId)) {
                newProfiles.push([
                    discordId,
                    minecraftUUID,
                    `https://visage.surgeplay.com/bust/256/${minecraftUUID}`,
                ]);
            }
        }

        // Insert new profiles
        if (newProfiles.length > 0) {
            const placeholders = newProfiles.map(() => '(?, ?, ?)').join(', ');
            const flattenedValues = newProfiles.flat();
            await queryDB(
                databaseDir,
                `INSERT INTO users (discord_id, minecraft_uuid, profile_image) VALUES ${placeholders}`,
                flattenedValues
            );
            client.log(`Created ${newProfiles.length} new profiles.`, 'SUCCESS');
        }
    } catch (err) {
        client.log('Error processing profiles:', 'ERROR', err);
    }
}

module.exports = AutoProfile;