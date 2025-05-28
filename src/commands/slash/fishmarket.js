const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
  resolveColor,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const { queryDB } = require('../../utils/databaseUtils.js');
const { PRESTIGE_CONFIG, RAW_EARNINGS_LIMIT, SMOKED_EARNINGS_LIMIT, SMOKED_FISH_MULTIPLIER, fishData, fishingRodData, herbList } = require('../../fishingConfig.js');
const {
  getFlatFishIdMap,
  parseFishInventory,
  checkForRandomEvent,
  getPrestigeFishWorth,
  canUserEarn,
} = require('../../utils/fishingUtils.js');
const flatFishMap = getFlatFishIdMap(fishData);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fishmarket')
    .setDescription('Visit the town fish market.'),

  async run(interaction) {
    const griggyDatabaseDir = interaction.client.config.griggyDbPath;
    const playerData = await queryDB(griggyDatabaseDir, 'SELECT * FROM fishing WHERE discord_id = ?', [interaction.user.id], true);
    if (!playerData) return interaction.reply({
      content: '🪣 You should `/fish` a little before takin\' a trip to the market.',
      flags: MessageFlags.Ephemeral
    })

    const fishInventory = parseFishInventory(playerData.inventory);
    let randomEventContainer = null;
    // Chance of a random event occurring while smoker is on and 'unattended'
    if (playerData.smoker) {
      const randomEvent = checkForRandomEvent('smokerUnattended');
      if (randomEvent) {
        switch (randomEvent) {
          case 'smokerFire':
            randomEventContainer = new ContainerBuilder()
              .setAccentColor(resolveColor('DarkRed'))
              .addSectionComponents(
                new SectionBuilder()
                  .addTextDisplayComponents([
                    new TextDisplayBuilder().setContent(`# 🔥 ${interaction.member.displayName}'s Smoker Caught Fire!`),
                    new TextDisplayBuilder().setContent(`${interaction.member.displayName} took a chance and went to the fish market while their smoker was running. Unfortunately, their smoker caught fire and all of their fish were lost!`),
                    new TextDisplayBuilder().setContent('-# "Did I leave the stove on?"'),
                  ]).setThumbnailAccessory(
                    new ThumbnailBuilder({
                      media: {
                        url: 'https://minecraft.wiki/images/Fire.gif',
                      }
                    })
                  )
              );
            await queryDB(griggyDatabaseDir, 'UPDATE fishing SET smoker = ? WHERE discord_id = ?', [
              null,
              interaction.user.id
            ]);
            break;
          default:
            interaction.client.log(`Random event '${randomEvent}' has not been setup in fishmarket.js`, 'WARN');
            break;
        }
      }
    }

    // Create string select menus for fish, smoked fish, and fishing rods
    // Check if the user has hit their fish earnings limit
    const canSellRaw = await canUserEarn(interaction.client.config.griggyDbPath, interaction.user.id, "collectedRawFishMarketMoney", RAW_EARNINGS_LIMIT);

    // RAW
    const fishOptions = Object.entries(fishInventory.regular)
      .filter(([fishId, quantity]) => quantity > 0)
      .map(([fishId, quantity]) => {
        const fish = flatFishMap[fishId];
        if (!fish) {
          console.warn(`Fish with ID ${fishId} not found in fishData.`);
          return null;
        }
        const fishWorth = getPrestigeFishWorth(fish.worth, playerData.prestige_level, PRESTIGE_CONFIG.worthBonusPerLevel, PRESTIGE_CONFIG.worthCap);
        return {
          label: `${fish.name} (${quantity})`,
          value: `${fishId}:${fishWorth}:${quantity}`,
          description: `Rarity: ${fish.rarity}, Worth: $${fishWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          emoji: { name: '🐟' },
        };
      })
      .filter(Boolean)
      .slice(0, 25);

    const fishSelectMenu = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`fishMarket:sellRaw/${interaction.user.id}`)
          .setPlaceholder(
            canSellRaw
              ? 'Select a fish to sell'
              : 'Shop out of money for today'
          )
          .setDisabled(!canSellRaw)
          .addOptions(
            canSellRaw
              ? (fishOptions.length > 0
                ? fishOptions
                : [{ label: 'No fish available', value: 'none', description: 'You have no fish to sell.', emoji: { name: '❌' }, default: true }]
              )
              : [{ label: 'Shop out of money', value: 'none', description: 'Come back tomorrow!', emoji: { name: '❌' }, default: true }]
          )
      );

    // SMOKED
    const canSellSmoked = await canUserEarn(interaction.client.config.griggyDbPath, interaction.user.id, "collectedSmokedFishMarketMoney", SMOKED_EARNINGS_LIMIT);

    const smokedFishOptions = Object.entries(fishInventory.smoked)
      .filter(([fishId, quantity]) => quantity > 0)
      .map(([fishId, quantity]) => {
        const fish = flatFishMap[fishId];
        if (!fish) {
          console.warn(`Fish with ID ${fishId} not found in fishData.`);
          return null;
        }
        const fishWorth = getPrestigeFishWorth(fish.worth, playerData.prestige_level, PRESTIGE_CONFIG.worthBonusPerLevel, PRESTIGE_CONFIG.worthCap);
        return {
          label: `Smoked ${fish.name} (${quantity})`,
          value: `s${fishId}:${fishWorth * SMOKED_FISH_MULTIPLIER}:${quantity}`,
          description: `Rarity: ${fish.rarity}, Worth: $${fishWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          emoji: { name: '🔥' },
        };
      })
      .filter(Boolean)
      .slice(0, 25);

    const smokedFishSelectMenu = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`fishMarket:sellSmoked/${interaction.user.id}`)
          .setPlaceholder(
            canSellSmoked
              ? 'Select a smoked fish to sell'
              : 'Shop out of money for today'
          )
          .setDisabled(!canSellSmoked)
          .addOptions(
            canSellSmoked
              ? (smokedFishOptions.length > 0
                ? smokedFishOptions
                : [{ label: 'No smoked fish available', value: 'none', description: 'You have no smoked fish to sell.', emoji: { name: '❌' }, default: true }]
              )
              : [{ label: 'Shop out of money', value: 'none', description: 'Come back tomorrow!', emoji: { name: '❌' }, default: true }]
          )
      );

    const ownedRods = (playerData.fishing_rod || '').split(',').map(rod => rod.trim()).filter(Boolean);

    const availableRodOptions = Object.entries(fishingRodData)
      .filter(([key]) => !ownedRods.includes(key))
      .map(([key, value]) => ({
        label: `${value.name} ($${value.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })})`,
        value: `${key}:${value.cost}`,
        description: value.description,
        emoji: { name: '🎣' },
      }));

    const rodSelectOptions = availableRodOptions.length > 0
      ? availableRodOptions
      : [{
        label: 'All Fishing Rods Unlocked',
        value: 'none',
        description: 'Doesn\'t get better than this!',
        emoji: { name: '🎉' },
        default: true,
      }]

    const fishingRodSelectMenu = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`fishMarket:buyRod/${interaction.user.id}`)
          .setPlaceholder('Select a fishing rod to purchase')
          .addOptions(rodSelectOptions)
      );

    // Main UI container declaration
    const separatorComponent = new SeparatorBuilder()
      .setSpacing(SeparatorSpacingSize.Small);

    const container = new ContainerBuilder()
      .setAccentColor(resolveColor(interaction.client.config.defaultColor))
      .addSectionComponents([
        new SectionBuilder()
          .addTextDisplayComponents([
            new TextDisplayBuilder().setContent(`# 🐡 ${interaction.client.config.serverAcronym || interaction.client.config.serverName} Fish Market`),
            new TextDisplayBuilder().setContent(`${interaction.member.displayName} ventures into the fish market, where the smell of fresh fish fills the air. The market is bustling with activity, and you can see various stalls selling different types of fish and fishing rods. You can sell your fish, sell your smoked fish, or buy a new fishing rod.`),
          ]).setThumbnailAccessory(new ThumbnailBuilder({
            media: {
              url: 'https://minecraft.wiki/images/Taiga_Small_House_3.png',
            }
          }))
      ])
      .addSeparatorComponents(separatorComponent)
      .addSectionComponents([
        new SectionBuilder()
          .addTextDisplayComponents([
            new TextDisplayBuilder().setContent('### 🍣 Pond to Plate'),
            new TextDisplayBuilder().setContent(
              canSellRaw
                ? `The owner of 'Pond to Plate' looks at you with a smile. She tells you that she's always looking for fresh fish to sell in her shop. She offers to buy your fish for a fair price.\n-# "These fish look perfect, ${interaction.member.displayName}. I'll give you a good deal for them!"`
                : `The owner of 'Pond to Plate' looks at you with a slight frown. She tells you that she's out of money for the day and can't buy any more fish.\n-# "Sorry, ${interaction.member.displayName}. I can't buy any more fish today."`
            ),
          ]).setThumbnailAccessory(new ThumbnailBuilder({
            media: {
              url: 'https://minecraft.wiki/images/Raw_Salmon_JE2_BE2.png',
            }
          }))
      ])
      .addActionRowComponents(fishSelectMenu)
      .addSeparatorComponents(separatorComponent)
      .addSectionComponents([
        new SectionBuilder()
          .addTextDisplayComponents([
            new TextDisplayBuilder().setContent('### 🐦‍🔥 Charred & Delicious'),
            new TextDisplayBuilder().setContent(
              canSellSmoked
                ? `The owner of 'Charred & Delicious' looks worried. He tells you that his usual supplier is running behind on orders, and his shop is almost out of stock. He offers to buy your fish for a fair price.\n-# "I'm kinda desperate here, ${interaction.member.displayName}. You won't find a better deal anywhere else!"`
                : `The owner of 'Charred & Delicious' looks at you with a slight frown. He tells you that he's out of money for the day and can't buy any more fish.\n-# "Sorry, ${interaction.member.displayName}. I can't buy any more fish today."`
            ),
          ]).setThumbnailAccessory(new ThumbnailBuilder({
            media: {
              url: 'https://minecraft.wiki/images/Cooked_Cod_JE4_BE3.png',
            }
          }))
      ])
      .addActionRowComponents(smokedFishSelectMenu)
      .addSeparatorComponents(separatorComponent)
      .addSectionComponents([
        new SectionBuilder()
          .addTextDisplayComponents([
            new TextDisplayBuilder().setContent('### 📦 Reel Improvements'),
            new TextDisplayBuilder().setContent(`You notice a small shop selling fishing rods and accessories. The owner is stood outside the shop shouting about his wares. You make eye contact and he waves you over.\n-# "You look like a fisherman, and a good one at that! Have you considered an upgrade?"`),
          ]).setThumbnailAccessory(new ThumbnailBuilder({
            media: {
              url: 'https://minecraft.wiki/images/Fishing_Rod_JE2_BE2.png',
            }
          }))
      ])
      .addActionRowComponents(fishingRodSelectMenu);

    await interaction.reply({
      components: [container, randomEventContainer].filter(Boolean),
      flags: MessageFlags.IsComponentsV2,
    })
  }
};