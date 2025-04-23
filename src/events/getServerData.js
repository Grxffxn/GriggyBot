const fs = require('fs');
const { sendMCCommand } = require('../utils/rconUtils.js');

async function UpdateServerData() {
    try {

        // Fetch data via RCON
        const numberOnline = await sendMCCommand('papi parse --null %cmi_server_online%');
        const sanitizedNumberOnline = numberOnline.replace(/\n/g, '').trim();

        const serverVersion = await sendMCCommand('papi parse --null %server_version%');
        const sanitizedServerVersion = serverVersion.replace(/\n/g, '').trim();

        const tpsRaw = await sendMCCommand('papi parse --null %cmi_tps_300%');
        const tps = tpsRaw.replace(/\n/g, '').trim();

        const restartScheduleRaw = await sendMCCommand('papi parse --null %cmi_schedule_nextin_StopServer%');
        const restartScheduleSanitized = restartScheduleRaw
            .replace(/§(?:[0-9a-fr]|x(?:§[0-9a-f]){6})/g, '')
            .replace(/\n/g, '')
            .trim();

        const formattedSchedule = formatRestartSchedule(restartScheduleSanitized);

        // New server data
        const newServerData = {
            online: true,
            numberOnline: sanitizedNumberOnline,
            serverVersion: sanitizedServerVersion,
            tps,
            restartSchedule: formattedSchedule
        };

        // Read existing serverData.json
        let existingData = {};
        try {
            const rawData = fs.readFileSync('./src/serverData.json', 'utf8');
            existingData = JSON.parse(rawData);
        } catch (err) {
            console.warn('No existing serverData.json found, creating a new one.');
        }

        // Merge existing data with new data
        const mergedData = { ...existingData, ...newServerData };

        // Write merged data to serverData.json
        fs.writeFileSync('./src/serverData.json', JSON.stringify(mergedData, null, 4));

    } catch (error) {
        console.error('Error updating server data:', error);

        // Preserve existing data but mark the server as offline
        let existingData = {};
        try {
            const rawData = fs.readFileSync('./src/serverData.json', 'utf8');
            existingData = JSON.parse(rawData);
        } catch (err) {
            console.warn('No existing serverData.json found, creating a new one.');
        }

        const offlineData = { ...existingData, online: false };

        fs.writeFileSync('./src/serverData.json', JSON.stringify(offlineData, null, 4));
    }
}

function formatRestartSchedule(restartScheduleSanitized) {
    const parts = restartScheduleSanitized.split(' ');
    const hours = parts.includes('hours') ? parts[parts.indexOf('hours') - 1] : '0';
    const minutes = parts.includes('min') ? parts[parts.indexOf('min') - 1] : '0';
    return `${hours}h${minutes}m`;
}

module.exports = UpdateServerData;