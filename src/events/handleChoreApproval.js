const { MessageFlags, EmbedBuilder } = require('discord.js');
const { checkLinked } = require('../utils/roleCheckUtils.js');
const config = require('../config.js');

async function handleChoreApproval(interaction) {
    const approver = interaction.member;
    const requiredRole = config.approverRoleId;

    if (!approver.roles.cache.has(requiredRole)) {
        return interaction.reply({ content: 'You\'re not a mom! No perms to approve chores', flags: MessageFlags.Ephemeral });
    }

    const submitterUserId = interaction.customId.split('_')[1];
    const message = await interaction.message.fetch();
    const embed = message.embeds[0];

    const updatedEmbed = EmbedBuilder.from(embed).setFooter({ text: '**APPROVED**' });

    await message.edit({ embeds: [updatedEmbed], components: [] });

    // Use checkLinked to check if the user is linked
    const submitter = await interaction.guild.members.fetch(submitterUserId).catch(() => null);
    if (!submitter) {
        return interaction.reply({ content: 'Couldn\'t find the submitter.. did they leave the server? Might wanna ping Griggy for this one.' });
    }

    const isLinked = checkLinked(submitter);
    if (isLinked) {
        await interaction.reply({ content: 'APPROVED :D LINKED :D' });
    } else {
        await interaction.reply({ content: 'APPROVED :D UNLINKED :O' });
    }
}

module.exports = handleChoreApproval;