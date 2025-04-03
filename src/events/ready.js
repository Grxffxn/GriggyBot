const { ActivityType, Events } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const UpdateServerData = require('./getServerData.js');
const AutoMsg = require('./automsg.js');
const UpdateImage = require('./updateImage.js');
const BluemapController = require('./bluemapController.js');
const config = require('../config.js');

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
		const activities = ['Developed by Griggy', `${client.user.username}`, 'Need /help ?', 'mc.thelegendcontinues.info', 'The Legend Continues'];
		let nowActivity = 0;
		function botPresence() {
			client.user.presence.set({ activities: [{ name: `${activities[nowActivity++ % activities.length]}`, type: ActivityType.Custom }], status: 'online' });
			setTimeout(botPresence, 300000);
		}
		botPresence();

		client.log(`${client.user.username} signed in as ${client.user.tag}!`);

		UpdateServerData(client);
		setInterval(() => {
			UpdateServerData(client);
		}, 600000);

		UpdateImage(client);
		setInterval(() => {
			UpdateImage(client);
		}, 600000);

		BluemapController(client);
		setInterval(() => {
			BluemapController(client);
		}, 600000);

		setInterval(() => {
			AutoMsg(client);
		}, config.automsgdelay);

		try {
			await (async () => {
				await rest.put(Routes.applicationCommands(client.user.id), {
					body: client.slashdatas,
				});
			})();
		} catch (error) {
			console.error(error);
		}
	},
};