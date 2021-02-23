var mainProcess = require('./websocket-actions').mainProcess;
const restActions = require('./rest-actions');
const readline = require('readline');
const { realTimeRepository } = require('./temp-repository');
const { clearInterval } = require('timers');

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

const communicator = require('./pipeline')

var messageLog = null;

var mainWindow = null;
var repositoryWindow = null;

var start = function () {
    try {
        messageLog = mainProcess();
        startLogging();
    } catch (exception) {
        console.log(exception);
        start();
    }
}

var startLogging = function() {
    setInterval(() => {
        let message = messageLog.shift();
        if (message != null) {
            communicator.sendLogToRenderer(message);
        }
    }, 500)
    setInterval(() => {
        communicator.sendRepoToRenderer(realTimeRepository);
    }, 10000)
}

function UncaughtExceptionHandler(err) {
    console.log("Uncaught Exception Encountered!!");
    console.log("err: ", err);
    console.log("Stack trace: ", err.stack);
    setInterval(function () { }, 5000000);
}

process.on('uncaughtException', UncaughtExceptionHandler);

//#region electron

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, '\\gui\\main\\preload.js')
        }
    })

    mainWindow.loadFile('.\\gui\\main\\views\\index.html')
    // mainWindow.webContents.openDevTools();
}

function createRepository() {
    repositoryWindow = new BrowserWindow({
        width: 720,
        height: 720,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, '\\gui\\repo\\preload.js')
        }
    })

    repositoryWindow.loadFile('.\\gui\\repo\\views\\index.html')
    // repositoryWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();
    createRepository();
    communicator.registerMainWindow('main', mainWindow);
    communicator.registerMainWindow('repo', repositoryWindow);
    let timeOut = setInterval(() => {
        try {
            if (realTimeRepository.fileInit && communicator.isReady()) {
                start();
    
                clearInterval(timeOut);
            }
        } catch (e) {
            console.log(e)
        }
    }, 500)

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0){
            createWindow()
            createRepository();
        }
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
        process.exit();
    }
})

ipcMain.on('dm', (event, data) => {
    restActions.sendMessage(data);
})

ipcMain.on('dmId', (event, data) => {
    restActions.sendDMByIds(data);
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

//#endregion electron