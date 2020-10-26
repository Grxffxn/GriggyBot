const Discord = require('discord.js');
const { Client, MessageEmbed } = require('discord.js');

module.exports = {
	name: 'rank',
	description: 'TLC Rank information',
//	args: true,
//	usage: '<example>'
	execute(message, args) {
    const embed = new MessageEmbed().setTitle('The Legend Continues | Ranks')
      .setColor(0x000080)
      .setDescription('**Rank Commands**\n\n`rank` - bring up this great menu!\n`rank detail` - view your rank stats\n`rank next` - advance to the next rank!\n`rank leaderboard` - view the rank score leaderboard!')
      .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png');
    if(args[0] === 'detail') {
      return message.reply('This command is not ready yet.\nIssued command: `$rank detail`');
    } else if(args[0] === 'next') {
      return message.reply('This command is not ready yet.\nIssued command: `$rank next`');
    } else if(args[0] === 'leaderboard') {
			//con.query
      return message.reply('This command is not ready yet.\nIssued command: `$rank leaderboard`');
    } else {
      message.channel.send(embed);
    }
  }
};
