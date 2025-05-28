const { MessageFlags } = require('discord.js');
// In-memory store for prestige selections: userId -> { herb: 'id:qty', rod: 'rodId' }
const prestigeSelections = new Map();

module.exports = {
  customId: 'prestige',
  /**
   * Handles select menu interactions for prestige herb/rod selection.
   * @param {import('discord.js').StringSelectMenuInteraction} interaction
   * @param {string[]} args
   */
  run: async (interaction, args) => {
    // args[0] = 'herb' or 'rod'
    // args[1] = userId
    const userId = interaction.user.id;
    if (args[1] !== userId) {
      return interaction.reply({ content: 'This is not your menu!', flags: MessageFlags.Ephemeral });
    }

    // Ensure entry exists
    if (!prestigeSelections.has(userId)) prestigeSelections.set(userId, {});

    // Handle herb selection
    if (args[0] === 'herb') {
      const herbValue = interaction.values[0]; // e.g., "1:16"
      prestigeSelections.get(userId).herb = herbValue;
      return interaction.deferUpdate();
    }

    // Handle rod selection
    if (args[0] === 'rod') {
      const rodValue = interaction.values[0]; // e.g., "training_rod"
      prestigeSelections.get(userId).rod = rodValue;
      return interaction.deferUpdate();
    }

    // Fallback
    return interaction.reply({ content: 'Unknown prestige menu action.', flags: MessageFlags.Ephemeral });
  },

  // Export for use in your button handler if needed
  prestigeSelections,
};