const restAPIUrl = 'https://discord.com/api/v8';

const usagiConstant = require('./usagi.constants').USAGI_CONSTANT;

const authorId = '154106804413005825';

const realTimeRepository = require('./temp-repository').realTimeRepository;
const repo = require('./temp-repository');

const https = require('https');

const agent = new https.Agent({ keepAlive: true })
const fetch = require('node-fetch');

// objects in this queue looks like the object below
//{
//    hostname: 'whatever.com',
//    port: 443,
//    path: '/todos',
//    method: 'GET',
//    callback: function(data)
//}
const queue = [];

// messageObj
//{
//    userId: 'string',
//    embed: { 
//      title: 'string',
//      description: 'string'
//    },
//    message: 'string'
//}
exports.sendDMById = function (messageObj) {
    var options = {
        url: restAPIUrl + '/users/@me/channels',
        method: 'post',
        body: JSON.stringify({
            recipient_id: messageObj.userId
        }),
        callback: function (data) {
            let subOptions = {
                url: restAPIUrl + `/channels/${data.id}/messages`,
                method: 'post',
                body: JSON.stringify({
                    content: messageObj.message,
                    tts: false,
                    embed: messageObj.embed
                })
            }
            queue.push(subOptions);
        }
    }
    queue.push(options);
}

// messageObj
//{
//    channelId: 'string'
//    embed: { 
//      title: 'string',
//      description: 'string'
//    },
//    message: 'string'
//}
exports.sendMessage = function (messageObj) {
    if (messageObj.channelId == null) {
        console.log('channel id required');
        return;
    }
    let subOptions = {
        url: restAPIUrl + `/channels/${messageObj.channelId}/messages`,
        method: 'post',
        body: JSON.stringify({
            content: messageObj.message,
            tts: false,
            embed: messageObj.embed
        })
    }
    queue.push(subOptions);
}

exports.refreshGuildDetails = function (guildId, callback) {
    let subOptions = {
        url: restAPIUrl + `/guilds/${guildId}`,
        method: 'get',
        callback: callback
    }
    queue.push(subOptions);
}

//{
//    channelId: 'string',
//    messageId: 'string',
//    emoji: 'string'
//}
exports.reactToMessage = function (options) {
    let subOptions = {
        url: restAPIUrl + `/channels/${options.channelId}/messages/${options.messageId}/reactions/${options.emoji}/@me`,
        method: 'put',
        ignoreResult: true
    }
    queue.push(subOptions);
}

exports.refreshGuildMembers = function (guildId, callback) {
    let subOptions = {
        url: restAPIUrl + `/guilds/${guildId}/members?limit=1000`,
        method: 'get',
        callback: callback,
        callbackParams: guildId
    }
    queue.push(subOptions);
}

exports.deleteMessage = function(channelId, messageId) {
    let subOptions = {
        url: restAPIUrl + `/channels/${channelId}/messages/${messageId}`,
        method: 'delete',
        ignoreResult: true
    }
    queue.push(subOptions);
}

exports.registerEmoji = function(options) {
    let subOptions = {
        url: restAPIUrl + `/guilds/${options.guildId}/emojis`,
        method: 'post',
        callback: (data, options) => {
            delete options.image;
            options.callback(data, options)
        },
        callbackParams: options,
        body: JSON.stringify({
            name: options.name,
            image: options.image
        })
    }
    queue.push(subOptions);
}

exports.refreshGuildChannels = function (guildId, callback) {
    let subOptions = {
        url: restAPIUrl + `/guilds/${guildId}/channels`,
        method: 'get',
        callback: callback,
        callbackParams: guildId
    }
    queue.push(subOptions);
}

//{
//    guildId: 'string',
//    userId: 'string',
//    executorId: 'string'
//    channelId: 'string'
//    failedMessage: 'string'
//    successMessage: 'string'
//}
exports.kickUser = function (obj) {
    if (repo.userAllowKick(obj.guildId, obj.executorId)) {
        let subOptions = {
            url: restAPIUrl + `/guilds/${obj.guildId}/members/${obj.userId}`,
            method: 'delete',
            ignoreResult: true,
            callback: () => {
                let subSubOptions = {
                    url: restAPIUrl + `/channels/${obj.channelId}/messages`,
                    method: 'post',
                    body: JSON.stringify({
                        content: obj.successMessage,
                        tts: false
                    })
                }
                queue.push(subSubOptions);
            }
        }
        queue.push(subOptions);
    } else {
        let subOptions = {
            url: restAPIUrl + `/channels/${obj.channelId}/messages`,
            method: 'post',
            body: JSON.stringify({
                content: obj.failedMessage,
                tts: false
            })
        }
        queue.push(subOptions);
    }
}

var findUserId = function (username) {
    let users = realTimeRepository.users;
    let bots = realTimeRepository.bots;
    let found = null;
    for (var key in users) {
        if (found == null && Object.prototype.hasOwnProperty.call(users, key) && users[key] != null && users[key].username.toLowerCase() === username.toLowerCase()) {
            found = key;
        }
    }
    if (found == null) {
        for (var key in bots) {
            if (found == null && Object.prototype.hasOwnProperty.call(bots, key) && bots[key] != null && bots[key].username.toLowerCase() === username.toLowerCase()) {
                found = key;
            }
        }
    }
    if (found == null) {
        console.log('user not found')
    }
    return found;
}

exports.getImage = function(url, callback) {
    fetch(url)
    .then(res => res.buffer())
    .then(buffer => { callback(buffer) });
}

var executeRequest = function () {
    setInterval(() => {
        if (realTimeRepository.hasInit) {
            let options = queue.shift();

            if (options != null) {
                let fetchReq = fetch(options.url, {
                    method: options.method,
                    headers: {
                        'Authorization': `Bot ${usagiConstant.BOT_DATA.BOT_TOKEN}`,
                        'Accept': '*/*',
                        'User-Agent': 'DiscordBot (UsagiBot.com, 0.0.1)',
                        'Content-Type': 'application/json'
                    },
                    body: options.body,
                    agent: agent
                });
                fetchReq.then((o) => {
                    if (o.ok) {
                        if (options.ignoreResult == null || !options.ignoreResult) {
                            o.json().then((i) => {
                                if (options.callback != null) {
                                    try {
                                        options.callback(i, options.callbackParams);
                                    } catch (e) {
                                        console.log(e);
                                    }
                                }
                            }, (i) => {
                                console.log('thrown from json function 2', i);
                            })
                        } else {
                            if (options.callback != null && typeof options.callback === 'function') {
                                options.callback(options.callbackParams);
                            }
                        }
                    } else {
                        o.json().then((i) => { 
                            console.log(i); 
                            console.log(`server returned ${o.statusText} with message\n`, i);
                        }, (i) => { console.log('thrown from json function 2', i) })
                    }
                }, (o) => {
                    console.log(o);
                });
            }
        }
    }, 500);
}

executeRequest();
