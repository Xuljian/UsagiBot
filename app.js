const executor = require('child_process');

const promisify = require('util.promisify');
executor.exec = promisify(executor.exec);

const fs = require('fs').promises;

const logger = require('./Usagi/utils/logger');
const { timeoutChainer } = require('./Usagi/utils/timeout-chainer');
const { USAGI_CONSTANTS } = require('./Usagi/usagi.constants');
const { sleeper } = require('./Usagi/utils/sleeper');
const { realTimeRepository } = require('./Usagi/repository-lite');

let firstTime = true;

let interval = () => {
    return realTimeRepository.debug ? 5000 : 1800000;
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
    logger.log("Loop sleeping till end file is consumed");

    let endFileExists = true;
    try {
        await fs.access(filepath);
    } catch {
        endFileExists = false;
    }
    
    while (endFileExists) {
        await sleeper(5000);
        try {
            await fs.access(filepath);
        } catch {
            endFileExists = false;
        }
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

    if (res.indexOf("git pull") > -1) {
        logger.log("There are updates");
        // there are updates
        if (!firstTime) {
            await killUsagi();
        }

        try {
            await executor.exec(`${__dirname}\\updater.bat`);
        } catch(e) {
            logger.log(e);
        }
        usagi();
    } else {
        if (firstTime) {
            usagi();
        }
    }

    if (firstTime) {
        firstTime = false;
    }

    logger.log("Finish checking for updates");
}

information();
let outer = timeoutChainer(() => {
    if (realTimeRepository.fileInit) {
        timeoutChainer(updateChecker, interval, true);
        outer.stop = true;
    }
}, 1000);