const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

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
            linkedAccounts[discordId] = minecraftUUID;
        }
    }

    // Connect to the database
    const griggydb = new sqlite3.Database(databaseDir, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error('Database connection error:', err.message);
        }
    });

    // Loop through linked accounts and create profiles if necessary
    for (const discordId in linkedAccounts) {
        const trimmedUUID = linkedAccounts[discordId].replace(/-/g, '');
        const query = 'SELECT * FROM users WHERE discord_id = ?';

        griggydb.get(query, [discordId], (err, row) => {
            if (err) {
                console.error(err.message);
                return;
            }

            // If no profile exists, insert one with default values
            if (!row) {
                griggydb.run(
                    'INSERT INTO users(discord_id, minecraft_uuid, profile_color, profile_image, profile_description, vouches) VALUES(?, ?, ?, ?, ?, ?)',
                    [discordId, trimmedUUID, '000000', `https://visage.surgeplay.com/bust/256/${trimmedUUID}`, 'This user has not set a profile description.', '0'],
                    function (err) {
                        if (err) {
                            console.error('Error inserting profile:', err.message);
                        } else {
                            console.log(`Profile created for Discord ID: ${discordId}`);
                        }
                    }
                );
            }
        });
    }

    // Close the database connection
    griggydb.close((err) => {
        if (err) {
            console.error('Error closing the database connection:', err.message);
        }
    });
}

module.exports = AutoProfile;
