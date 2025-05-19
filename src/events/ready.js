const { ActivityType, Events } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const getServerData = require('./getServerData.js');
const AutoMsg = require('./automsg.js');
const UpdateImage = require('./updateImage.js');
const AutoProfile = require('./autoprofile.js');
const firstRun = require('./firstRun.js');
const chores = require('./chores.js');
const { checkSmoker } = require('./checkSmoker.js');
const { resetAllDailyEarnings } = require('../utils/fishingUtils.js');
const cron = require('node-cron');
const { initializeRCONUtils, startRCON } = require('../utils/rconUtils.js');

const {
	DefaultWebSocketManagerOptions: {
		identifyProperties,
	},
} = require('@discordjs/ws');

identifyProperties.browser = 'Discord iOS';

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute: async (client) => {
		const rest = new REST({ version: '10' }).setToken(client.token);

		await firstRun(client);
		const config = client.config;

		// Filter disabled features before registering slash commands
		const enabledSlashCommands = client.slashdatas.filter(cmd => {
			const featureName = `enable${cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1)}`;
			return config[featureName] !== false;
		});

		try {
			await (async () => {
				await rest.put(Routes.applicationCommands(client.user.id), {
					body: enabledSlashCommands,
				});
			})();
		} catch (err) {
			client.log('Error registering slash commands:', 'ERROR', err);
		}

		const activities = ['Developed by Griggy', `${client.user.username}`, 'Need /help ?', `${config.serverIp}`, `${config.serverName}`];
		let nowActivity = 0;
		function botPresence() {
			client.user.presence.set({ activities: [{ name: `${activities[nowActivity++ % activities.length]}`, type: ActivityType.Custom }], status: 'online' });
			setTimeout(botPresence, 300000);
		}
		botPresence();

		client.log(`${client.user.username} signed in as ${client.user.tag}! I\'m alive!`);

		initializeRCONUtils(client);
		await startRCON();

		await getServerData(client);
		if (config.enableUpdatingImage) await UpdateImage(client);
		setInterval(async () => {
			await getServerData(client);
			if (config.enableUpdatingImage) await UpdateImage(client);
		}, 600000);

    if (config.enableFishing) {
      setInterval(() => {
        checkSmoker(client);
      }, 180000);
    }

    if (config.enableFishing) {
      cron.schedule('0 0 * * *', () => {
        resetAllDailyEarnings(client.config.griggyDbPath);
      });
    }

		cron.schedule('30 4 * * *', () => {
			getServerData(client);
		});

		if (config.enableChore) {
			cron.schedule('0 9 * * *', () => {
				chores(client);
			});
		}

		if (config.enableAutoMsg) {
			cron.schedule('0 0,6,12,18 * * *', () => {
        AutoMsg(client);
      });
		}

		AutoProfile(client);
		setInterval(() => {
			AutoProfile(client);
		}, 180000);
	},
};