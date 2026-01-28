const {
  SlashCommandBuilder,
  ButtonBuilder,
  MessageFlags,
  ButtonStyle,
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
const { fishData, herbList, DEFAULT_SMOKING_TIME_PER_FISH, MAX_TOTAL_SMOKING_TIME } = require('../../fishingConfig.js');
const {
  getFlatFishIdMap,
  parseFishInventory,
  parseHerbInventory,
  getPrestigeFishWorth,
  addToInventory,
  deleteFromInventory,
  checkForRandomEvent,
} = require('../../utils/fishingUtils.js');
const {
  isUserInEvent,
  startEvent,
  endEvent,
} = require('../../utils/trackActiveEvents.js');
const flatFishMap = getFlatFishIdMap(fishData);
const { UserDenyError } = require('../../utils/errors.js');

async function safeReply(interaction, message, ephemeral = true) {
  if (interaction.replied) {
    return interaction.followUp({ content: message, flags: ephemeral ? MessageFlags.Ephemeral : undefined });
  } else if (interaction.deferred) {
    return interaction.editReply({ content: message });
  } else {
    return interaction.reply({ content: message, flags: ephemeral ? MessageFlags.Ephemeral : undefined });
  }
}

function getSmokingTimeEstimate(fishAmount, herb, herbsAvailable) {
  if (!fishAmount) return null;
  let boostedTimePerFish = DEFAULT_SMOKING_TIME_PER_FISH;
  let boostedFishCount = 0;
  let normalFishCount = fishAmount;
  if (herb && herb.boost === 'speed') {
    boostedTimePerFish = DEFAULT_SMOKING_TIME_PER_FISH / herb.boostValue;
    boostedFishCount = Math.min(herbsAvailable, fishAmount);
    normalFishCount = fishAmount - boostedFishCount;
  }
  const rawSmokingTime =
    (boostedFishCount * boostedTimePerFish) +
    (normalFishCount * DEFAULT_SMOKING_TIME_PER_FISH);
  const smokingTime = Math.min(rawSmokingTime, MAX_TOTAL_SMOKING_TIME);
  return smokingTime;
}

function formatSmokingTime(ms) {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('smoker')
    .setDescription('Use the fish smoker'),
  async run(interaction) {
    function denyInteraction(message, denialEndsEvent = true) {
      if (denialEndsEvent) endEvent(interaction.user.id, 'smokerMenu');
      throw new UserDenyError(message);
    }

    try {
      if (isUserInEvent(interaction.user.id, 'smokerMenu')) {
        denyInteraction('You\'re already at the smoker!\n-# You already have a smoker menu open. If you believe this is an error, ask an admin to run the command `/admin userevents`', false);
      }

      startEvent(interaction.user.id, 'smokerMenu');

      let selectedFish = null;
      let selectedHerb = null;
      let playerData = null;

      const config = interaction.client.config;
      const griggyDatabaseDir = config.griggyDbPath;

      try {
        playerData = await queryDB(griggyDatabaseDir, 'SELECT * FROM fishing WHERE discord_id = ?', [interaction.user.id], true);
        if (!playerData) denyInteraction('You ain\'t got any `/fish` to smoke!');
        if (playerData.smoker) {
          const smokerEndTime = playerData.smoker.split('/')[0];
          denyInteraction(`${interaction.member.displayName} is anxious for their smoker to finish.\n-# "If these ain\'t done <t:${Math.floor(smokerEndTime / 1000)}:R> I\'ll starve!"`);
        }

        const fishInventory = parseFishInventory(playerData.inventory);
        if (Object.keys(fishInventory.regular).length === 0) denyInteraction('You ain\'t got any `/fish` to smoke!');
        if (Object.keys(fishInventory.smoked).length > 24) denyInteraction('You can\'t smoke any more fish! You need to sell some first.\n-# "These fish\'re burnin\' a hole in my pocket!"');

        const herbInventory = parseHerbInventory(playerData.spices);

        function buildFishOptions(fishInventory, selectedFishId, selectedFishAmount) {
          return Object.entries(fishInventory.regular)
            .filter(([fishId, quantity]) => quantity > 0)
            .map(([fishId, quantity]) => {
              const fish = flatFishMap[fishId];
              if (!fish) return null;
              return {
                label: `${fish.name} (${quantity})`,
                value: `${fishId}:${quantity}`,
                description: `Rarity: ${fish.rarity}`,
                emoji: { name: '🐟' },
                default: selectedFishId == fishId && selectedFishAmount == quantity,
              };
            })
            .filter(Boolean)
            .slice(0, 25);
        }

        function buildHerbOptions(herbInventory, selectedHerbId, selectedHerbAmount) {
          return Object.entries(herbInventory)
            .filter(([herbId, quantity]) => quantity > 0)
            .map(([herbId, quantity]) => {
              const herb = herbList.find(h => h.id === Number(herbId));
              if (!herb) return null;
              return {
                label: `${herb.name} (${quantity})`,
                value: `${herbId}:${quantity}`,
                description: `${herb.boostDescription}`,
                emoji: { name: '🌿' },
                default: selectedHerbId == herbId && selectedHerbAmount == quantity,
              };
            })
            .filter(Boolean)
            .slice(0, 25);
        }

        function buildSelectMenus(menuType, options) {
          if (menuType === 'fish') {
            return new ActionRowBuilder()
              .addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId(`smokeFish:${interaction.user.id}`)
                  .setPlaceholder('Select the fish to smoke')
                  .addOptions(options.length > 0 ? options : [{ label: 'No fish available', value: 'none', description: 'You have no fish to smoke.', emoji: { name: '❌' } }])
              );
          } else if (menuType === 'herb') {
            return new ActionRowBuilder()
              .addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId(`useHerb:${interaction.user.id}`)
                  .setPlaceholder('Select the herb to use')
                  .addOptions(options.length > 0 ? options : [{ label: 'No herbs available', value: 'none', description: 'You have no herbs to use.', emoji: { name: '❌' } }])
              );
          }
          return null;
        }

        const fishOptionsInitial = buildFishOptions(fishInventory);
        if (fishOptionsInitial.length === 0) denyInteraction('You ain\'t got any `/fish` to smoke!');
        const herbOptionsInitial = buildHerbOptions(herbInventory);

        const fishSelectMenu = buildSelectMenus('fish', fishOptionsInitial);

        const herbSelectMenu = buildSelectMenus('herb', herbOptionsInitial);

        function buildConfirmationSection(selectedFish, selectedHerb) {
          let estimateText = '';
          if (selectedFish) {
            const fishAmount = selectedFish.amount;
            const herb = selectedHerb;
            const herbsAvailable = herb ? herb.amount : 0;
            const timeMs = getSmokingTimeEstimate(fishAmount, herb, herbsAvailable);
            if (timeMs) {
              estimateText = `**ETA:** ${formatSmokingTime(timeMs)}`;
            }
          }
          return new SectionBuilder()
            .addTextDisplayComponents([
              new TextDisplayBuilder().setContent(
                `**Warning:** You can't cancel the smoker!${estimateText ? `\n${estimateText}` : ''}`
              ),
            ])
            .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId(`confirmSmoker:${interaction.user.id}`)
                .setLabel('Start Smoker')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('⏲️')
            );
        }

        const container = new ContainerBuilder()
          .setAccentColor(resolveColor('620000'));

        const separatorComponent = new SeparatorBuilder()
          .setSpacing(SeparatorSpacingSize.Small);

        const smokerTitleSectionComponent = new SectionBuilder()
          .addTextDisplayComponents([
            new TextDisplayBuilder().setContent(`# 🔥 ${interaction.member.displayName}'s Smoker`),
            new TextDisplayBuilder().setContent(`${interaction.member.displayName} walks over to the fish smoker and lays out their inventory. The air is thick with the smell of fresh fish and herbs.`),
            new TextDisplayBuilder().setContent(`-# "Can\'t I just hang it up on the wall as a trophy?"`),
          ]).setThumbnailAccessory(new ThumbnailBuilder({
            media: {
              url: 'https://minecraft.wiki/images/Lit_Smoker_%28S%29_JE2_BE2.gif',
            }
          })
          );

        const smokerFishSectionComponent = new SectionBuilder()
          .addTextDisplayComponents([
            new TextDisplayBuilder().setContent('### 🔪 Prepare the fish'),
            new TextDisplayBuilder().setContent(`This is easily ${interaction.member.displayName}'s least favorite part of the process. They consider heading back to the pond, but they need the money.`),
            new TextDisplayBuilder().setContent(`-# "Sorry, little buddy. I\'ll be quick."`),
          ]).setThumbnailAccessory(new ThumbnailBuilder({
            media: {
              url: 'https://minecraft.wiki/images/Raw_Cod_JE4_BE2.png',
            }
          })
          );

        const smokerHerbSectionComponent = new SectionBuilder()
          .addTextDisplayComponents([
            new TextDisplayBuilder().setContent('### 🌿 Season with herbs'),
            new TextDisplayBuilder().setContent(`The smell of fresh herbs fills the air. ${interaction.member.displayName} can almost taste the difference already!`),
            new TextDisplayBuilder().setContent(`-# "It smells just like the ones from 'Charred & Delicious'!"`),
          ]).setThumbnailAccessory(new ThumbnailBuilder({
            media: {
              url: 'https://minecraft.wiki/images/Sweet_Berry_Bush_Age_3_JE1_BE1.png',
            }
          })
          );

        const confirmationSectionComponent = buildConfirmationSection(selectedFish, selectedHerb);

        container.addSectionComponents([smokerTitleSectionComponent])
          .addSeparatorComponents([separatorComponent])
          .addSectionComponents([smokerFishSectionComponent])
          .addActionRowComponents([fishSelectMenu])
          .addSeparatorComponents([separatorComponent])
          .addSectionComponents([smokerHerbSectionComponent])
          .addActionRowComponents([herbSelectMenu])
          .addSeparatorComponents([separatorComponent])
          .addSectionComponents([confirmationSectionComponent]);

        await interaction.reply({
          components: [container],
          flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        });

        const validPrefixes = ['smokeFish', 'useHerb', 'confirmSmoker'];
        const filter = i =>
          i.user.id === interaction.user.id &&
          validPrefixes.some(prefix => i.customId.startsWith(prefix));
        const collector = interaction.channel.createMessageComponentCollector({
          filter,
          time: 180000, // 3 minutes
        });

        collector.on('collect', async i => {
          try {
            if (i.customId.startsWith('smokeFish:')) {
              const selectedValue = i.values[0];
              if (selectedValue === 'none') return i.deferUpdate();
              const [fishId, quantity] = selectedValue.split(':').map(Number);
              selectedFish = { ...flatFishMap[fishId], amount: quantity, id: fishId };
            } else if (i.customId.startsWith('useHerb:')) {
              const selectedValue = i.values[0];
              if (selectedValue === 'none') return i.deferUpdate();
              const [herbId, quantity] = selectedValue.split(':').map(Number);
              selectedHerb = { ...herbList.find(h => h.id === herbId), amount: quantity, id: herbId };
            } else if (i.customId.startsWith('confirmSmoker:')) {
              await i.deferUpdate();
              if (!selectedFish) denyInteraction('You need to select a fish to smoke!');
              collector.stop('confirmed');
              return;
            }

            const fishOptions = buildFishOptions(fishInventory, selectedFish?.id, selectedFish?.amount);
            const herbOptions = buildHerbOptions(herbInventory, selectedHerb?.id, selectedHerb?.amount);
            const fishSelectMenu = buildSelectMenus('fish', fishOptions);
            const herbSelectMenu = buildSelectMenus('herb', herbOptions);
            const updatedConfirmationSection = buildConfirmationSection(selectedFish, selectedHerb);

            const updatedContainer = new ContainerBuilder()
              .setAccentColor(resolveColor('620000'))
              .addSectionComponents([smokerTitleSectionComponent])
              .addSeparatorComponents([separatorComponent])
              .addSectionComponents([smokerFishSectionComponent])
              .addActionRowComponents([fishSelectMenu])
              .addSeparatorComponents([separatorComponent])
              .addSectionComponents([smokerHerbSectionComponent])
              .addActionRowComponents([herbSelectMenu])
              .addSeparatorComponents([separatorComponent])
              .addSectionComponents([updatedConfirmationSection]);

            await i.update({ components: [updatedContainer] });
          } catch (err) {
            if (err.name !== 'UserDenyError') {
              interaction.client.log('Error in smoker command interaction:', 'ERROR', err);
            }
            return i.followUp({ content: err.message || 'The smoker\'s havin\' trouble. Try again later.', flags: MessageFlags.Ephemeral });
          }
        });

        collector.on('end', async (_, reason) => {
          try {
            if (reason === 'confirmed') {
              endEvent(interaction.user.id, 'smokerMenu');
              await interaction.deleteReply();

              // actual smoking logic here
              const herbProvidesSpeedBoost = selectedHerb && selectedHerb.boost === 'speed';
              const fishToSmoke = selectedFish.amount;
              const herbsUsed = selectedHerb ? selectedHerb.amount : 0;

              let boostedTimePerFish;
              if (selectedHerb) {
                boostedTimePerFish = DEFAULT_SMOKING_TIME_PER_FISH / selectedHerb.boostValue;
              }

              const boostedFishCount = Math.min(herbsUsed, fishToSmoke);
              const normalFishCount = fishToSmoke - boostedFishCount;
              const rawSmokingTime =
                (boostedFishCount * (herbProvidesSpeedBoost ? boostedTimePerFish : DEFAULT_SMOKING_TIME_PER_FISH)) +
                (normalFishCount * DEFAULT_SMOKING_TIME_PER_FISH);

              const smokingTime = Math.min(rawSmokingTime, MAX_TOTAL_SMOKING_TIME);
              const endTime = Date.now() + smokingTime;

              // update the player's inventory
              const updatedFishInventory = deleteFromInventory(selectedFish.id, fishToSmoke, playerData.inventory);
              let updatedHerbInventory = playerData.spices;
              let smokerColumn = `${endTime}/${selectedFish.id}:${fishToSmoke}`;
              if (selectedHerb) {
                updatedHerbInventory = deleteFromInventory(selectedHerb.id, herbsUsed, playerData.spices);
                smokerColumn += `/${selectedHerb.id}:${herbsUsed}`;
              }
              await queryDB(griggyDatabaseDir, 'UPDATE fishing SET inventory = ?, spices = ?, smoker = ? WHERE discord_id = ?', [updatedFishInventory, updatedHerbInventory, smokerColumn, interaction.user.id]);

              const confirmationContainer = new ContainerBuilder()
                .setAccentColor(resolveColor('DarkGreen'))
                .addSectionComponents([
                  new SectionBuilder()
                    .addTextDisplayComponents([
                      new TextDisplayBuilder().setContent(`# ${interaction.member.displayName} started their smoker.`),
                      new TextDisplayBuilder().setContent(`Now all that's left to do is sit back and wait. Might as well enjoy a nice fire in the meantime.`),
                      new TextDisplayBuilder().setContent(`-# "It\'s only ${fishToSmoke} ${selectedFish.name}. How long could it take? I\'ll check back <t:${Math.floor(endTime / 1000)}:R>."`),
                    ]).setThumbnailAccessory(new ThumbnailBuilder({
                      media: {
                        url: 'https://minecraft.wiki/images/Campfire_%28S%29_JE2_BE2.gif',
                      }
                    })),
                ]);

              return interaction.channel.send({
                components: [confirmationContainer],
                flags: MessageFlags.IsComponentsV2,
              });
            } else {
              endEvent(interaction.user.id, 'smokerMenu');
              return interaction.deleteReply();
            }
          } catch (err) {
            if (err.name !== 'UserDenyError') {
              interaction.client.log('Error in /smoker collector:', 'ERROR', err);
            }
            return interaction.channel.send({ content: err.message || 'The smoker\'s havin\' trouble. Try again later.', flags: MessageFlags.Ephemeral });
          }
        });
      } catch (err) {
        if (err.name !== 'UserDenyError') {
          interaction.client.log('Error in /smoker command:', 'ERROR', err);
        }
        return safeReply(interaction, err.message || 'The smoker\'s havin\' trouble. Try again later.');
      }
    } catch (err) {
      if (err.name !== 'UserDenyError') {
        interaction.client.log('Unexpected error in /smoker command:', 'ERROR', err);
      }
      return safeReply(interaction, err.message || 'The smoker\'s havin\' trouble. Try again later.');
    }
  }
}