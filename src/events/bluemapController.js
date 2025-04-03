const config = require('../config.js');
const fs = require('fs');

function getServerData() {
    try {
        const data = fs.readFileSync('./src/serverData.json');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading server data:', error);
        return null;
    }
}

async function BluemapController(client) {
    if (!config.enableBluemapController) {
        return;
    }

    const serverData = getServerData();

    try {
        const MAX_PLAYER_COUNT = 7;
        const numberOnline = serverData.numberOnline;
        // Disable Bluemap rendering if > 7 players online
        const renderingStatus = serverData.bmapStatus;
        const consoleChannel = client.channels.cache.get('766095682741862431');

        if (numberOnline >= MAX_PLAYER_COUNT && renderingStatus == 'on') {
            // Stop BlueMap rendering if player count is 7 or more and rendering is active
            await consoleChannel.send('bluemap stop');
        } else if (numberOnline < MAX_PLAYER_COUNT && renderingStatus == 'off') {
            // Start BlueMap rendering if player count is less than 7 and rendering is inactive
            await consoleChannel.send('bluemap start');
        }
    } catch (error) {
        console.error('Error controlling BlueMap:', error);
    }
}

module.exports = BluemapController;