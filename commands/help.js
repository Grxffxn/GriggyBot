module.exports = {
	name: 'help',
	description: 'TLC Help',
	execute(message, args) {
		const Discord = require("discord.js");
    const embed = new MessageEmbed().setTitle('The Legend Continues | Help')
      .setColor(0x000080)
      .setDescription('Use the prefix `$` to interact with this bot\n\n**Shortcuts**\n`site` - links directly to TLCs website\n`vote` - list all voting sites\n`dynmap` - view the live map\n`forum` - link directly to our forums\n`stats` - view server & website stats\n`help` - view this message again (why not?)\n\n**Fun Commands**\n`notstaff` - see who is NOT TLC staff\n`karrrot` - personal message from Karrrot')
      .setFooter('Bot created by @Grxffxn#6666 | $donate')
      .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png');
    message.channel.send(embed);
  }
};
