const { SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, ButtonStyle, ButtonBuilder } = require('discord.js');

module.exports = {
  /** 
   * This is where you define the sections for the help menu.
   * There is a max of 3 TextDisplayBuilder components per section.
  */
  fishing_basics: () => new SectionBuilder()
    .addTextDisplayComponents([
      new TextDisplayBuilder().setContent('### Fishing'),
      new TextDisplayBuilder().setContent('To start fishing, use the \`/fish\` command. You will cast your line and need to wait ~20 seconds to get a bite. Once you get a bite, you will need to click the button that appears to reel in your catch. With each fish you catch, you will be rewarded with XP and occasionally a treasure chest, which you can select a reward from.'),
    ])
    .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Fishing_Rod_JE2_BE2.png' } })),
  fishing_smoker: () => new SectionBuilder()
    .addTextDisplayComponents([
      new TextDisplayBuilder().setContent('### Smoker'),
      new TextDisplayBuilder().setContent('You can smoke your fish to increase their value. This process takes real time, at about 30 minutes per fish, which can be sped up by using herbs. To smoke your fish, use the \`/smoker\` command. You can select the fish to smoke and the herbs to use.'),
    ])
    .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Lit_Smoker_%28S%29_JE2_BE2.gif' } })),
  fishing_rods: () => new SectionBuilder()
    .addTextDisplayComponents([
      new TextDisplayBuilder().setContent('### Fishing Rods'),
      new TextDisplayBuilder().setContent(`You can purchase fishing rods from the \`/fishmarket\`, and each fishing rod provides its own unique buffs. Fishing rods cost in-game currency, and you can swap between rods with the \`/inventory\` command.\n**Tip:** If you're having trouble catching fish, try the 'Sharp Rod' to keep fish hooked longer!`),
    ])
    .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Fishing_Rod_JE2_BE2.png' } })),
  fishing_prestige: () => new SectionBuilder()
    .addTextDisplayComponents([
      new TextDisplayBuilder().setContent('### Prestige'),
      new TextDisplayBuilder().setContent(`Once you reach the max level, you can use the \`/prestige\` command to reset your XP and increase the rate at which you gain XP, as well as increase the base worth of your fish. Be aware that when you prestige, you can only select one type of herb and one fishing rod to keep. All other herbs, fishing rods, and caught fish will be lost.`),
    ])
    .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Hero_of_the_Village_JE1_BE2.png' } })),
  rank_applications: () => new SectionBuilder()
    .addTextDisplayComponents([
      new TextDisplayBuilder().setContent('### Applications'),
      new TextDisplayBuilder().setContent(`You can apply for a rank by using the \`/apply\` command. Once you select a rank, you will be prompted to answer a few questions. After you submit your application, it will be posted to its own thread and will be reviewed by other players and the staff team. If you need to delete an active application, use \`/deleteapplication\`.`),
      new TextDisplayBuilder().setContent(`More information can be found here: [How to Rank Up](https://discord.com/channels/202157448776253441/1346992109491847272/1346999476442628157) | [Requirements & Perks](https://discord.com/channels/202157448776253441/914341625138913310/1352181178526072853)`),
    ])
    .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Jump_Boost_JE2_BE2.png' } })),
  rank_vouches: () => new SectionBuilder()
    .addTextDisplayComponents([
      new TextDisplayBuilder().setContent('### Vouches'),
      new TextDisplayBuilder().setContent(`You can vouch for a player by using the \`/vouch\` command, or pressing the Vouch button on their \`/info\` profile or an active application. This will be visible to other players and the staff team. You can only vouch for players once, and you can't vouch for yourself. Vouches are counted towards your 'Rank Points'. Vouching for a player is a way to voice your support for them and help them rank up.`),
      new TextDisplayBuilder().setContent(`More information can be found here: [How to Rank Up](https://discord.com/channels/202157448776253441/1346992109491847272/1346999476442628157) | [Requirements & Perks](https://discord.com/channels/202157448776253441/914341625138913310/1352181178526072853)`),
    ])
    .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Jump_Boost_JE2_BE2.png' } })),
  rank_points: () => new SectionBuilder()
    .addTextDisplayComponents([
      new TextDisplayBuilder().setContent('### Rank Points'),
      new TextDisplayBuilder().setContent(`You can view your rank points by using the \`/info\` command. This will show you how many points you have, as well as the number of vouches received. You can earn rank points by receiving vouches from other players or reaching certain milestones in-game, like reaching a high level in Jobs or reaching a playtime milestone.`),
      new TextDisplayBuilder().setContent(`More information can be found here: [How to Rank Up](https://discord.com/channels/202157448776253441/1346992109491847272/1346999476442628157) | [Requirements & Perks](https://discord.com/channels/202157448776253441/914341625138913310/1352181178526072853)`),
    ])
    .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Jump_Boost_JE2_BE2.png' } })),
  gambling_basics: () => new SectionBuilder()
    .addTextDisplayComponents([
      new TextDisplayBuilder().setContent('### Gambling'),
      new TextDisplayBuilder().setContent(`You can gamble your in-game currency by using the different gambling commands. This will allow you to bet a certain amount of money and try to win more. The maximum bet is $5,000, and once you win, there will be a cooldown for that specific command. The only exception to the 5k maximum bet is the \`/rps\` rock-paper-scissors command, which has a max bet of $50,000.`),
    ])
    .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Marketplace_Minecoins.png' } })),
  gambling_rps: () => new SectionBuilder()
    .addTextDisplayComponents([
      new TextDisplayBuilder().setContent('### Rock-Paper-Scissors'),
      new TextDisplayBuilder().setContent(`You can challenge another player to a game of Rock-Paper-Scissors by using the \`/rps\` command. You will be prompted to select a wager, and if you win, you will receive the amount of money you wagered. If you lose, you will lose the amount of money you wagered. The maximum wager is $50,000.`),
    ])
    .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Marketplace_Minecoins.png' } })),
  gambling_slots: () => new SectionBuilder()
    .addTextDisplayComponents([
      new TextDisplayBuilder().setContent('### Slots'),
      new TextDisplayBuilder().setContent(`You can play slots by using the \`/slots\` command. If you hit the jackpot, you will win 10x your bet. If you have 2 of a kind, you will win double your bet. The chances of getting two of a kind and hitting the jackpot are 27% and 1% respectively. The maximum bet is $5,000.`),
    ])
    .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Marketplace_Minecoins.png' } })),
  gambling_roulette: () => new SectionBuilder()
    .addTextDisplayComponents([
      new TextDisplayBuilder().setContent('### Roulette'),
      new TextDisplayBuilder().setContent(`You can play roulette by using the \`/roulette\` command. You can bet on a color, a number, or a range of numbers. If you win betting on red or black, you will receive 2x your bet. If you win betting on green (0), you will receive 5x your bet. The maximum bet is $5,000, and the average chance of winning on red/black is about 48%, while the chance of winning on green is about 2.7%.`),
    ])
    .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Marketplace_Minecoins.png' } })),
  gambling_blackjack: () => new SectionBuilder()
    .addTextDisplayComponents([
      new TextDisplayBuilder().setContent('### Blackjack'),
      new TextDisplayBuilder().setContent(`You can play blackjack by using the \`/blackjack\` command. You will be dealt two cards, and you can choose to hit or stand. The goal is to get as close to 21 as possible without going over. If you go over 21, you lose. If the dealer goes over 21, you win. If neither you nor the dealer go over 21, whoever has the highest number wins. The maximum bet is $5,000, and the average chance of winning is about 42%.`),
    ])
    .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: 'https://minecraft.wiki/images/Marketplace_Minecoins.png' } })),
  profile_basics: () => new SectionBuilder()
    .addTextDisplayComponents([
      new TextDisplayBuilder().setContent('### Profile'),
      new TextDisplayBuilder().setContent(`You can view your profile by using the \`/info\` command. This will show you your current rank, playtime, balance, and other information. You can also view other players' profiles by using the \`/info\` command with their username. This profile is shown in your application when you apply for ranks. Your profile can be customized using the \`/profile\` command. For more information and tips on how to customize your profile, navigate through the sections below.`),
    ])
    .setButtonAccessory(new ButtonBuilder()
      .setCustomId('tryMeButton:profile')
      .setLabel('Edit Profile')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎨')),

  profile_color: () => new SectionBuilder()
    .addTextDisplayComponents([
      new TextDisplayBuilder().setContent('### Profile Color'),
      new TextDisplayBuilder().setContent(`You can change your profile color by using the \`/profile\` command. Simply fill out the "color" section of the form. All hex color codes are accepted, like \`#FF0000\` for red. This will change the accent color of your profile.`),
      new TextDisplayBuilder().setContent(`**Not a fan of hex codes?** You can use the following color names instead: \`Default\`, \`White\`, \`Aqua\`, \`Green\`, \`Blue\`, \`Yellow\`, \`Purple\`, \`LuminousVividPink\`, \`Fuchsia\`, \`Gold\`, \`Orange\`, \`Red\`, \`Grey\`, \`Navy\`, \`DarkAqua\`, \`DarkGreen\`, \`DarkBlue\`, \`DarkPurple\`, \`DarkVividPink\`, \`DarkGold\`, \`DarkOrange\`, \`DarkRed\`, \`DarkGrey\`, \`DarkerGrey\`, \`LightGrey\`, \`DarkNavy\`, \`Blurple\`, \`Greyple\`, \`DarkButNotBlack\`, \`NotQuiteBlack\`.\n**Can't decide?** Use \`Random\` for a random color every time.`),
    ])
    .setButtonAccessory(new ButtonBuilder()
      .setCustomId('tryMeButton:profile')
      .setLabel('Edit Profile')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎨')),
  profile_image: () => new SectionBuilder()
    .addTextDisplayComponents([
      new TextDisplayBuilder().setContent('### Profile Image'),
      new TextDisplayBuilder().setContent(`You can change your profile image by using the \`/profile\` command. Simply fill out the "image" section of the form. All image URLs are accepted, like \`https://example.com/image.png\`. This will change the profile image shown in your application and the \`/info\` command. Ensure that the link you provide ends with a filetype like \`.png\`, \`.jpg\`, or \`.gif\` to ensure it displays correctly.`),
    ])
    .setButtonAccessory(new ButtonBuilder()
      .setCustomId('tryMeButton:profile')
      .setLabel('Edit Profile')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎨')),
  profile_description: () => new SectionBuilder()
    .addTextDisplayComponents([
      new TextDisplayBuilder().setContent('### Profile Title & Description'),
      new TextDisplayBuilder().setContent(`You can change your profile title and bio by using the \`/profile\` command. Simply fill out the "description" or "title" sections of the form. This will change the bio and title shown in your application and the \`/info\` command. You can use markdown to format your title and description, like \`**bold**\`, \`*italic*\`, and \`__underline__\`. You can also use emojis by typing their name, like \`:smile:\`. For custom server emojis, use the format \`<:emoji_name:emoji_id>\`. You can get this by typing \`\\:emoji_name:\` in the chat, and Discord will automatically convert it to the correct format.`),
    ])
    .setButtonAccessory(new ButtonBuilder()
      .setCustomId('tryMeButton:profile')
      .setLabel('Edit Profile')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎨')),
};