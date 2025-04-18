const { EmbedBuilder, MessageFlags } = require('discord.js');
const { queryDB } = require('../utils/databaseUtils');
const databaseDir = '/home/minecraft/GriggyBot/database.db';
const cmiDatabaseDir = '/home/minecraft/Main/plugins/CMI/cmi.sqlite.db';

async function Vouch(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (isNaN(interaction.customId.replace('vouchButton-', ''))) {
        return interaction.followUp({ content: 'Error: Attempted to vouch for an unlinked player. Notify <@365871683828973568>, this shouldn\'t be possible!' });
    }

    const vouchingFor = interaction.customId.replace('vouchButton-', '');
    const vouchingAccount = interaction.user.id;

    try {
        const vouchingAccountRow = await queryDB(databaseDir, 'SELECT * FROM users WHERE discord_id = ?', [vouchingAccount], true);
        if (!vouchingAccountRow) {
            return interaction.followUp({ content: `You must link your Discord account to your Minecraft account before you can vouch for \`${vouchingFor}\`.` });
        }

        const vouchedPlayerRow = await queryDB(databaseDir, 'SELECT * FROM users WHERE discord_id = ?', [vouchingFor], true);
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
        await queryDB(databaseDir, 'UPDATE users SET vouches = ? WHERE minecraft_uuid = ?', [updatedVouches, vouchingForUUID]);

        const updatedVouchedIds = vouchingAccountRow.vouchedIds
            ? `${vouchingAccountRow.vouchedIds},${vouchingForUUID}`
            : vouchingForUUID;
        await queryDB(databaseDir, 'UPDATE users SET vouchedIds = ? WHERE discord_id = ?', [updatedVouchedIds, vouchingAccount]);

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

        const consoleChannel = interaction.guild.channels.cache.get('766095682741862431');
        await consoleChannel.send(`cmi usermeta ${vouchingForMCUsername} increment points 1`);
    } catch (error) {
        console.error('Error processing vouch:', error.message);
        return interaction.followUp({ content: 'An error occurred while processing your vouch. Please try again later.' });
    }
}

module.exports = Vouch;