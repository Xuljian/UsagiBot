const { log } = require('./Usagi/utils/logger');
var { mainProcess, end: websocketEnd } = require('./Usagi/websocket-actions');
const { realTimeRepository, onClose, getEsentialData } = require('./Usagi/repository');

const { app, BrowserWindow } = require('electron')
const path = require('path')

const communicator = require('./pipeline')
const cronJob = require('./Usagi/utils/cron-job');
const { timeoutChainer, end: chainerEnder } = require('./Usagi/utils/timeout-chainer');

let endPSO2 = null;

try {
    endPSO2 = require('./Usagi/utils/pso2/pso2-modules');
} catch {
    log("pso2 module failed to load");
}

const { endRest } = require('./Usagi/rest-actions');
const { end: commandEnder } = require('./Usagi/commands');

const fs = require('fs').promises;

const { USAGI_CONSTANTS } = require('./Usagi/usagi.constants');

var messageLog = null;

var mainWindow = null;
var repositoryWindow = null;
let repo = null;

app.disableHardwareAcceleration();

var start = function () {
    try {
        messageLog = mainProcess();
        startLogging();
    } catch (exception) {
        log(exception);
        commandEnder();
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
    repo = setInterval(() => {
        communicator.sendRepoToRenderer(getEsentialData());
    }, 10000)
}

function UncaughtExceptionHandler(err) {
    log("Uncaught Exception Encountered!!");
    log("err: ", err);
    log("Stack trace: ", err.stack);
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

    let killer = timeoutChainer(async () => {
        let filepath = USAGI_CONSTANTS.BOT_DUMP_PATH + "\\end";
        try {
            await fs.access(filepath);
        } catch (ex) {
            return;
        }

        // Time to end the program.
        mainWindow.close();
        repositoryWindow.close();
        killer.stop = true;
    }, 1000)

    let timeout = timeoutChainer(() => {
        try {
            if (realTimeRepository.fileInit && communicator.isReady()) {
                start();

                timeout.stop = true;
            }
        } catch (e) {
            log(e)
        }
    }, 500)
});

app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0){
        createWindow()
        createRepository();
    }
})

app.on('window-all-closed', function () {
    console.log("window-all-closed executed");
    if (process.platform !== 'darwin') {
        clearInterval(repo);
        cronJob.haltCron();
        websocketEnd();
        endPSO2 && endPSO2();
        endRest();
        chainerEnder().then(() => {
            commandEnder();
            onClose(false, true, () => {
                let filepath = USAGI_CONSTANTS.BOT_DUMP_PATH + "\\end";
                fs.rm(filepath).then(() => {
                    app.quit();
                }, (ex) => {
                    log("Fail to remove file");
                    log(ex);
                    app.quit();
                })
            });
        })
    }
})

//#endregion electron