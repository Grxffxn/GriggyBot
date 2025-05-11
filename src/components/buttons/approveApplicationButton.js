const { MessageFlags } = require('discord.js');
const { checkStaff } = require('../../utils/roleCheckUtils.js');
const { approveApplication } = require('../../events/handleApplication.js');

module.exports = {
  customId: 'approveApplication',
  run: async (interaction, args) => {
    const isStaff = checkStaff(interaction.member);
    if (!isStaff) {
      return interaction.followUp({ content: 'You do not have permission to approve applications.', flags: MessageFlags.Ephemeral });
    }
    const applicantUserId = args[0];
    const rank = args[1];
    await approveApplication(interaction, applicantUserId, rank);
  }
}