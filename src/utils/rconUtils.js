const config = require('../config.js');
const { Rcon } = require('rcon-client');

const rcon = new Rcon({
    host: config.rconIp,
    port: config.rconPort,
    password: config.rconPwd
});

let botClient;

async function initializeRCONUtils(client) {
    botClient = client;
}

async function startRCON() {
    try {
        await rcon.connect();
        console.log(`RCON Authenticated: ${rcon.authenticated}`);

        // HEARTBEAT
        setInterval(async () => {
            try {
                await rcon.send('list');
            } catch (error) {
                console.error('RCON heartbeat failed:', error);
            }
        }, 4 * 60 * 1000);
    } catch (error) {
        console.error('Error connecting to RCON:', error);
    }
}

async function sendMCCommand(command) {
    try {
        const response = await rcon.send(command);
        return response;
    } catch (error) {
        console.error(`Error sending command: ${command}`);
    }
}

async function logRCON(command, response) {
    try {
        const thread = await botClient.channels.fetch(config.rconLogThreadId);
        if (!thread || !thread.isThread()) {
            console.error('The RCON log thread ID defined in config.js is invalid :(');
            return;
        }

        const formattedLogMsg = `\`\`\`ansi\n\u001b[2;34m>\u001b[0m \u001b[2;33m${command}\u001b[0m\n\u001b[2;34m↪\u001b[0m \u001b[2;32m${response}\u001b[0m\n\`\`\``
        thread.send(formattedLogMsg);
    } catch (error) {
        console.error('Error logging RCON response:', error);
    }
}

async function closeRCON() {
    rcon.end();
}

module.exports = { initializeRCONUtils, startRCON, sendMCCommand, logRCON, closeRCON }