const fs = require('fs');
const { queryDB } = require('../utils/databaseUtils');

const databaseDir = '/home/minecraft/GriggyBot/database.db';
const accountsFilePath = '/home/minecraft/Main/plugins/DiscordSRV/accounts.aof';

async function AutoProfile(client) {
    // Read the accounts.aof file
    let linkedAccountsData;
    try {
        linkedAccountsData = fs.readFileSync(accountsFilePath, 'utf8');
    } catch (error) {
        console.error('Error reading accounts.aof file:', error);
        return;
    }

    // Parse the file into a JavaScript object
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
                    '000000',
                    `https://visage.surgeplay.com/bust/256/${minecraftUUID}`,
                    'This user has not set a profile description.',
                    '0'
                ]);
            }
        }

        // Insert new profiles
        if (newProfiles.length > 0) {
            const placeholders = newProfiles.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
            const flattenedValues = newProfiles.flat();
            await queryDB(
                databaseDir,
                `INSERT INTO users (discord_id, minecraft_uuid, profile_color, profile_image, profile_description, vouches) VALUES ${placeholders}`,
                flattenedValues
            );
            console.log(`Created ${newProfiles.length} new profiles.`);
        }
    } catch (error) {
        console.error('Error processing profiles:', error);
    }
}

module.exports = AutoProfile;
