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
        await attemptReconnection();
    }

    // Listen for connection loss
    rcon.on('end', async () => {
        console.warn('RCON connection ended. Attempting to reconnect...');
        await attemptReconnection();
    });

    rcon.on('error', async (error) => {
        console.error('RCON connection error:', error);
        await attemptReconnection();
    });
}

async function attemptReconnection() {
    let connected = false;

    do {
        try {
            console.log('Attempting to reconnect to RCON...');
            await rcon.connect();
            connected = rcon.authenticated;

            if (connected) {
                console.log('RCON reconnected successfully.');
            }
        } catch (error) {
            console.error('Reconnection attempt failed:', error);
        }

        if (!connected) {
            console.log('Retrying in 30 seconds...');
            await new Promise((resolve) => setTimeout(resolve, 30 * 1000));
        }
    } while (!connected);
}

async function sendMCCommand(command) {
    try {
        const response = await rcon.send(command);
        return response;
    } catch (error) {
        console.error(`Error sending command: ${command}`, error.message);
        throw error;
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

async function logRCONError(command) {
    try {
        const thread = await botClient.channels.fetch(config.rconLogThreadId);
        if (!thread || !thread.isThread()) {
            console.error('The RCON log thread ID defined in config.js is invalid :(');
            return;
        }

        const formattedErrorMsg = `<:tlcerror:1350727115015716865> The following command failed because GriggyBot couldn't reach TLC\n\`\`\`ansi\n\u001b[2;31m${command}\u001b[0m\n\`\`\``;
        thread.send(formattedErrorMsg);
    } catch (error) {
        console.error('Error logging error message... How ironic', error);
    }
}

async function closeRCON() {
    rcon.end();
}

module.exports = { initializeRCONUtils, startRCON, sendMCCommand, logRCON, logRCONError, closeRCON }