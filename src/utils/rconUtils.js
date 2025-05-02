const { getConfig } = require('../utils/configUtils');
const { convertMinecraftToANSI } = require('../utils/formattingUtils');
const { Rcon } = require('rcon-client');

let config;
let rcon;
let botClient;

async function initializeRCONUtils(client) {
    botClient = client;
    config = getConfig();
    rcon = new Rcon({
        host: config.rconIp,
        port: config.rconPort,
        password: config.rconPwd
    });
}

async function startRCON() {
    try {
        await rcon.connect();
        botClient.log(`RCON Authenticated: ${rcon.authenticated}`, 'SUCCESS');

        // HEARTBEAT
        setInterval(async () => {
            try {
                await rcon.send('list');
            } catch (err) {
                botClient.log('RCON heartbeat failed:', 'ERROR', err);
            }
        }, 4 * 60 * 1000);
    } catch (err) {
        botClient.log('Error connecting to RCON:', 'ERROR', err);
        await attemptReconnection();
    }

    // Listen for connection loss
    rcon.on('end', async () => {
        botClient.log('RCON connection ended. Attempting to reconnect...', 'WARN');
        await attemptReconnection();
    });

    rcon.on('error', async (err) => {
        botClient.log('RCON connection error:', 'ERROR', err);
        await attemptReconnection();
    });
}

async function attemptReconnection() {
    let connected = false;

    do {
        try {
            botClient.log('Attempting to reconnect to RCON...');
            await rcon.connect();
            connected = rcon.authenticated;

            if (connected) {
                botClient.log('RCON reconnected successfully.', 'SUCCESS');
            }
        } catch (err) {
            botClient.log('Reconnection attempt failed:', 'ERROR', err);
        }

        if (!connected) {
            botClient.log('Retrying in 30 seconds...');
            await new Promise((resolve) => setTimeout(resolve, 30 * 1000));
        }
    } while (!connected);
}

async function sendMCCommand(command) {
    try {
        const response = await rcon.send(command);
        if (!response || response.trim() === '') {
            botClient.log(`RCON command "${command}" returned an empty response.`, 'WARN');
            return 'No response from server.';
        }
        return response;
    } catch (err) {
        botClient.log(`Error sending command: ${command}`, 'ERROR', err);
        throw err;
    }
}

async function logRCON(command, response) {
    try {
        const thread = await botClient.channels.fetch(config.rconLogThreadId);
        if (!thread || !thread.isThread()) {
            botClient.log('The RCON log thread ID defined in config.js is invalid :( Logging unavailable', 'ERROR');
            return;
        }

        const formattedResponse = convertMinecraftToANSI(response);

        const formattedLogMsg = `\`\`\`ansi\n\u001b[2;34m>\u001b[0m \u001b[2;33m${command}\u001b[0m\n\u001b[2;34m↪\u001b[0m \u001b[2;32m${formattedResponse}\u001b[0m\n\`\`\``
        thread.send(formattedLogMsg);
    } catch (err) {
        botClient.log('Error logging RCON response:', 'ERROR', err);
    }
}

async function logRCONError(command) {
    try {
        const thread = await botClient.channels.fetch(config.rconLogThreadId);
        if (!thread || !thread.isThread()) {
            botClient.log('The RCON log thread ID defined in config.js is invalid :( Logging unavailable', 'ERROR');
            return;
        }

        const formattedErrorMsg = `<:tlcerror:1350727115015716865> The following command failed because GriggyBot couldn't reach TLC\n\`\`\`ansi\n\u001b[2;31m${command}\u001b[0m\n\`\`\``;
        thread.send(formattedErrorMsg);
    } catch (err) {
        botClient.log('Error logging error message... How ironic', 'ERROR', err);
    }
}

async function closeRCON() {
    rcon.end();
}

module.exports = { initializeRCONUtils, startRCON, sendMCCommand, logRCON, logRCONError, closeRCON }