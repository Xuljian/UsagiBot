const fs = require('fs');

const dumpFilePath = 'C:\\Data\\UsagiBotDump\\dump.txt';

const restActions = require('./rest-actions');
const { USAGI_CONSTANT } = require('./usagi.constants');

var hasChanges = true;

var realTimeRepository = {
    guilds: {},
    users: {},
    channels: {},
    bots: {},
    hasInit: false,
    fileInit: false,
    channelIgnore: [],
    emojiChannel: []
}

var registerUsersFromGuilds = function () {
    if (Object.keys(realTimeRepository.guilds).length > 0) {
        let guilds = realTimeRepository.guilds;
        for (var key in guilds) {
            if (Object.prototype.hasOwnProperty.call(guilds, key)) {
                if (guilds[key] != null && guilds[key].members != null) {
                    guilds[key].members.forEach((o) => {
                        if (o.user != null) {
                            let user = o.user;
                            if (realTimeRepository.users[user.id] == null) {
                                if (user.bot) {
                                    realTimeRepository.bots[user.id] = user;
                                } else {
                                    realTimeRepository.users[user.id] = user;
                                }
                            }
                        }
                    });
                }
                if (guilds[key] != null && guilds[key].channels != null) {
                    guilds[key].channels.forEach((o) => {
                        if (realTimeRepository.channels[o.id] == null) {
                            realTimeRepository.channels[o.id] = o;
                        }
                    });
                }
            }
        }
    }
}

var prettyPrintData = function () {
    return JSON.stringify(realTimeRepository, null, 4);
}

exports.getGuildName = function (id) {
    return realTimeRepository.guilds[id]?.name;
}

exports.userAllowKick = function (guildId, executorId) {
    let guilds = realTimeRepository.guilds;
    let happeningGuild = guilds[guildId];
    if (happeningGuild == null) {
        return false;
    }

    if (happeningGuild.members == null || happeningGuild.members.length == 0) {
        return false;
    }

    let result = false;
    let roles = [];
    happeningGuild.members.forEach((o) => {
        if (roles.length == 0 && o.user != null && o.user.id == executorId) {
            roles = o.roles;
        }
    });

    if (roles != null && roles.length > 0) {
        if (happeningGuild.roles != null && happeningGuild.roles.length > 0) {
            happeningGuild.roles.forEach((i) => {
                if (!result) {
                    roles.forEach((a) => {
                        if (!result && i.id == a) {
                            let permissionBit = USAGI_CONSTANT.PERMISSIONS.ADMINISTRATOR + USAGI_CONSTANT.PERMISSIONS.KICK_MEMBERS;
                            if ((permissionBit & i.permissions) > 0) {
                                result = true;
                            }
                        }
                    })
                }
            });
        }
    }
    return result;
}

var updateGuilds = function () {
    let guilds = realTimeRepository.guilds;
    for (var key in guilds) {
        if (Object.prototype.hasOwnProperty.call(guilds, key)) {
            if (guilds[key] != null) {
                restActions.refreshGuildDetails(key, (data) => {
                    guilds[data.id] = data;
                    restActions.refreshGuildMembers(data.id, (subData, callbackParams) => {
                        guilds[callbackParams].members = subData;
                        restActions.refreshGuildChannels(callbackParams, (subSubData, callbackParams) => {
                            guilds[callbackParams].channels = subSubData;
                            hasChanges = true;
                        })
                    })
                })
            }
        }
    }
}

var exportToFile = function () {
    if (hasChanges) {
        fs.writeFile(dumpFilePath, prettyPrintData(), 'utf8', (a, b) => {
            if (a) {
                console.log(a);
                return;
            }
        })
        hasChanges = false;
    }
}

var importFromFile = function () {
    fs.readFile(dumpFilePath, 'utf8', (a, b) => {
        if (a) {
            console.log(a);
            realTimeRepository.fileInit = true;
            return;
        }
        let repo = JSON.parse(b);
        realTimeRepository.bots = repo.bots;
        realTimeRepository.guilds = repo.guilds;
        realTimeRepository.channels = repo.channels;
        realTimeRepository.users = repo.users;
        realTimeRepository.channelIgnore = repo.channelIgnore;
        realTimeRepository.emojiChannel = repo.emojiChannel || [];
        realTimeRepository.fileInit = true;
    })
}
importFromFile();

setInterval(registerUsersFromGuilds, 1000);
setInterval(updateGuilds, 10000);
setInterval(exportToFile, 1000);

exports.realTimeRepository = realTimeRepository;
