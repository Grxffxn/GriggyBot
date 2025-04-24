const { MessageFlags, EmbedBuilder } = require('discord.js');
const { checkLinked } = require('../utils/roleCheckUtils.js');
const { hyphenateUUID } = require('../utils/formattingUtils.js');
const { queryDB } = require('../utils/databaseUtils.js');
const config = require('../config.js');
const { updateBalance } = require('../utils/gamblingUtils.js');

const griggyDatabaseDir = '/home/minecraft/GriggyBot/database.db';
const cmiDatabaseDir = '/home/minecraft/Main/plugins/CMI/cmi.sqlite.db';

async function handleChoreApproval(interaction) {
    try {
        const approver = interaction.member;
        const requiredRole = config.approverRoleId;

        if (!approver.roles.cache.has(requiredRole)) {
            return interaction.reply({ content: 'You\'re not a mom! No perms to approve chores', flags: MessageFlags.Ephemeral });
        }

        // Validate customId format
        const customIdParts = interaction.customId.split('_');
        if (customIdParts.length < 3) {
            console.error('Invalid customId format:', interaction.customId);
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
            console.error('Submitter not found:', submitterUserId);
            return interaction.reply({ content: 'Couldn\'t find the submitter. Did they leave the server?', flags: MessageFlags.Ephemeral });
        }

        // Get linked MC username
        const userRow = await queryDB(griggyDatabaseDir, 'SELECT minecraft_uuid FROM users WHERE discord_id = ?', [submitterUserId], true);
        if (!userRow || !userRow.minecraft_uuid) {
            console.error('UUID retrieval failed for userId:', submitterUserId);
            return interaction.reply({ content: 'Error: UUID retrieval failed. Sorry!', flags: MessageFlags.Ephemeral });
        }
        const hyphenatedUUID = hyphenateUUID(userRow.minecraft_uuid);

        const playerData = await queryDB(cmiDatabaseDir, 'SELECT * FROM users WHERE player_uuid = ?', [hyphenatedUUID], true);
        if (!playerData) {
            console.error('PlayerData retrieval failed for UUID:', hyphenatedUUID);
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
    } catch (error) {
        console.error('Error in handleChoreApproval:', error);
        await interaction.reply({ content: 'An unexpected error occurred while processing the chore approval. Please contact an admin.', flags: MessageFlags.Ephemeral });
    }
}

module.exports = handleChoreApproval;