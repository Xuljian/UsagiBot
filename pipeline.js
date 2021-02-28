const { ipcMain } = require("electron");
const { realTimeRepository } = require('./Usagi/temp-repository');

var mainWindow = null;
var repoWindow = null;

var isReady = false;
var isRepoReady = false;

var messages = [];

exports.isReady = function() {
    return isReady && isRepoReady;
}

exports.registerMainWindow = function(type, inittedWindow) {
    if (type === 'main') {
        if (inittedWindow != null && mainWindow == null) {
            mainWindow = inittedWindow;
        }
    } else if (type === 'repo') {
        if (inittedWindow != null && repoWindow == null) {
            repoWindow = inittedWindow;
        }
    }
}

//#region IPC
ipcMain.on('load', function () {
    isReady = true;
});

ipcMain.on('load-repo', function () {
    isRepoReady = true;
});

ipcMain.on('dm', (event, data) => {
    restActions.sendMessage(data);
})

ipcMain.on('dmId', (event, data) => {
    restActions.sendDMById(data);
})

ipcMain.on('ignore', (event, data) => {
    realTimeRepository.channelIgnore.push(data.channelId);
})

ipcMain.on('unignore', (event, data) => {
    realTimeRepository.channelIgnore = realTimeRepository.channelIgnore.filter((o) => {
        return o != data.channelId;
    })
})

ipcMain.on('registerEmojiChannel', (event, data) => {
    realTimeRepository.emojiChannel.push(data.channelId);
})

ipcMain.on('unregisterEmojiChannel', (event, data) => {
    realTimeRepository.emojiChannel = realTimeRepository.emojiChannel.filter((o) => {
        return o != data.channelId;
    })
})

ipcMain.on('registerGuildArchive', (event, data) => {
    realTimeRepository.archiveChannel[data.guildId] = data.channelId;
})

ipcMain.on('unregisterGuildArchive', (event, data) => {
    delete realTimeRepository.archiveChannel[data.guildId];
})

ipcMain.on('registerArchiveListener', (event, data) => {
    let archiveListenerChannel = realTimeRepository.archiveListenChannel[data.guildId];
    if (archiveListenerChannel == null) {
        realTimeRepository.archiveListenChannel[data.guildId] = [data.channelId];
    } else {
        if (archiveListenerChannel.indexOf(data.channelId) < 0) {
            archiveListenerChannel.push(data.channelId);
        }
    }
})

ipcMain.on('unregisterArchiveListener', (event, data) => {
    let archiveListenerChannel = realTimeRepository.archiveListenChannel[data.guildId];
    if (archiveListenerChannel == null) {
        return;
    } else {
        let foundIndex = archiveListenerChannel.indexOf(data.channelId);
        if (foundIndex > -1) {
            archiveListenerChannel.splice(foundIndex, 1);
        }
    }
})

//#endregion IPC

exports.sendLogToRenderer = function(obj) {
    mainWindow.webContents.send('log', obj);
}

exports.sendRepoToRenderer = function(obj) {
    repoWindow.webContents.send('repo', JSON.parse(JSON.stringify(obj)));
}