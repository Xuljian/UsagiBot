const executor = require('child_process');

const promisify = require('util.promisify');
executor.exec = promisify(executor.exec);

const fs = require('fs').promises;

const logger = require('./Usagi/utils/logger');
const { timeoutChainer } = require('./Usagi/utils/timeout-chainer');
const { USAGI_CONSTANTS } = require('./Usagi/usagi.constants');
const { sleeper } = require('./Usagi/utils/sleeper');
const { realTimeRepository } = require('./Usagi/repository');

let interval = () => {
    return realTimeRepository.fileInit && realTimeRepository.debug ? 5000 : 1800000;
}

let usagi = function() {
    usagiProcess = executor.spawn("usagi.bat", { detached: true });
}

// To display information
let information = function() {
    console.log("Put a file named 'end' in the BOT_DUMP_PATH to end this process");
    console.log("Put a file named 'debug' in BOT_DUMP_PATH to enable debug.\n" +
                "Debug mode sets the update checker interval to 5 seconds.\n" + 
                "Debug mode pretty prints the repository JSON.")
}

let killUsagi = async function() {
    let filepath = USAGI_CONSTANTS.BOT_DUMP_PATH + "\\end";

    try {
        fs.writeFile(filepath, "", 'utf8',);
    } catch (ex) {
        logger.log(ex);
        return;
    }

    // give it some time for the end file to be picked up by the usagi bot
    // search "killer" in usagi-gui.js for details
    sleeper(5000);

    let res = await executor.exec("TASKLIST /v | find /i \"UsagiBot\"");
    res = res.stdout;
    while (res && res.indexOf('electron.exe') > 0) {
        await sleeper(500);
        res = await executor.exec("TASKLIST /v | find /i \"UsagiBot\"");
        res = res.stdout;
    }
}

let updateChecker = async function() {
    logger.log("Checking for updates");
    let res = null;
    try {
        res =  await executor.exec(`${__dirname}\\update-checker.bat`);
    } catch (e) {
        logger.log(e);
    }
    res = res.stdout;

    if (res) {
        logger.log("There are updates");
        // there are updates
        await killUsagi();

        try {
            await executor.exec(`${__dirname}\\updater.bat`);
        } catch(e) {
            logger.log(e);
        }
        usagi();
    }
    logger.log("Finish checking for updates");
}

information();
usagi();
timeoutChainer(updateChecker, interval, true);