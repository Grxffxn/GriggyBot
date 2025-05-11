const Vouch = require('../../events/vouchEvent.js');

module.exports = {
    customId: 'vouchButton',
    run: async (interaction, args) => {
        const vouchingFor = args[0];
        const vouchingAccount = args[1];

        await Vouch(interaction, vouchingFor, vouchingAccount);
    }
}