const { MessageFlags, ContainerBuilder, resolveColor, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder } = require('discord.js');
const { prestigeSelections } = require('../menus/strings/prestigeMenu.js');
const { endEvent } = require('../../utils/trackActiveEvents.js');
const { parseHerbInventory } = require('../../utils/fishingUtils.js');
const { queryDB } = require('../../utils/databaseUtils.js');

module.exports = {
  customId: 'prestigeConfirm',
  run: async (interaction, args) => {
    async function denyInteraction(message = `Please select an herb and rod first.`) {
      return interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
    if (args[0] !== interaction.user.id) return await denyInteraction('This is not your button!');
    const config = interaction.client.config;
    const griggyDatabaseDir = config.griggyDbPath;
    const selection = prestigeSelections.get(interaction.user.id);
    if (!selection || !selection.rod || !selection.herb) await denyInteraction();
    const fishermanRow = await queryDB(griggyDatabaseDir, 'SELECT * FROM fishing WHERE discord_id = ?', [interaction.user.id], true);
    if (!fishermanRow) return await denyInteraction('How did we get here?');
    let herbInventoryObject = parseHerbInventory(fishermanRow.spices);
    const [herbId, herbQty] = selection.herb.split(':');
    let finalHerbInventory = ``;
    if (herbId !== 'none') {
      if (!herbInventoryObject[herbId]) return await denyInteraction(`Unknown herb selected! Please try again.`);
      if (Number(herbQty) > herbInventoryObject[herbId]) return await denyInteraction(`You don't have enough of that herb! Please try again.`);
      finalHerbInventory = `${herbId}:${herbQty}`;
    }
    // passed checks
    await queryDB(griggyDatabaseDir, 'UPDATE fishing SET xp = 0, prestige_level = prestige_level + 1, fishing_rod = ?, selected_rod = ?, spices = ?, inventory = ? WHERE discord_id = ?', [selection.rod, selection.rod, finalHerbInventory, null, interaction.user.id]);
    endEvent(interaction.user.id, 'prestige');
    // build a small success container since it must be componentsv2
    const successContainer = new ContainerBuilder()
      .setAccentColor(resolveColor('Green'));
    successContainer.addSectionComponents([new SectionBuilder().addTextDisplayComponents([
      new TextDisplayBuilder().setContent('# 🎉 Prestige successful!\nYou are now level ' + (fishermanRow.prestige_level + 1) + ' and will receive increased XP and $$$!'),
      new TextDisplayBuilder().setContent(`-# "Why do I feel warm and fuzzy all of a sudden?"`),
    ]).setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Hero_of_the_Village_JE1_BE2.png' } }))]);
    return interaction.update({
      components: [successContainer],
    });
  }
}