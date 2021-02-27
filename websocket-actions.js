const FormData = require("form-data");
const { USAGI_CONSTANT } = require("./usagi.constants");

const pso2Modules = require('./pso2-modules');

const messageLog = [];

var mainProcess = function () {

    const zlib = require("zlib");

    const WebSocket = require('ws')

    const cdnUrl = 'https://cdn.discordapp.com/';
    const happyGifPath = 'C:\\Data\\UsagiBotDump\\happy.gif';

    const usagiConstants = require('./usagi.constants').USAGI_CONSTANT;

    const realTimeRepository = require('./temp-repository').realTimeRepository;
    const tempRepositoryFunc = require('./temp-repository');

    const restActions = require('./rest-actions');
    const fileType = require('file-type');

    const maxImageSize = 262144;

    const fs = require('fs');

    var validMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
    ]

    var mimeMapping = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp'
    }

    var messages = [
        'I dunno what you want :(',
        'Wrong commands maybe?',
        '*Rabbit noises*',
        '*Angry rabbit noises*'
    ];

    var stringMappedEmoji = {
        program: {
            typeStrong: false,
            emoji: 'GalaxyBrain:802034278766346270'
        },
        sleep: {
            typeStrong: true,
            emoji: 'RappySleeping:801950234103513089'
        },
        dead: {
            typeStrong: true,
            emoji: 'DeadInside:805646304889012244'
        },
        nice: {
            typeStrong: true,
            emoji: 'ThumbsUpPhaleg:801951847329562654'
        },
        padoru: {
            typeStrong: true,
            emoji: 'Padoru:800972310797484102',
            // message: 'https://i.kym-cdn.com/photos/images/original/001/683/921/18e.gif'
        },
        hate: {
            typeStrong: false,
            emoji: 'Mad:800972475315126283'
        },
        angry: {
            typeStrong: true,
            emoji: 'Mad:800972475315126283'
        },
        match: function (string) {
            let emojis = [];
            for (var key in this) {
                if (Object.prototype.hasOwnProperty.call(this, key) && key !== 'match') {
                    let emoji = this[key];
                    if (emoji != null) {
                        let regexString = `(?:\\s|^)${key}` + (emoji.typeStrong == null || !emoji.typeStrong ? '' : '(?:\\s|$)');
                        let regex = new RegExp(regexString, "g");
                        let result = regex.exec(string);
                        if (result != null) {
                            emojis.push({
                                emoji: emoji.emoji,
                                index: result.index,
                                message: emoji.message
                            });
                        }
                    }
                }
            }
            return emojis;
        }
    }

    var heartbeat = {
        op: 1,
        d: null
    }

    var activities = [{
                        name: 'Gift Game',
                        type: 5,
                        created_at: new Date().getTime()
                    },
                    {
                        name: 'with Leticia and Pest',
                        type: 0,
                        created_at: new Date().getTime()
                    },
                    {
                        name: 'Black † White',
                        type: 2,
                        created_at: new Date().getTime()
                    }]

    let getActivity = function() {
        let randomValue = Math.floor(Math.random() *  3);
        return activities[randomValue];
    }

    var identify = {
        op: 2,
        d: {
            token: usagiConstants.BOT_DATA.BOT_TOKEN,
            presence: {
                since: null,
                activities: [
                    getActivity()
                ],
                status: 'online',
                afk: false
            },
            properties: {
                $os: 'windows',
                $browser: 'UsagiBot',
                $device: 'UsagiBot'
            },
            intents: usagiConstants.allIntents()
        }
    }

    var sequenceNumber = null;

    var zlibSuffix = [0x00, 0x00, 0xff, 0xff];

    var discordGatewayVersionNumber = 8;
    var encoding = 'json';

    var socket = new WebSocket(`wss://gateway.discord.gg/?v=${discordGatewayVersionNumber}&encoding=${encoding}`);

    socket.sendCustom = function (data, callback) {
        callback = callback || ((err) => { });
        this.send(JSON.stringify(data), callback);
    }

    socket.onopen = function (e) {
        console.log('CONNECTED!');
    };

    socket.onmessage = function (msg) {
        if (msg.data != null) {
            let data = JSON.parse(msg.data);
            matchOpCode(data);
        }
        //decompressMessaege(msg, processMessage);
    };

    socket.onclose = function (event) {
        if (socket.readyState === WebSocket.CLOSED) {
            console.log('socket has closed, restarting');
            mainProcess();
        }
    };

    socket.onerror = function (error) {
        console.log('onerror ' + socket.readyState, event);
        //if (socket.readyState === WebSocket.CLOSED) {
        //    mainProcess();
        //}
    };

    var fireIdentify = function () {
        socket.sendCustom(identify);
    }

    var matchOpCode = function (data) {
        switch (data.op) {
            case 10: {
                registerHeartbeat(data.d['heartbeat_interval']);
                registerSequenceNumber(data);
                fireIdentify();
                break;
            }
            case 0: {
                registerSequenceNumber(data);
                matchType(data);
                //console.log('0', data);
                break;
            }
            default: {
                registerSequenceNumber(data);
                //console.log('default', data);
                break;
            }
        }
    }

    var matchType = function (data) {
        switch (data.t) {
            case 'READY': {
                var usableData = data.d;
                if (usableData.guilds.length > 0) {
                    usableData.guilds.forEach((o) => {
                        if (realTimeRepository.guilds[o.id] == null) {
                            realTimeRepository.guilds[o.id] = null;
                        }
                    });
                }
                realTimeRepository.hasInit = true;
                break;
            }
            case 'GUILD_CREATE': {
                var usableData = data.d;
                if (realTimeRepository.guilds[usableData.id] == null) {
                    realTimeRepository.guilds[usableData.id] = usableData;
                }
                break;
            }
            case 'MESSAGE_CREATE': {
                let usableData = data.d;

                // botCounter(usableData);
                reactToMessage(usableData);
                logImage(usableData);

                if (usableData.guild_id == null) {
                    if (!checkIgnore(usableData.channel_id)) {
                        logMessage(usableData, true, usableData.author?.id === usagiConstants.BOT_DATA.CLIENT_ID);
                    }
                } else {
                    if (!checkIgnore(usableData.channel_id)) {
                        logMessage(usableData, false, usableData.author?.id === usagiConstants.BOT_DATA.CLIENT_ID);
                    }
                    if (usableData.guild_id != null) {
                        if (usableData.author?.id === usagiConstants.BOT_DATA.CLIENT_ID) {
                            return;
                        }
                        botCounter(usableData);
                        matchCommand(usableData);
                    }
                }
                break;
            }
            default: {
                //console.log(data)
                break;
            }
        }
    }

    var botCounter = function(data) {
        let textRegex = /\*\*Xuljian\*\* and \*\*.*\*\* are now \"friends\"\!/;
        if (data.channel_id != null) {
            let messageData = {
                channelId: data.channel_id
            }
            let message = data.content;
            if (textRegex.exec(message) != null && data.author?.id !== usagiConstants.BOT_DATA.CLIENT_ID && data.author?.bot) {
                fs.readFile(happyGifPath, (err, buffer) => {
                    if (err) {
                        console.log('OH NO!!!');
                        return;
                    }
                    fileType.fromBuffer(buffer).then((o) => {
                        if (validMimes.indexOf(o.mime) > -1) {
                            let content = new FormData();
                            messageData.content = content;
                            content.append('payload_json', JSON.stringify({
                                content: 'Yay!!!'
                            }));
                            content.append('happy', buffer, {
                                filename: `happy.${mimeMapping[o.mime]}`
                            });
                            restActions.sendMessageComplex(messageData);
                        }
                    })
                })
            }
        }
    }

    var checkIgnore = function (id) {
        let result = false;
        realTimeRepository.channelIgnore.forEach(o => {
            if (!result && o == id) {
                result = true;
            }
        })
        return result;
    }

    var reactToMessage = function (usableData) {
        if (usableData.channel_id != null) {
            let message = usableData.content;
            let emojis = stringMappedEmoji.match(message);
            if (emojis != null && emojis.length > 0) {
                emojis.sort((a, b) => {
                    return a.index - b.index;
                }).forEach(o => {
                    restActions.reactToMessage({
                        channelId: usableData.channel_id,
                        messageId: usableData.id,
                        emoji: o.emoji
                    })
                    if (o.message != null) {
                        restActions.sendMessage({
                            channelId: usableData.channel_id,
                            message: o.message
                        })
                    }
                })
            }
        }
    }

    var logImage = function(usableData) {
        if (!tempRepositoryFunc.hasListenerForArchive(usableData.guild_id, usableData.channel_id)) return;

        let channelId = tempRepositoryFunc.archiveChannel(usableData.guild_id);
        if (channelId == null) return;
        
        if (usableData.author?.bot == true) return;

        if (usableData.attachments != null && usableData.attachments.length > 0) {
            usableData.attachments.forEach(attachment => {
                let messageData = {
                    channelId: channelId
                }
                restActions.getImage(attachment.url, (buffer) => {
                    fileType.fromBuffer(buffer).then((o) => {
                        if (validMimes.indexOf(o.mime) > -1) {
                            if (usableData.author?.id != null && usableData.author?.avatar != null) {
                                let url = `${cdnUrl}avatars/${usableData.author.id}/${usableData.author.avatar}`;
                                restActions.getImage(url, (subBuffer) => {
                                    fileType.fromBuffer(subBuffer).then((i) => {
                                        if (validMimes.indexOf(i.mime) > -1) {
                                            let content = new FormData();
                                            messageData.content = content;
                                            content.append('payload_json', JSON.stringify({
                                                embed: {
                                                    image: {
                                                        url: `attachment://upload.${mimeMapping[o.mime]}`
                                                    },
                                                    footer: {
                                                        text: `by ${usableData.author.nick != null ? usableData.author.nick : usableData.author.username}${realTimeRepository.channels[usableData.channel_id] == null ? '' : ' from ' + realTimeRepository.channels[usableData.channel_id].name}`,
                                                        icon_url: `attachment://profile.${mimeMapping[i.mime]}`
                                                    }
                                                }
                                            }));
                                            content.append('upload', buffer, {
                                                filename: `upload.${mimeMapping[o.mime]}`
                                            });
                                            content.append('profile', subBuffer, {
                                                filename: `profile.${mimeMapping[i.mime]}`
                                            });
                                            restActions.sendMessageComplex(messageData);
                                        }
                                    })
                                })
                            } else {
                                let content = new FormData();
                                messageData.content = content;
                                content.append('payload_json', JSON.stringify({
                                    embed: {
                                        image: {
                                            url: `attachment://upload.${mimeMapping[o.mime]}`
                                        },
                                        footer: {
                                            text: `by ${usableData.author.nick != null ? usableData.author.nick : usableData.author.username}${realTimeRepository.channels[usableData.channel_id] == null ? '' : ' from ' + realTimeRepository.channels[usableData.channel_id].name}`,
                                        }
                                    }
                                }));
                                content.append('upload', buffer, {
                                    filename: `upload.${mimeMapping[o.mime]}`
                                });
                                restActions.sendMessageComplex(messageData);
                            }
                        }
                    })
                })
            })
        }
    }

    var logMessage = function (usableData, isTargetted, isMe) {
        let data = {
            message: usableData.content,
            isTargetted: isTargetted,
            isMe: isMe
        };
        if (usableData.id != null) {
            data.messageId = usableData.id;
        }
        if (usableData.author?.username != null) {
            data.username = usableData.author.username;
        }
        if (usableData.author?.id != null) {
            data.userId = usableData.author.id;
        }
        if (usableData.member?.nick != null) {
            data.userNick = usableData.member?.nick;
        }
        if (usableData.guild_id != null) {
            data.guildId = usableData.guild_id;
            data.guildName = tempRepositoryFunc.getGuildName(usableData.guild_id) || 'Can\' find guild name';
        }
        if (usableData.channel_id != null) {
            data.channelId = usableData.channel_id;
            data.channelName = realTimeRepository.channels[usableData.channel_id]?.name || 'Can\' find channel name';
        }

        if (usableData.attachments != null && usableData.attachments.length > 0) {
            restActions.getImage(usableData.attachments[0].url, (buffer) => {
                fileType.fromBuffer(buffer).then((o) => {
                    if (o != null && validMimes.indexOf(o.mime) > -1) {
                        let base64image = buffer.toString('base64');
                        data.imageUri = `data:${o.mime};base64,${base64image}`;
                        messageLog.push(data);
                    }
                })
            })
        } else {
            messageLog.push(data);
        }
    }

    var matchCommand = function (data) {
        let content = data.content;
        let regexCommand = /^\#\!.*/gm
        let result = regexCommand.exec(content);
        if (result) {
            content = content.replace(/^\#\!/, '');
            let splitCommand = content.split(' ');
            let command = splitCommand.shift();
            let args = splitCommand.join(' ');
            switch (command.toLowerCase()) {
                case 'random': {
                    let splitArgs = args.split(' ');

                    if (splitArgs[0] === '?') {
                        restActions.sendMessage({
                            channelId: data.channel_id,
                            message: `<@!${data.author?.id}> The command is "#!random <min> <max>" where min and max are inclusive. It will not work if both are not given`
                        });
                    } else if (/\d+/.exec(splitArgs[0]) != null && /\d+/.exec(splitArgs[1]) != null) {
                        let low = parseInt(splitArgs[0]);
                        let high = parseInt(splitArgs[1]);
                        let randomValue = Math.floor(Math.random() * (high - low + 1) + low);

                        restActions.sendMessage({
                            channelId: data.channel_id,
                            message: `<@!${data.author?.id}> you rolled ${randomValue}`
                        });
                    } else {
                        invalidCommands(data);
                    }
                    break;
                }
                case 'math': {
                    try {
                        let result = scopeEval(args);
                        if (isNaN(result)) {
                            invalidCommands(data);
                            return;
                        }
                        restActions.sendMessage({
                            channelId: data.channel_id,
                            message: `<@!${data.author?.id}> value is ${result}`
                        });
                    } catch (e) {
                        console.log(e);
                        invalidCommands(data);
                        return;
                    }
                    break;
                }
                case 'pso2search': {
                    processPSO2Search(data, args);
                    break;
                }
                case 'pso2file': {
                    processPSO2Search(data, args, true);
                    break;
                }
                default: {
                    if (validEmojiChannel(data.channel_id) && data.attachments != null && data.attachments.length > 0) {
                        processEmoji(command, data)
                    }
                    break;
                }
            }
        }
    }

    var validEmojiChannel = function(channelId) {
        return realTimeRepository.emojiChannel.indexOf(channelId) > -1;
    }

    var scopeEval = function (evalString) {
        let cleanScope = {};
        return function () {
            'use strict'
            evalString = evalString.split('[').join('(');
            evalString = evalString.split(']').join(')');
            evalString = evalString.split('{').join('(');
            evalString = evalString.split('}').join(')');
            evalString = evalString.split(' ').join('');
            evalString = evalString.split('\\').join('');
            let mathRegex = /^[+\-/*\.\d\(\)]+$/;

            if (mathRegex.exec(evalString) == null) {
                throw 'Invalid math operations';
            }

            return eval(evalString);
        }.bind(cleanScope)();
    }

    var invalidCommands = function (data) {
        let low = 0;
        let high = messages.length - 1;
        let randomValue = Math.floor(Math.random() * (high - low + 1) + low);

        restActions.sendMessage({
            channelId: data.channel_id,
            message: `<@!${data.author?.id}> ${messages[randomValue]}`
        });
    }

    var imageTooHuge = function (data) {
        restActions.sendMessage({
            channelId: data.channel_id,
            message: `<@!${data.author?.id}> the file you uploaded is too huge in terms of size. A max of 256kb is allowed.`
        });
    }

    var registerSequenceNumber = function (data) {
        if (data.s != null && data.s > sequenceNumber) {
            sequenceNumber = data.s;
        }
        heartbeat.d = sequenceNumber;
    }

    var registerHeartbeat = function (interval) {
        setTimeout(function () {
            socket.sendCustom(heartbeat);
            registerHeartbeat(interval);
        }, interval);
    }

    var decompressMessaege = function (potentiallyCompressedMessage, callback) {
        var message = potentiallyCompressedMessage;

        if (message.length < 4 || !testForZlib(message)) {
            return message;
        }

        zlib.inflate(buffer, (err, buffer) => {
            callback(buffer);
        });
    }

    var testForZlib = function (message) {
        let match = 0;
        for (var x = 1; x != 5; x++) {
            if (message[message.length - x] == zlibSuffix[zlibSuffix.length - x]) {
                match++;
            }
        }
        return match == 4;
    }

    var processMessage = function (msg) {
        console.log(msg);
    }

    //#region websocket complex processes
    var processPSO2Search = function(data, args, exact) {
        if (!pso2Modules.pso2ModulesReady) {
            restActions.sendMessage({
                channelId: data.channel_id,
                message: `<@!${data.author?.id}> this function is not ready yet`
            });
            return;
        }

        if (args == null || args === '' || args === '?') {
            let description = getDescription(exact);
            restActions.sendMessage({
                channelId: data.channel_id,
                embed: {
                    description: description
                }
            });
        } else {
            let argArr = args.split(" ");
            let cmlName = argArr[0];
            let ext = null;
            if (argArr.length > 1) {
                ext = argArr[1];
            }
            pso2Modules.getPayload(cmlName, ext, exact, (payload) => {
                if (payload == null) {
                    restActions.sendMessage({
                        channelId: data.channel_id,
                        messageReference: {
                            channel_id: data.channel_id,
                            message_id: data.id,
                            guild_id: data.guild_id
                        },
                        message: `<@!${data.author?.id}> can't find the file sorry :(`
                    });
                } else if (payload === 'not null') {
                    restActions.sendMessage({
                        channelId: data.channel_id,
                        messageReference: {
                            channel_id: data.channel_id,
                            message_id: data.id,
                            guild_id: data.guild_id
                        },
                        message: `<@!${data.author?.id}> this command is out of order, I have pinged my master. Sorry for the inconvenience :(`
                    });
                } else {
                    let messageData = {
                        channelId: data.channel_id,
                    }
                    let content = new FormData();
                    messageData.content = content;
                    content.append('payload_json', JSON.stringify({
                        message_reference: {
                            channel_id: data.channel_id,
                            message_id: data.id,
                            guild_id: data.guild_id
                        }
                    }));
                    content.append(payload.filename, payload.buffer, {
                        filename: `${payload.filename}.${payload.extension}`
                    });
                    restActions.sendMessageComplex(messageData);
                }
            });
        }
    }

    let getDescription = function(exact) {
        if(!exact)
            return `**Using pso2search**

                    \`\`#!pso2search <npc cml name> <ext>\`\`

                    Visit this link https://docs.google.com/spreadsheets/d/1GQwG49iYM1sgJhyAU5AWP-gboemzfIZjBGjTGEZSET4/edit#gid=126227794
                    In the spreadsheet find the NPC you wish to get the files for and replace <npc cml name> with the name in the CML column of the spreadsheet when using this command

                    The ext is basically the character file you wish to convert to. (Applicable for CML files only)
                    \`\`\`fhp for female human\nfnp for female newman\nfcp for female cast\nfdp for female deuman\nmhp for male human\mmnp for male newman\nmcp for male cast\nmdp for male deuman\`\`\`

                    PS: If ext provided don't match any of the given ones above, the CML will be given.
            
                    Example: \`\`#!pso2search npc_04 fdp\`\`
                    The example above will provide you with the npc file of Matoi for female deuman`
        else
            return `**Using pso2file**

                    \`\`#!pso2file <extracted full filename> <ext>\`\`
                    
                    Use this only when you know the filename exactly, otherwise use pso2search

                    The ext is basically the character file you wish to convert to. (Applicable for CML files only)
                    \`\`\`fhp for female human\nfnp for female newman\nfcp for female cast\nfdp for female deuman\nmhp for male human\mmnp for male newman\nmcp for male cast\nmdp for male deuman\`\`\`

                    PS: If ext provided don't match any of the given ones above, the CML will be given.
            
                    Example: \`\`#!pso2file np_npc_91.cml fhp\`\`
                    The example above will provide you with the npc file of Io for female human`
    }

    var processEmoji = function(emojiName, data) {
        let imageData = data.attachments[0];
        function mainEmojiProcessor(buffer) {
            fileType.fromBuffer(buffer).then((o) => {
                if (validMimes.indexOf(o.mime) > -1) {
                    let base64image = buffer.toString('base64');
                    restActions.registerEmoji({
                        name: emojiName.split('"').join('').split(':').join(''),
                        image: `data:${o.mime};base64,${base64image}`,
                        channelId: data.channel_id,
                        guildId: data.guild_id,
                        messageId: data.id,
                        callback: (data, options) => {
                            if (data.id != null) {
                                restActions.deleteMessage(options.channelId, options.messageId);
                                restActions.sendMessage({
                                    channelId: options.channelId,
                                    message: `Emoji added <:${data.name}:${data.id}>`
                                })
                            }
                        }
                    })
                }
            })
        }
        //#endregion websocket complex processes

        restActions.getImage(imageData.url, (buffer) => {
            if (Buffer.byteLength(buffer) > maxImageSize) {
                imageTooHuge(data);
            }
            mainEmojiProcessor(buffer);
        })
    }

    return messageLog;
}

exports.mainProcess = mainProcess;
