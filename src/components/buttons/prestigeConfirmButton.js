const { MessageFlags } = require('discord.js');
const { prestigeSelections } = require('../menus/strings/prestigeMenu.js');
const { endEvent } = require('../../utils/trackActiveEvents.js');
const { parseHerbInventory } = require('../../utils/fishingUtils.js');

module.exports = {
  customId: 'prestigeConfirm',
  run: async (interaction, args) => {
    async function denyInteraction(message = `Please select an herb and rod first.`) {
      return interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
    if (args[0] !== interaction.user.id) await denyInteraction('This is not your button!');
    const config = interaction.client.config;
    const griggyDatabaseDir = config.griggyDbPath;
    const selection = prestigeSelections.get(interaction.user.id);
    if (!selection || !selection.rod || !selection.herb) await denyInteraction();
    const fishermanRow = await queryDB(griggyDatabaseDir, 'SELECT * FROM fishing WHERE discord_id = ?', [interaction.user.id], true);
    if (!fishermanRow) await denyInteraction('How did we get here?');
    let herbInventoryObject = parseHerbInventory(fishermanRow.spices);
    const { herbId, herbQty } = selection.herb.split(':');
    if (!herbInventoryObject[herbId]) await denyInteraction(`Unknown herb selected! Please try again.`);
    if (Number(herbQty) > herbInventoryObject[herbId]) await denyInteraction(`You don't have enough of that herb! Please try again.`);
    // passed checks
    await interaction.message.delete();
    await queryDB(griggyDatabaseDir, 'UPDATE fishing SET xp = 0, prestige_level = prestige_level + 1, fishing_rod = ?, selected_rod = ?, spices = ?, inventory = ? WHERE discord_id = ?', [selection.rod, selection.rod, `${herbId}:${herbQty}`, null, interaction.user.id]);
    endEvent(interaction.user.id, 'prestige');
    return interaction.reply({
      content: '🎉 Prestige successful! You are now level ' + (fishermanRow.prestige_level + 1) + ' and will receive increased XP and $$$!',
      flags: MessageFlags.Ephemeral
    });
  }
}