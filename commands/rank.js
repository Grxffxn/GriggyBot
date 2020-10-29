const Discord = require('discord.js');
const { Client, MessageEmbed } = require('discord.js');
const { createConnection } = require('mysql');
const mysql = require('mysql');

const database = createConnection({
  host: "REDACTED",
  user: "REDACTED",
  password: "REDACTED",
  database: "REDACTED",
  post: "3306",
});

module.exports = {
	name: 'rank',
	description: 'TLC Rank information',
//	args: true,
//	usage: '<example>'
	execute(message, args) {
    console.log(args[1]);
    var detailLink = mysql.format("SELECT points,actionPoints,timePoints,travelPoints,fightPoints,playerName FROM players_rankPoints WHERE playerName = ?", [args[1]]);
    const embed = new MessageEmbed().setTitle('The Legend Continues | Ranks')
      .setColor(0x000080)
      .setDescription('**Rank Commands**\n\n`rank` - bring up this great menu!\n`rank detail` - view your rank stats\n`rank next` - advance to the next rank!\n`rank leaderboard` - view the rank score leaderboard!')
      .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png');
    if(args[0] === 'detail') {
			if(!args[1]) return message.reply('you must specify a username.');
			database.query(detailLink,
			function(err, result, fields) {
				const detailUser = (result[0].playerName).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const detailPoints = (result[0].points).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const detailAction = (result[0].actionPoints).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const detailTime = (result[0].timePoints).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const detailTravel = (result[0].travelPoints).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				const detailFight = (result[0].fightPoints).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
				if(err) throw err;
				var rdcustom = new MessageEmbed().setTitle(`${detailUser}`)
            .setColor(0x000080)
            .setDescription(`**Total Points:** ${detailPoints}\n\n**Score Breakdown**\nAction: ${detailAction}pts\nTime Played: ${detailTime}pts\nTravel: ${detailTravel}pts\nFighting: ${detailFight}pts`)
            .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png');
				  return message.reply(`here's the score breakdown for player ${detailUser}.`,rdcustom);
			});
    } else if(args[0] === 'next') {
      return message.reply('This command is not ready yet.\nIssued command: `$rank next`');
    } else if(args[0] === 'leaderboard') {
			database.query("SELECT `playerName`, `points` FROM `players_rankPoints` ORDER BY `points` DESC LIMIT 10", function(err, result, fields) {
				const spot1 = result[0].playerName;
				const points1 = result[0].points;
				message.channel.send(`${spot1} is currently #1! They have ${points1} points.`);
				if(err) throw err;
				console.log(result);
			});
    } else {
      message.channel.send(embed);
    }
  }
}