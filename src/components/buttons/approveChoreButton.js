const { MessageFlags } = require('discord.js');
const { checkStaff } = require('../../utils/roleCheckUtils.js');
const { handleChoreApproval } = require('../../events/chores.js');

module.exports = {
  customId: 'approveChore',
  run: async (interaction, args) => {
    const config = interaction.client.config;
    const approver = interaction.member;
    const requiredRole = config.approverRoleId;

    const isStaff = checkStaff(approver);
    if (!approver.roles.cache.has(requiredRole) && (!config.allowStaffApproveChores || !isStaff)) {
      return interaction.reply({ content: 'You\'re not a mom! No perms to approve chores', flags: MessageFlags.Ephemeral });
    }

    const submitterUserId = args[0];
    const choreReward = args[1];

    await handleChoreApproval(interaction, submitterUserId, choreReward);
  }
};