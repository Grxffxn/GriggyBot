const { MessageFlags, EmbedBuilder } = require('discord.js');
const { checkLinked, checkStaff } = require('../utils/roleCheckUtils.js');
const { hyphenateUUID } = require('../utils/formattingUtils.js');
const { queryDB } = require('../utils/databaseUtils.js');
const { getConfig } = require('../utils/configUtils');
const { updateBalance } = require('../utils/gamblingUtils.js');

async function handleChoreApproval(interaction) {
    try {
        const config = getConfig();
        const griggyDatabaseDir = config.griggyDbPath;
        const cmiDatabaseDir = config.cmi_sqlite_db;
        const approver = interaction.member;
        const requiredRole = config.approverRoleId;

        const isStaff = checkStaff(approver);
        if (!approver.roles.cache.has(requiredRole) && (!config.allowStaffApproveChores || !isStaff)) {
            return interaction.reply({ content: 'You\'re not a mom! No perms to approve chores', flags: MessageFlags.Ephemeral });
        }

        const customIdParts = interaction.customId.split('_');
        if (customIdParts.length < 3) {
            interaction.client.log(`Invalid customId format ${interaction.customId} (processing chore approval)`, 'ERROR');
            return interaction.reply({ content: 'Invalid interaction. Please try again.', flags: MessageFlags.Ephemeral });
        }

        const submitterUserId = customIdParts[1];
        const choreReward = customIdParts[2];

        const message = await interaction.message.fetch();
        const embed = message.embeds[0];

        const updatedEmbed = EmbedBuilder.from(embed).setFooter({
            text: `Approved by ${approver.user.username}`,
            iconURL: approver.user.displayAvatarURL({ dynamic: true })
        });

        await message.edit({ embeds: [updatedEmbed], components: [] });

        // Fetch submitter
        const submitter = await interaction.guild.members.fetch(submitterUserId).catch(() => null);
        if (!submitter) {
            interaction.client.log(`Submitter ${submitterUserId} not found.`, 'ERROR');
            return interaction.reply({ content: 'Couldn\'t find the submitter. Did they leave the server?', flags: MessageFlags.Ephemeral });
        }

        // Get linked MC username
        const userRow = await queryDB(griggyDatabaseDir, 'SELECT minecraft_uuid FROM users WHERE discord_id = ?', [submitterUserId], true);
        if (!userRow || !userRow.minecraft_uuid) {
            interaction.client.log(`UUID retrieval failed for ${submitterUserId}`, 'ERROR');
            return interaction.reply({ content: 'Error: UUID retrieval failed. Sorry!', flags: MessageFlags.Ephemeral });
        }
        const hyphenatedUUID = hyphenateUUID(userRow.minecraft_uuid);

        const playerData = await queryDB(cmiDatabaseDir, 'SELECT * FROM users WHERE player_uuid = ?', [hyphenatedUUID], true);
        if (!playerData) {
            interaction.client.log(`PlayerData retrieval failed for UUID ${hyphenateUUID}`, 'ERROR');
            return interaction.reply({ content: 'Error: PlayerData retrieval failed. Sorry!', flags: MessageFlags.Ephemeral });
        }

        const submitterUsername = playerData.username;

        // Check if the user is linked
        const isLinked = checkLinked(submitter);
        if (isLinked) {
            const command = `cmi money give ${submitterUsername} ${choreReward}`;
            await updateBalance(interaction, command);
            await interaction.reply({ content: `Successfully approved ${submitter}'s chore submission!`, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: `${submitter}, your submission was approved but you weren't rewarded any in-game currency because your accounts are not linked. For information on how to link, run \`/link\` on Discord.` });
        }
    } catch (err) {
        interaction.client.log('Error in handleChoreApproval:', 'ERROR', err);
        await interaction.reply({ content: 'An unexpected error occurred while processing the chore approval. Please contact an admin.', flags: MessageFlags.Ephemeral });
    }
}

module.exports = handleChoreApproval;