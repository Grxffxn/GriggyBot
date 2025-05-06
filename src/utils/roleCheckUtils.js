const { getConfig } = require('./configUtils.js');
const { queryDB } = require('./databaseUtils.js');

function checkLinked(member) {
    const config = getConfig();
    const griggyDatabaseDir = config.griggyDbPath;
    const userRow = queryDB(griggyDatabaseDir, 'SELECT * FROM users WHERE discord_id = ?', [member.id], true);
    if (userRow) {
        return true;
    } else {
        return false;
    }
}

function checkMom(member) {
    const config = getConfig();
    const momRole = member.guild.roles.cache.get(config.approverRoleId);
    if (momRole) {
        return member.roles.cache.has(momRole.id);
    } else {
        return false;
    }
}

function checkStaff(member, staffRoles = []) {
    const config = getConfig();
    if (!staffRoles.length) {
        staffRoles = config.staffRoleIds
            .map(roleId => member.guild.roles.cache.get(roleId))
            .filter(role => role !== undefined);
    }

    return staffRoles.some(role => member.roles.cache.has(role.id));
}

function checkAdmin(member) {
    const config = getConfig();
    adminRoles = config.adminRoleIds
        .map(roleId => member.guild.roles.cache.get(roleId))
        .filter(role => role !== undefined);
    
    return adminRoles.some(role => member.roles.cache.has(role.id)) || member.user.id === config.botOwner;
}

module.exports = { checkLinked, checkMom, checkStaff, checkAdmin };