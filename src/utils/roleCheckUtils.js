function checkLinked(member) {
    const linkedRole = member.guild.roles.cache.find(role => role.name === 'Linked');
    return member.roles.cache.has(linkedRole.id);
}

function checkStaff(member, staffRoles) {
    return staffRoles.some(role => member.roles.cache.has(role.id));
}

module.exports = { checkLinked, checkStaff };