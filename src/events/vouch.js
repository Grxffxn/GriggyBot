const { EmbedBuilder, MessageFlags } = require('discord.js');
const { queryDB } = require('../utils/databaseUtils');
const { sendMCCommand, logRCON } = require('../utils/rconUtils');
const { getConfig } = require('../utils/configUtils');

async function Vouch(interaction) {
    const config = getConfig();
    const griggyDatabaseDir = config.griggyDbPath;
    const cmiDatabaseDir = config.cmi_sqlite_db;
    if (!config.enableVouch) return interaction.reply({ content: `Vouching has been disabled by the server owner.`, flags: MessageFlags.Ephemeral });
    try {
        await sendMCCommand('list');
    } catch (error) {
        await interaction.reply(`Can't reach ${config.serverAcronym || config.serverName}, please try again later.`);
        return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (isNaN(interaction.customId.replace('vouchButton-', ''))) {
        return interaction.followUp({ content: 'Error: Attempted to vouch for an unlinked player. Notify <@365871683828973568>, this shouldn\'t be possible!' });
    }

    const vouchingFor = interaction.customId.replace('vouchButton-', '');
    const vouchingAccount = interaction.user.id;

    try {
        const vouchingAccountRow = await queryDB(griggyDatabaseDir, 'SELECT * FROM users WHERE discord_id = ?', [vouchingAccount], true);
        if (!vouchingAccountRow) {
            return interaction.followUp({ content: `You must link your Discord account to your Minecraft account before you can vouch for \`${vouchingFor}\`.` });
        }

        const vouchedPlayerRow = await queryDB(griggyDatabaseDir, 'SELECT * FROM users WHERE discord_id = ?', [vouchingFor], true);
        if (!vouchedPlayerRow) {
            return interaction.followUp({ content: `You must link your Discord account to your Minecraft account before you can vouch for \`${vouchingFor}\`.` });
        }

        const vouchingForUUID = vouchedPlayerRow.minecraft_uuid;
        const hyphenatedVouchingForUUID = vouchingForUUID.replace(
            /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
            '$1-$2-$3-$4-$5'
        );

        const cmiQuery = 'SELECT username FROM users WHERE player_uuid = ?';
        const cmiRow = await queryDB(cmiDatabaseDir, cmiQuery, [hyphenatedVouchingForUUID], true);
        const vouchingForMCUsername = cmiRow ? cmiRow.username : null;

        if (!vouchingForMCUsername) {
            return interaction.followUp({ content: `Minecraft username not found for UUID: ${hyphenatedVouchingForUUID}.` });
        }

        if (vouchedPlayerRow.discord_id === vouchingAccount) {
            return interaction.followUp({ content: 'Nice try! You cannot vouch for yourself.' });
        }

        if (vouchingAccountRow.vouchedIds && vouchingAccountRow.vouchedIds.includes(vouchingForUUID)) {
            return interaction.followUp({ content: `You have already vouched for <@${vouchingFor}>.` });
        }

        const updatedVouches = parseInt(vouchedPlayerRow.vouches) + 1;
        await queryDB(griggyDatabaseDir, 'UPDATE users SET vouches = ? WHERE minecraft_uuid = ?', [updatedVouches, vouchingForUUID]);

        const updatedVouchedIds = vouchingAccountRow.vouchedIds
            ? `${vouchingAccountRow.vouchedIds},${vouchingForUUID}`
            : vouchingForUUID;
        await queryDB(griggyDatabaseDir, 'UPDATE users SET vouchedIds = ? WHERE discord_id = ?', [updatedVouchedIds, vouchingAccount]);

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

        const command = `cmi usermeta ${vouchingForMCUsername} increment points 1`;
        const response = await sendMCCommand(command);
        logRCON(command, response);
    } catch (err) {
        interaction.client.log('Error processing vouch:', 'ERROR', err);
        return interaction.followUp({ content: 'An error occurred while processing your vouch. Please try again later.' });
    }
}

module.exports = Vouch;