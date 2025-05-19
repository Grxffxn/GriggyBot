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
} = require('discord.js');
const { queryDB } = require('../../utils/databaseUtils.js');
const { addToInventory, checkForRandomEvent, parseFishInventory, canUserEarn } = require('../../utils/fishingUtils.js');
const {
  isUserInEvent,
  startEvent,
  endEvent,
} = require('../../utils/trackActiveEvents.js');
const { fishData, fishingRodData, herbList, treasureRewards, TREASURE_EARNINGS_LIMIT } = require('../../fishingConfig.js');

const randomMessages = {
  'cast': [
    '\n-# "Hope I catch somethin\' worth more than the bait this time."',
    '\n-# "Maybe the fish are just shy. Or maybe they know I\'m hungry."',
    '\n-# "Reckon the fish are laughin\' at me down there... \'Look at this fool!\'"',
    '\n-# "Betcha the fish are havin\' a meetin\' about avoidin\' my hook."',
    '\n-# "This rod\'s seen more naps than fish, but I ain\'t complainin\'."',
    '\n-# "If I don\'t catch somethin\' soon, I might just jump in there and join \'em."',
    '\n-# "I swear, if I catch another boot, I\'m gonna start a shoe store."',
    '\n-# "I ain\'t in a hurry. The fish ain\'t either. Guess we\'re on the same page."',
    '\n-# "Fishin\' teaches ya patience... and how to talk to yourself without feelin\' weird."',
    '\n-# "Surely they won\'t mind if I take a little nap... Zzzzz..."',
  ],
  'hook': [
    '\n-# "Finally, some action on the line!"',
    '\n-# "Reckon this one\'s gonna put up a fight."',
    '\n-# "Well, well, looks like somethin\'s bitin\'!"',
    '\n-# "Got somethin\' on the line! Hope it ain\'t a boot again."',
    '\n-# "This better not be one of \'em prank fish."',
    '\n-# "Alright fishy, it\'s you or me now."',
    '\n-# "Gotcha! Now don\'t go wrigglin\' off the line."',
    '\n-# "Feels like a big\'un... or maybe just a determined little guy."',
    '\n-# "This one\'s got some fight in \'em. I like that."',
    '\n-# "Finally.. Thought the fish were on vacation or somethin\'."',
  ],
  'catch': [
    '\n-# "This one\'s goin straight to the fryin\' pan."',
    '\n-# "Well, ain\'t you a beauty. Betcha the other fish are jealous."',
    '\n-# "Well, look at that. Guess I ain\'t as unlucky as I thought."',
    '\n-# "Guess the fish decided to take pity on me today."',
    '\n-# "Not the biggest fish in the pond, but I\'ll take it."',
    '\n-# "Finally caught somethin\' worth talkin\' about. Maybe."',
    '\n-# "This one\'s goin\' straight to the braggin\' board."',
    '\n-# "Not bad for a day\'s work. Or, well, a day\'s sittin\'."',
    '\n-# "This one\'s got a story to tell... too bad it ain\'t gonna get the chance."',
    '\n-# "Guess the fish decided to stop playin\' hard to get."',
  ],
  'treasure': [
    '\n-# "Hope there\'s no crab hidin\' in here. Got pinched last time and I\'m still sore."',
    '\n-# "A chest? Out here? Either I\'m dreamin\' or the fish are gettin\' generous."',
    '\n-# "Hope this ain\'t one of those chests full of sand. I got enough of that in my boots already."',
    '\n-# "If there\'s a genie in here, I\'m wishin\' for a fish that don\'t wriggle so much."',
    '\n-# "Maybe it\'s pirate loot. Or maybe it\'s just someone\'s lost lunchbox."',
    '\n-# "I ain\'t sayin\' no to free stuff, even if it smells a little fishy."',
  ],
  'herb': [
    '\n-# "Ain\'t this a nice surprise? A little somethin\' to spice up my day."',
    '\n-# "Well, look at that. A little green friend to keep me company."',
    '\n-# "Guess the fish ain\'t the only ones with good taste."',
    '\n-# "This herb might just be the secret ingredient I was lookin\' for."',
    '\n-# "A little herb never hurt nobody. Unless you eat too much, then it gets weird."',
    '\n-# "I reckon this will make my fish taste a whole lot better."',
  ],
  'doubleCatch': [
    '\n-# "Two fish? Now that\'s what I call a good day!"',
    '\n-# "This fishin\' rod\'s finally payin\' off! Two fish in one go!"',
    '\n-# "Guess the fish are feelin\' generous today. Can\'t say I blame \'em."',
    '\n-# "Two fish in one go? I must be doin\' somethin\' right."',
    '\n-# "I ain\'t complainin\'! Double the fish means double the braggin\' rights."',
    '\n-# "Two fish? Now that\'s a catch worth showin\' off!"',
  ],
};

const pondChoices = Object.entries(fishData).map(([pondKey, pondObj]) => ({
  name: pondObj.name,
  value: pondKey,
}));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fish')
    .setDescription('Go fishing!')
    .addStringOption(option =>
      option.setName('pond')
        .setDescription('Pond to fish in')
        .addChoices(...pondChoices)
    ),
  async run(interaction) {
    function denyInteraction(message) {
      endEvent(interaction.user.id, 'fishing');
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: message,
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.reply({
        content: message,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (isUserInEvent(interaction.user.id, 'fishing')) {
      return denyInteraction('You\'re already fishing! Unless you have four arms, I\'d recommend using one fishing rod at a time.\n-# If you believe this is an error, ask an admin to run the command `/admin userEvents`');
    }

    startEvent(interaction.user.id, 'fishing');
    let fishermanRow = null;
    let randomEventContainer = null;

    const config = interaction.client.config;
    const griggyDatabaseDir = config.griggyDbPath;
    const playerName = interaction.member.displayName;
    const currentTime = Date.now();

    const catchButton = new ButtonBuilder()
      .setCustomId(`catch:${interaction.user.id}`)
      .setLabel('Reel \'em in!')
      .setEmoji('🎣')
      .setStyle(ButtonStyle.Success);

    const fishingMinigameActionRow = new ActionRowBuilder()
      .addComponents(catchButton);

    const canCollectTreasureMoney = await canUserEarn(interaction.client.config.griggyDbPath, interaction.user.id, 'collectedTreasureMoney', TREASURE_EARNINGS_LIMIT);
    const treasureActionRow = new ActionRowBuilder().addComponents(
      ...Object.entries(treasureRewards).map(([key, reward]) =>
        new ButtonBuilder()
          .setCustomId(`fishingTreasure:${key}/${interaction.user.id}`)
          .setLabel(reward.displayName)
          .setEmoji(reward.emoji)
          .setStyle(reward.buttonStyle)
          .setDisabled(key === "money" && !canCollectTreasureMoney)
      )
    );

    const fishingThumbnailComponent = new ThumbnailBuilder({
      media: {
        url: 'https://minecraft.wiki/images/Fishing_Rod_JE2_BE2.png',
      }
    });

    const bonusThumbnailComponent = new ThumbnailBuilder({
      media: {
        url: 'https://minecraft.wiki/images/Luck_JE3.png',
      }
    });

    function getRandomMessage(type) {
      const messages = randomMessages[type];
      const randomIndex = Math.floor(Math.random() * messages.length);
      return messages[randomIndex];
    }

    function getRandomFish(pond) {
      const fishInPond = Object.values(fishData[pond].fish);
      const totalWeight = fishInPond.reduce((sum, fish) => sum + fish.weight, 0);
      const randomWeight = Math.random() * totalWeight;

      let cumulativeWeight = 0;
      for (const fish of fishInPond) {
        cumulativeWeight += fish.weight;
        if (randomWeight < cumulativeWeight) {
          return fish;
        }
      }
    }

    function getHighestAvailablePond(userXp) {
      const pondEntries = Object.entries(fishData);
      pondEntries.sort((a, b) => a[1].xpRequired - b[1].xpRequired);
      let highestPondKey = pondEntries[0][0];
      for (const [pondKey, pondObj] of pondEntries) {
        if (userXp >= pondObj.xpRequired) {
          highestPondKey = pondKey;
        } else {
          break;
        }
      }
      return highestPondKey;
    }

    async function handlePlayerCatchEvent(interaction, playerName, fishingRodInfo, catchEventData, pondConfig) {
      const { caughtFish, xpGained, doubleCatch, randomEvent, caught } = catchEventData;
      const container = new ContainerBuilder()
        .setAccentColor(caughtFish.rarity === 'common' ? resolveColor('00FF00') : caughtFish.rarity === 'uncommon' ? resolveColor('FFFF00') : resolveColor('FF0000'));
      const separatorComponent = new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small);
      const titleText = new TextDisplayBuilder()
        .setContent(`## 🎣 ${playerName} caught a ${caughtFish.rarity} ${caughtFish.name}! ${getRandomMessage('catch')}`);
      const contentText = new TextDisplayBuilder()
        .setContent(`**XP Gained:** ${xpGained}\n**Worth:** $${caughtFish.worth.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n**Pond:** ${pondConfig.name}`);
      const fishingResultsSectionComponent = new SectionBuilder()
        .addTextDisplayComponents([titleText, contentText])
        .setThumbnailAccessory(fishingThumbnailComponent);
      container.addSectionComponents(fishingResultsSectionComponent);
      const bonusSectionComponent = new SectionBuilder();
      const treasureSectionComponent = new SectionBuilder();
      const bonusText = new TextDisplayBuilder()
        .setContent(`## 🎉 ${playerName} caught another ${caughtFish.name}!\n**Fishing Rod:** ${fishingRodInfo.name} ${getRandomMessage('doubleCatch')}`)
      const treasureText = new TextDisplayBuilder();

      if (doubleCatch) {
        container.addSeparatorComponents(separatorComponent);
        bonusSectionComponent.addTextDisplayComponents([bonusText])
          .setThumbnailAccessory(bonusThumbnailComponent);
        container.addSectionComponents(bonusSectionComponent);
      }

      let fishInventory = fishermanRow.inventory;
      let spiceInventory = fishermanRow.spices;
      fishInventory = addToInventory(caughtFish.id, doubleCatch ? 2 : 1, fishInventory);

      switch (randomEvent) {
        case 'treasure':
          container.addSeparatorComponents(separatorComponent);
          treasureText.setContent(`## 🎁 ${playerName} found a treasure chest! ${getRandomMessage('treasure')}`);
          treasureSectionComponent.addTextDisplayComponents([treasureText])
            .setThumbnailAccessory(new ThumbnailBuilder({
              media: {
                url: 'https://minecraft.wiki/images/Chest_%28S%29_JE2.png',
              }
            }));
          container.addSectionComponents(treasureSectionComponent)
            .addActionRowComponents(treasureActionRow);
          await interaction.editReply({ content: '', components: [container], flags: MessageFlags.IsComponentsV2 });
          interaction.client.log(`Showed treasure section for ${interaction.user.id}`, 'DEBUG');
          await queryDB(griggyDatabaseDir, 'UPDATE fishing SET inventory = ?, xp = xp + ? WHERE discord_id = ?', [fishInventory, xpGained, interaction.user.id]);
          break;
        case 'herb':
          container.addSeparatorComponents(separatorComponent);
          const herb = herbList[Math.floor(Math.random() * herbList.length)];
          treasureText.setContent(`## 🌿 ${playerName} found ${herb.name}! ${getRandomMessage('herb')}`);
          treasureSectionComponent.addTextDisplayComponents([treasureText])
            .setThumbnailAccessory({
              media: {
                url: 'https://minecraft.wiki/images/Seagrass_JE1_BE2.gif',
              }
            });
          container.addSectionComponents(treasureSectionComponent);
          await interaction.editReply({ content: '', components: [container], flags: MessageFlags.IsComponentsV2 });
          interaction.client.log(`Showed herb section for ${interaction.user.id}`, 'DEBUG');
          spiceInventory = addToInventory(herb.id, 1, spiceInventory);
          interaction.client.log(`Added herb ${herb.id} to ${interaction.user.id}'s spice inventory`, 'DEBUG');
          await queryDB(griggyDatabaseDir, 'UPDATE fishing SET inventory = ?, spices = ?, xp = xp + ? WHERE discord_id = ?', [fishInventory, spiceInventory, xpGained, interaction.user.id]);
          break;
        default:
          await interaction.editReply({ content: '', components: [container], flags: MessageFlags.IsComponentsV2 });
          interaction.client.log(`No random event triggered for ${interaction.user.id}`, 'DEBUG');
          await queryDB(griggyDatabaseDir, 'UPDATE fishing SET inventory = ?, xp = xp + ? WHERE discord_id = ?', [fishInventory, xpGained, interaction.user.id]);
          break;
      }
    }

    try {
      fishermanRow = await queryDB(griggyDatabaseDir, 'SELECT * FROM fishing WHERE discord_id = ?', [interaction.user.id], true);

      if (!fishermanRow) {
        await queryDB(griggyDatabaseDir, `
        INSERT INTO fishing (discord_id, inventory, spices, fishing_rod, selected_rod, xp, prestige_level, smoker, last_fish_time)
        VALUES (?, '', '', 'training_rod', 'training_rod', 0, 0, NULL, 0)
      `, [interaction.user.id]);

        fishermanRow = await queryDB(griggyDatabaseDir, 'SELECT * FROM fishing WHERE discord_id = ?', [interaction.user.id], true);
      }

      const parsedFishInventory = parseFishInventory(fishermanRow.inventory);
      if (Object.keys(parsedFishInventory.regular).length > 24) {
        return denyInteraction('Your fish bucket is too heavy! You need to sell or smoke some fish before you can catch more. -# "How d\'you expect me to carry all these back home?"');
      }

      let pond = interaction.options.getString('pond');
      if (!pond) {
        pond = getHighestAvailablePond(fishermanRow.xp);
      }
      const pondConfig = fishData[pond];
      if (fishermanRow.xp < pondConfig.xpRequired) {
        return denyInteraction(`❌ You need some more experience before fishing in ${pondConfig.name} (${fishermanRow.xp}/${pondConfig.xpRequired})\n-# "I'm not sure I can handle these fish yet."`);
      }

      if (fishermanRow.smoker) {
        const randomEvent = checkForRandomEvent('smokerUnattended');
        if (randomEvent) {
          switch (randomEvent) {
            case 'smokerFire':
              interaction.client.log(`Smoker fire event triggered for user ${interaction.member.displayName} (${interaction.user.id})`, 'INFO');

              randomEventContainer = new ContainerBuilder()
                .setAccentColor(resolveColor('DarkRed'))
                .addSectionComponents(
                  new SectionBuilder()
                    .addTextDisplayComponents([
                      new TextDisplayBuilder().setContent(`# 🔥 ${interaction.member.displayName}'s Smoker Caught Fire!`),
                      new TextDisplayBuilder().setContent(`${interaction.member.displayName} took a chance and went fishing while their smoker was running. Unfortunately, their smoker caught fire and all of their fish were lost!`),
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
              interaction.client.log(`Random event '${randomEvent}' has not been setup in fish.js`, 'WARN');
              break;
          }
        }
      }
      if (randomEventContainer) {
        endEvent(interaction.user.id, 'fishing');
        return interaction.reply({ components: [randomEventContainer], flags: MessageFlags.IsComponentsV2 });
      }

      await queryDB(griggyDatabaseDir, 'UPDATE fishing SET last_fish_time = ? WHERE discord_id = ?', [currentTime, interaction.user.id]);

      await interaction.reply(`🎣 ${playerName} cast their line. ${getRandomMessage("cast")}`);
      const fishingRod = fishermanRow.selected_rod;
      const fishingRodInfo = fishingRodData[fishingRod];

      const baseCatchTime = Math.floor(Math.random() * (30 - 15 + 1) + 15) * 1000;
      const catchTime = Math.floor(baseCatchTime / fishingRodInfo.catchSpeed);
      const hookTime = fishingRodInfo.hookTime * 3000;

      setTimeout(async () => {
        try {
          const checkSmokerStartWhileFishing = await queryDB(griggyDatabaseDir, 'SELECT smoker FROM fishing WHERE discord_id = ?', [interaction.user.id], true);
          if (checkSmokerStartWhileFishing.smoker && !fishermanRow.smoker) return denyInteraction(`🛶 ${playerName} stopped fishing and decided to fire up the smoker.\n-# "I can\'t take it anymore, I\'m starvin'!"`);

          const catchEventData = {
            caughtFish: null,
            xpGained: 0,
            doubleCatch: false,
            randomEvent: null,
            caught: false,
          };
          catchEventData.caughtFish = getRandomFish(pond);
          catchEventData.xpGained = catchEventData.caughtFish.xp * (fishermanRow.prestige_level + 1);
          catchEventData.doubleCatch = Math.random() < fishingRodInfo.doubleCatchChance;
          catchEventData.randomEvent = checkForRandomEvent('fishing');

          await interaction.editReply({
            content: `🎣 ${interaction.member}, you've got a bite! ${getRandomMessage("hook")}`,
            components: [fishingMinigameActionRow],
          });

          const filter = (buttonInteraction) => buttonInteraction.customId === `catch:${interaction.user.id}`;
          const collector = interaction.channel.createMessageComponentCollector({ filter, time: hookTime, max: 1 });

          catchEventData.caught = false;

          collector.on('collect', async (buttonInteraction) => {
            await buttonInteraction.deferUpdate();
            catchEventData.caught = true;
            collector.stop('caught');

            await handlePlayerCatchEvent(interaction, playerName, fishingRodInfo, catchEventData, pondConfig);
          });
          collector.on('end', async (collected, reason) => {
            if (reason === 'caught') {
              endEvent(interaction.user.id, 'fishing');
              return;
            } else {
              endEvent(interaction.user.id, 'fishing');
              return interaction.editReply({
                content: `🎣 ${playerName}, you lost the fish!`,
                components: [],
              });
            }
          });
        } catch (err) {
          interaction.client.log('Error during fishing minigame:', 'ERROR', err);
          return denyInteraction('The fish aren\'t bitin\' today. Come back later. ||This is an error, please report it to an admin.||');
        }
      }, catchTime);
    } catch (err) {
      interaction.client.log('Error in /fish command:', 'ERROR', err);
      return denyInteraction('The fish aren\'t bitin\' today. Come back later. ||This is an error, please report it to an admin.||');
    }
  },
};