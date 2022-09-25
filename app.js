var mainProcess = require('./Usagi/websocket-actions').mainProcess;
const { realTimeRepository, onClose, getEsentialData } = require('./Usagi/temp-repository');
const { clearInterval } = require('timers');

const { app, BrowserWindow } = require('electron')
const path = require('path')

const communicator = require('./pipeline')
const cronJob = require('./Usagi/cron-job');
const { timeoutChainer } = require('./Usagi/utils/timeout-chainer');

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
    timeoutChainer(() => {
        let message = messageLog.shift();
        if (message != null) {
            communicator.sendLogToRenderer(message);
        }
    }, 500)
    timeoutChainer(() => {
        communicator.sendRepoToRenderer(getEsentialData());
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
    let timeout = timeoutChainer(() => {
        try {
            if (realTimeRepository.fileInit && communicator.isReady()) {
                start();

                timeout.stop = true;
            }
        } catch (e) {
            console.log(e)
        }
    }, 500)
})

app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0){
        createWindow()
        createRepository();
    }
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        cronJob.haltCron();
        onClose(true, () => {
            app.quit();
            process.exit();
        });
    }
})

//#endregion electron