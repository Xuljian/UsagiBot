const { ipcMain } = require("electron");

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

ipcMain.on('load', function () {
    isReady = true;
});

ipcMain.on('load-repo', function () {
    isRepoReady = true;
});

exports.sendLogToRenderer = function(obj) {
    mainWindow.webContents.send('log', obj);
}

exports.sendRepoToRenderer = function(obj) {
    repoWindow.webContents.send('repo', JSON.parse(JSON.stringify(obj)));
}