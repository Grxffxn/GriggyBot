const { EmbedBuilder, MessageFlags } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const databaseDir = '/home/minecraft/GriggyBot/database.db';
const cmiDatabaseDir = '/home/minecraft/Main/plugins/CMI/cmi.sqlite.db';
const config = require('../config.js');

async function Vouch(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const griggydb = new sqlite3.Database(databaseDir, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
        }
    });

    const cmiDb = new sqlite3.Database(cmiDatabaseDir, sqlite3.OPEN_READWRITE, (err) => {
        if (err)
            console.error(err.message);
    });

    if (isNaN(interaction.customId.replace('vouchButton-', ''))) {
        return interaction.followUp({ content: 'Error: Attempted to vouch for an unlinked player. Notify <@365871683828973568>, this shouldn\'t be possible!' });
    }

    const vouchingFor = interaction.customId.replace('vouchButton-', '');
    const vouchingAccount = interaction.user.id;

    const vouchingAccountQuery = 'SELECT * FROM users WHERE discord_id = ?';

    griggydb.get(vouchingAccountQuery, [vouchingAccount], async (err, row) => {
        if (err) {
            console.error(err.message);
            return interaction.followUp({ content: 'There was an error querying the database.' });
        }
        if (!row) {
            return interaction.followUp({ content: `You must link your Discord account to your Minecraft account before you can vouch for \`${vouchingFor}\`.` });
        }

        const vouchedPlayerQuery = 'SELECT * FROM users WHERE discord_id = ?';
        const vouchedPlayerRow = await new Promise((resolve, reject) => {
            griggydb.get(vouchedPlayerQuery, [vouchingFor], (err, row) => {
                if (err) {
                    console.error(err.message);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });

        if (!vouchedPlayerRow) {
            return interaction.followUp({ content: `You must link your Discord account to your Minecraft account before you can vouch for \`${vouchingFor}\`.` });
        }

        const vouchingForUUID = vouchedPlayerRow.minecraft_uuid;
        const hyphenatedVouchingForUUID = vouchingForUUID.replace(
            /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
            '$1-$2-$3-$4-$5'
        );

        const cmiQuery = 'SELECT username FROM users WHERE player_uuid = ?';
        const vouchingForMCUsername = await new Promise((resolve, reject) => {
            cmiDb.get(cmiQuery, [hyphenatedVouchingForUUID], (err, row) => {
                if (err) {
                    console.error(err.message);
                } else {
                    resolve(row ? row.username : null);
                }
            });
        });

        if (!vouchingForMCUsername) {
            return interaction.followUp({ content: `Minecraft username not found for UUID: ${hyphenatedVouchingForUUID}.` });
        }

        if (vouchedPlayerRow.discord_id === vouchingAccount) {
            return interaction.followUp({ content: 'Nice try! You cannot vouch for yourself.' });
        }

        if (row.vouchedIds) {
            if (row.vouchedIds.includes(vouchingForUUID)) {
                return interaction.followUp({ content: `You have already vouched for <@${vouchingFor}>.` });
            }
        }
        const consoleChannel = interaction.guild.channels.cache.get('766095682741862431')

        const vouches = parseInt(vouchedPlayerRow.vouches) + 1;
        await griggydb.run('UPDATE users SET vouches = ? WHERE minecraft_uuid = ?', [vouches, vouchingForUUID]);

        const vouchedIds = row.vouchedIds ? row.vouchedIds + ',' + vouchingForUUID : vouchingForUUID;
        await griggydb.run('UPDATE users SET vouchedIds = ? WHERE discord_id = ?', [vouchedIds, vouchingAccount]);

        const vouchingForUser = await interaction.guild.members.fetch({ user: vouchingFor, force: true });
        const vouchingForUsername = vouchingForUser.displayName;
        const vouchingAccountUser = await interaction.guild.members.fetch({ user: vouchingAccount, force: true });
        const vouchingAccountUsername = vouchingAccountUser.displayName;
        const vouchEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Vouch')
            .setDescription(`${vouchingAccountUsername} has vouched for ${vouchingForUsername}!`)
            .setTimestamp()
            .setFooter({ text: 'GriggyBot' });

        await interaction.followUp({ content: 'Success' });
        await interaction.channel.send({ embeds: [vouchEmbed] });
        await consoleChannel.send(`cmi usermeta ${vouchingForMCUsername} increment points 1`);

        griggydb.close();
        cmiDb.close();
    });
}

module.exports = Vouch;