const { refreshApplication } = require('../../events/handleApplication.js');

module.exports = {
  customId: 'refreshApplication',
  run: async (interaction, args) => {
    const applicantUserId = args[0];
    const rank = args[1];
    await refreshApplication(interaction, applicantUserId, rank);
  }
}