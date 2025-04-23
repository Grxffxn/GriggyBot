const { sendMCCommand } = require('../utils/rconUtils.js');
const { parseServerData, updateServerData } = require('../utils/serverDataUtils.js');

function formatRestartSchedule(restartScheduleSanitized) {
    const parts = restartScheduleSanitized.split(' ');
    const hours = parts.includes('hours') ? parts[parts.indexOf('hours') - 1] : '0';
    const minutes = parts.includes('min') ? parts[parts.indexOf('min') - 1] : '0';
    return `${hours}h${minutes}m`;
}

async function getServerData() {
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

        // Update server data
        updateServerData('online', true);
        updateServerData('numberOnline', sanitizedNumberOnline);
        updateServerData('serverVersion', sanitizedServerVersion);
        updateServerData('tps', tps);
        updateServerData('restartSchedule', formattedSchedule);

    } catch (error) {
        console.error('Error updating server data:', error);

        // Preserve existing data but mark the server as offline
        try {
            updateServerData('online', false);
        } catch (err) {
            console.warn('Failed to mark server as offline. Ensure serverData.json exists.');
        }
    }
}

module.exports = getServerData;