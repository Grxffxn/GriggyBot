const { checkMom, checkStaff } = require('../../utils/roleCheckUtils.js');
const { handleRedraw } = require('../../events/chores.js');

module.exports = {
  customId: 'redrawChore',
  run: async (interaction, args) => {
    const config = interaction.client.config;

    if (!checkMom(interaction.member) && (!checkStaff(interaction.member) || !config.allowStaffApproveChores)) {
      return interaction.reply({
        content: ':no_entry_sign: You do not have permission to redraw chores.',
        ephemeral: true
      });
    }

    await handleRedraw(interaction, args);
  }
};