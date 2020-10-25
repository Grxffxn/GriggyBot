module.exports = {
	name: 'forum',
	description: 'TLC Forums',
	execute(message, args) {
		const Discord = require("discord.js");
    const embed = new MessageEmbed().setTitle('The Legend Continues | Forums')
      .setColor(0x000080)
      .setURL('https://thelegendcontinues.org/index.php?route=/forum/')
      .setDescription('View our discussion threads or create your own!\nView ban appeals, read the latest announcements\nor start a new conversation!')
      .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png');
    message.channel.send(embed);
  }
};
