const { ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, resolveColor, MessageFlags } = require('discord.js');
const { PRESTIGE_CONFIG, fishData, herbList } = require('../fishingConfig.js');
const { queryDB } = require('../utils/databaseUtils.js');
const { getFlatFishIdMap, getPrestigeFishXP, addToInventory } = require('../utils/fishingUtils.js');
const flatFishMap = getFlatFishIdMap(fishData);

async function checkSmoker(client) {
  const griggyDatabaseDir = client.config.griggyDbPath;
  const smokerData = await queryDB(griggyDatabaseDir, 'SELECT discord_id, inventory, prestige_level, smoker FROM fishing WHERE smoker IS NOT NULL');
  const currentTime = Date.now();

  for (const row of smokerData) {
    const { discord_id, inventory, prestige_level, smoker } = row;
    const smokerEndTime = parseInt(smoker.split('/')[0], 10);
    if (smokerEndTime > currentTime) continue;
    const guildMember = await client.guilds.cache.get(client.config.guildId).members.fetch(discord_id);
    const smokedFishData = smoker.split('/')[1];
    let smokedFishId = smokedFishData.split(':')[0];
    let smokedFishAmount = smokedFishData.split(':')[1];
    const selectedSmokedFishData = flatFishMap[smokedFishId];
    if (!selectedSmokedFishData) {
      client.log(`Fish ID ${smokedFishId} not found in fish data`, 'ERROR');
      continue;
    }
    // ...inside for (const row of smokerData)...
    let herbInfo = smoker.split('/')[2];
    let herbsUsedId, herbsUsedAmount;
    if (herbInfo) {
      [herbsUsedId, herbsUsedAmount] = herbInfo.split(':').map(Number);
    }
    const herbData = herbList.find(herb => herb.id === herbsUsedId);
    const herbBoost = herbData ? herbData.boost : null;
    const herbBoostValue = herbData ? herbData.boostValue : null;
    if (herbBoost) {
      switch (herbBoost) {
        case 'doublesmokeroutput':
          let extraFish = 0;
          for (let i = 0; i < herbsUsedAmount; i++) {
            if (Math.random() < herbBoostValue) {
              extraFish++;
            }
          }
          smokedFishAmount = Number(smokedFishAmount) + extraFish;
          break;
        case 'speed':
          // No action needed
          break;
        case 'xpgain':
          const fishXp = getPrestigeFishXP(selectedSmokedFishData.xp, prestige_level, PRESTIGE_CONFIG.xpBonusPerLevel);
          const boostedXp = Math.round((fishXp * herbsUsedAmount) * herbBoostValue);
          const normalXp = fishXp * (smokedFishAmount - herbsUsedAmount);
          await queryDB(griggyDatabaseDir, 'UPDATE fishing SET xp = xp + ? WHERE discord_id = ?', [
            boostedXp + normalXp,
            discord_id
          ]);
          break;
        default:
          client.log(`Unknown herb boost: ${herbBoost}`, 'WARN');
          break;
      }
    }

    // Update the inventory
    const updatedInventory = addToInventory(smokedFishId, smokedFishAmount, inventory, true);
    await queryDB(griggyDatabaseDir, 'UPDATE fishing SET inventory = ?, smoker = ? WHERE discord_id = ?', [
      updatedInventory,
      null,
      discord_id
    ]);

    // Send a message in the botspam channel to notify the user that their smoker has finished
    const smokerFinishContainer = new ContainerBuilder()
      .setAccentColor(resolveColor('DarkGreen'))
      .addSectionComponents([
        new SectionBuilder()
          .addTextDisplayComponents([
            new TextDisplayBuilder().setContent(`# ⏲️ ${guildMember}'s Smoker Finished!`),
            new TextDisplayBuilder().setContent(`${guildMember.displayName} sighs with relief. Another successful batch of ${smokedFishAmount}x ${selectedSmokedFishData.name} done, and no burnt fish this time! `),
            new TextDisplayBuilder().setContent(`-# "The owner of 'Charred & Delicious' better love this!"`),
          ]).setThumbnailAccessory(new ThumbnailBuilder({
            media: {
              url: 'https://minecraft.wiki/images/Smoker_%28S%29_JE2.png',
            }
          })
          )
      ]);

    client.channels.cache.get(client.config.botspamChannelId).send({
      components: [smokerFinishContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

module.exports = {
  checkSmoker,
};