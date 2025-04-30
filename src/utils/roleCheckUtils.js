const { getConfig } = require('../utils/configUtils.js');

function checkLinked(member) {
    const linkedRole = member.guild.roles.cache.find(role => role.name === 'Linked');
    return member.roles.cache.has(linkedRole.id);
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

module.exports = { checkLinked, checkStaff };