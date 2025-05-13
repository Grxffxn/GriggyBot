const { EmbedBuilder, MessageFlags } = require('discord.js');
const { queryDB } = require('../utils/databaseUtils');
const { sendMCCommand, logRCON } = require('../utils/rconUtils');

async function Vouch(interaction, vouchingFor) {
    const config = interaction.client.config;
    const griggyDatabaseDir = config.griggyDbPath;
    const cmiDatabaseDir = config.cmi_sqlite_db;
    const vouchingAccount = interaction.user.id;
    if (!config.enableVouch) return interaction.reply({ content: `Vouching has been disabled by the server owner.`, flags: MessageFlags.Ephemeral });
    
    try {
        await sendMCCommand('list');
    } catch (err) {
        return interaction.reply({ content: `Can't reach ${config.serverAcronym || config.serverName}, please try again later.`, flags: MessageFlags.Ephemeral });
    }

    if (interaction.isButton()) {
      await interaction.deferUpdate();
    } else {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        const vouchingAccountRow = await queryDB(griggyDatabaseDir, 'SELECT * FROM users WHERE discord_id = ?', [vouchingAccount], true);
        if (!vouchingAccountRow) return interaction.editReply(`You must link your Discord account to your Minecraft account before you can vouch for <@${vouchingFor}>`);

        const vouchedPlayerRow = await queryDB(griggyDatabaseDir, 'SELECT * FROM users WHERE discord_id = ?', [vouchingFor], true);
        if (!vouchedPlayerRow) return interaction.editReply(`<@${vouchingFor}>'s Minecraft account is not linked to their Discord account. This may be an error.`);

        const vouchingForUUID = vouchedPlayerRow.minecraft_uuid;
        const hyphenatedVouchingForUUID = vouchingForUUID.replace(
            /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
            '$1-$2-$3-$4-$5'
        );

        const cmiQuery = 'SELECT username FROM users WHERE player_uuid = ?';
        const cmiRow = await queryDB(cmiDatabaseDir, cmiQuery, [hyphenatedVouchingForUUID], true);
        const vouchingForMCUsername = cmiRow ? cmiRow.username : null;

        if (!vouchingForMCUsername) return interaction.editReply(`Minecraft username not found for UUID: ${hyphenatedVouchingForUUID}.`);
        if (vouchedPlayerRow.discord_id === vouchingAccount) return interaction.editReply('Nice try! You cannot vouch for yourself.');
        if (vouchingAccountRow.vouchedIds && vouchingAccountRow.vouchedIds.includes(vouchingForUUID)) return interaction.editReply(`You have already vouched for <@${vouchingFor}>.`);

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
            .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() });

        if (!interaction.isButton()) {
          await interaction.editReply('Success');
        }
        
        await interaction.channel.send({ embeds: [vouchEmbed] });

        const command = `cmi usermeta ${vouchingForMCUsername} increment points 1`;
        const response = await sendMCCommand(command);
        logRCON(command, response);
    } catch (err) {
        interaction.client.log('Error processing vouch:', 'ERROR', err);
        return interaction.editReply('An error occurred while processing your vouch. Please try again later.');
    }
}

module.exports = { Vouch };