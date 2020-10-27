const Discord = require('discord.js');
const { Client, MessageEmbed } = require('discord.js');
const { createConnection } = require('mysql');

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
    const embed = new MessageEmbed().setTitle('The Legend Continues | Ranks')
      .setColor(0x000080)
      .setDescription('**Rank Commands**\n\n`rank` - bring up this great menu!\n`rank detail` - view your rank stats\n`rank next` - advance to the next rank!\n`rank leaderboard` - view the rank score leaderboard!')
      .setThumbnail('https://i.ibb.co/s5dY0bj/tlclogo.png');
    if(args[0] === 'detail') {
			const detailArg = `${args[1]}`;
			if(!args.length > 1) return message.reply('For now, you must specify a username.');
			database.query('SELECT `points` `actionPoints` `timePoints` `travelPoints` `fightPoints` `playerName` FROM `players_rankPoints` WHERE `playerName` LIKE ??', [detailArg],
			function(err, result, fields) {
				const detailUser = result.playerName;
				const detailPoints = result.points;
				const detailAction = result.actionPoints;
				const detailTime = result.timePoints;
				const detailTravel = result.travelPoints;
				const detailFight = result.fightPoints;
				if(err) throw err;
				message.channel.send(`ARGS: ${args[1]} USERNAME: ${detailUser}, POINTS: ${detailPoints}, ACTION PTS: ${detailAction}, TIME PTS: ${detailTime}, TRAVEL PTS: ${detailTravel}, FIGHT PTS: ${detailFight}`);
				//const pts =
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
};
