const executor = require('child_process');

const promisify = require('util.promisify');
executor.exec = promisify(executor.exec);

const fs = require('fs').promises;

const logger = require('./Usagi/utils/logger');
const { timeoutChainer } = require('./Usagi/utils/timeout-chainer');
const { USAGI_CONSTANTS } = require('./Usagi/usagi.constants');
const { sleeper } = require('./Usagi/utils/sleeper');

let usagiProcess = null;
let usagi = function() {
    usagiProcess = executor.spawn("usagi.bat", { detached: true });
}

let killUsagi = async function() {
    let filepath = USAGI_CONSTANTS.BOT_DUMP_PATH + "\\end";

    try {
        fs.writeFile(filepath, "", 'utf8',);
    } catch (ex) {
        logger.log(ex);
        return;
    }

    let res = await executor.exec("TASKLIST /v | find /i \"UsagiBot\"");
    res = res.stdout;
    while (res && res.indexOf('electron.exe') > 0) {
        await sleeper(500);
        res = await executor.exec("TASKLIST /v | find /i \"UsagiBot\"");
        res = res.stdout;
    }
}

let updateChecker = async function() {
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
}

usagi();
timeoutChainer(updateChecker, 1800000);