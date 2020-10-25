module.exports = {
	name: 'rank',
	description: 'TLC Rank information',
	execute(message, args) {
		const Discord = require("discord.js");
    const embed = new MessageEmbed().setTitle('The Legend Continues | Ranks')
      .setColor(0x000080)
      .setDescription('**Rank Commands**\n\n`rank` - bring up this great menu!\n`rank detail` - view your rank stats\n`rank next` - advance to the next rank!\n`rank leaderboard` - view the rank score leaderboard!')
      .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png');
    if(!args.length) {
      return message.channel.send(embed);
    } else if(args[0] === 'detail') {
      return message.reply('This command is not ready yet.\nIssued command: `$rank detail`');
    } else if(args[0] === 'next') {
      return message.reply('This command is not ready yet.\nIssued command: `$rank next`');
    } else if(args[0] === 'leaderboard') {
      return message.reply('This command is not ready yet.\nIssued command: `$rank leaderboard`');
    } else {
      const embed = new MessageEmbed().setTitle('The Legend Continues | Help')
        .setColor(0x000080)
        .setDescription('Use the prefix `$` to interact with this bot\n\n**Shortcuts**\n`site` - links directly to TLCs website\n`vote` - list all voting sites\n`dynmap` - view the live map\n`forum` - link directly to our forums\n`stats` - view server & website stats\n`help` - view this message again (why not?)\n\n**Fun Commands**\n`notstaff` - see who is NOT TLC staff\n`karrrot` - personal message from Karrrot')
        .setFooter('Bot created by @Grxffxn#6666 | $donate')
        .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png');
      message.channel.send(embed);
    }
  }
};
