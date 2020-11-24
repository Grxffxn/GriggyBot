const Discord = require('discord.js');
const { Client, MessageEmbed } = require('discord.js');
const { createConnection } = require('mysql');
const mysql = require('mysql');

const database = mysql.createPool({
  connectionLimit: 10,
  host: "127.0.0.1",
  user: "minecraft",
  password: "HydraBadgers",
  database: "tlc_custom",
  post: "3306",
});

module.exports = {
	name: 'rank',
	description: 'TLC Rank information',
//	args: true,
//	usage: '<example>'
	execute(message, args) {
    var detailLink = mysql.format("SELECT points,actionPoints,timePoints,travelPoints,fightPoints,playerName,playerUUID FROM players_rankPoints WHERE playerName = ?", [args[1]]);
    const embed = new MessageEmbed().setTitle('The Legend Continues | Ranks')
      .setColor(0x000080)
      .setDescription('**Rank Commands**\n\n`rank` - bring up this great menu!\n`rank detail` - view your rank stats\n`rank next` - advance to the next rank!\n`rank leaderboard` - view the rank score leaderboard!')
      .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png');
    if(args[0] === 'detail') {
			if(!args[1]) return message.reply('you must specify a username.');
			database.getConnection(function(err, database) {
				if(err) throw err;
				database.query(detailLink,
				function(err, result, fields) {
				const detailUser = (result[0].playerName).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const detailPoints = (result[0].points).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const detailAction = (result[0].actionPoints).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const detailTime = (result[0].timePoints).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const detailTravel = (result[0].travelPoints).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const detailFight = (result[0].fightPoints).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const playerIcon = (result[0].playerUUID).toString().replace(/-/g, "");
				if(err) throw err;
				var rdcustom = new MessageEmbed().setTitle(`${detailUser}`)
            .setColor(0x000080)
            .setDescription(`**Total Points:** ${detailPoints}\n\n**Score Breakdown**\nAction: ${detailAction}pts\nTime Played: ${detailTime}pts\nTravel: ${detailTravel}pts\nFighting: ${detailFight}pts`)
			.setThumbnail(`https://crafatar.com/avatars/${playerIcon}`);
				database.destroy;
				if(err) throw err;
				return message.reply(`here's the score breakdown for player ${detailUser}.`,rdcustom);
			});
		});
    } else if(args[0] === 'next') {
      return message.reply('This command is not ready yet.\nIssued command: `$rank next`');
    } else if(args[0] === 'leaderboard') {
		database.getConnection(function(err, database) {
			database.query("SELECT `playerName`, `points` FROM `players_rankPoints` ORDER BY `points` DESC LIMIT 10", function(err, result, fields) {
				const spot1 = result[0].playerName;
				const points1 = (result[0].points).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const spot2 = result[1].playerName;
				const points2 = (result[1].points).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const spot3 = result[2].playerName;
				const points3 = (result[2].points).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const spot4 = result[3].playerName;
				const points4 = (result[3].points).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const spot5 = result[4].playerName;
				const points5 = (result[4].points).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const spot6 = result[5].playerName;
				const points6 = (result[5].points).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const spot7 = result[6].playerName;
				const points7 = (result[6].points).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const spot8 = result[7].playerName;
				const points8 = (result[7].points).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const spot9 = result[8].playerName;
				const points9 = (result[8].points).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const spot10 = result[9].playerName;
				const points10 = (result[9].points).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				var leaderboardEmbed = new MessageEmbed().setTitle(`TLC | Leaderboard`)
            .setColor(0x000080)
            .setDescription(`**1.** ${spot1} - ${points1}\n**2.** ${spot2} - ${points2}\n**3.** ${spot3} - ${points3}\n**4.** ${spot4} - ${points4}\n**5.** ${spot5} - ${points5}\n**6.** ${spot6} - ${points6}\n**7.** ${spot7} - ${points7}\n**8.** ${spot8} - ${points8}\n**9.** ${spot9} - ${points9}\n**10.** ${spot10} - ${points10}\n`)
            .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png');
				database.release;
				if(err) throw err;
				return message.reply(leaderboardEmbed);
			});
		});
    } else {
      message.channel.send(embed);
    }
  }
}