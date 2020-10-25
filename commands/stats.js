module.exports = {
	name: 'stats',
	description: 'TLC Server Stats',
	execute(message, args) {
    //more with this later i hope
		const Discord = require("discord.js");
    const embed = new MessageEmbed().setTitle('The Legend Continues | Stats')
      .setColor(0x000080)
      .setDescription('Click [here](https://thelegendcontinues.org/index.php?route=/stats/) (or the blue title)\n\nView server & player stats online.\n- Online Players\n- Active Players\n- Top Online Time\n- Top Rank Scores')
      .setFooter('Stats created & updated by @Nathanacus#0506')
      .setURL('https://thelegendcontinues.org/index.php?route=/stats/')
      .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png');
    message.channel.send(embed);
  }
};
