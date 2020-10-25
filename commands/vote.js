module.exports = {
	name: 'vote',
	description: 'TLC Voting',
	execute(message, args) {
		const Discord = require("discord.js");
    //somehow connect votifier API so send embeds when players vote
    const embed = new MessageEmbed().setTitle('The Legend Continues | Vote')
      .setColor(0x000080)
      .setDescription('1. [MCCommunity](https://mccommunity.net/server/170-The+Legend+Continues/vote/) \n2. [MC-Servers](https://mc-servers.com/mcvote/1861/) \n3. [PlanetMinecraft](https://www.planetminecraft.com/server/the-legend-continues-2156356/vote/) \n4. [Minecraft Servers](https://minecraftservers.org/vote/61902) \n5. [Minecraft Tracker](https://minecraft-tracker.com/server/6031/vote/) \n6. [Minecraft List](https://minecraftlist.org/vote/8023) \n7. [Minecraft Server](https://minecraft-server.net/vote/tlc/) \n8. [Minecraft Server List](https://minecraft-server-list.com/server/143949/vote/) \n9. [ServerPact](https://www.serverpact.com/vote-38511) \n10. [Minecraft MP](https://minecraft-mp.com/server/35196/vote/)')
      .setURL('https://thelegendcontinues.org/index.php?route=/vote/')
      .setFooter('Run `/vote shop` in-game')
      .setTimestamp()
      .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png');
    message.channel.send(embed);
  }
};
