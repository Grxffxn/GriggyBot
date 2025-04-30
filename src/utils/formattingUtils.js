function formatNumber(num) {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

function hyphenateUUID(uuid) {
    return uuid.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

function convertMinecraftToANSI(input) {
    const colorMap = {
        '§0': '\u001b[2;30m', // Gray
        '§1': '\u001b[2;34m', // Light Blue
        '§2': '\u001b[2;32m', // Yellow-green
        '§3': '\u001b[2;36m', // Teal
        '§4': '\u001b[2;31m', // Red
        '§5': '\u001b[2;35m', // Pink
        '§6': '\u001b[2;33m', // Gold
        '§7': '\u001b[2;37m', // White
        '§8': '\u001b[2;30m', // Dark Gray
        '§9': '\u001b[2;34m', // Light Blue
        '§a': '\u001b[2;32m', // Yellow-green
        '§b': '\u001b[2;36m', // Teal
        '§c': '\u001b[2;31m', // Red
        '§d': '\u001b[2;35m', // Pink
        '§e': '\u001b[2;33m', // Gold
        '§f': '\u001b[2;37m', // White
        '§r': '\u001b[0m'    // Reset
    };

    return input.replace(/§[0-9a-fr]/g, match => colorMap[match] || '\u001b[2;37m').replace(/\n/g, '').trim();
}

function stripMinecraftColorCodes(input, ansi) {
    const strippedText = input.replace(/§(?:[0-9a-fr]|x(?:§[0-9a-f]){6})/g, '').replace(/\n/g, '').trim();

    if (ansi) {
        return `\u001b[2;37m${strippedText}\u001b[0m`;
    } else {
        return strippedText;
    }    
}

module.exports = { formatNumber, hyphenateUUID, convertMinecraftToANSI, stripMinecraftColorCodes };