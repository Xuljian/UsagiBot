const executor = require('child_process');
const logger = require('./Usagi/utils/logger');
const { timeoutChainer } = require('./Usagi/utils/timeout-chainer');

let usagiProcess = null;

let usagi = function() {
    usagiProcess = executor.spawn("usagi.bat", [], { detached : true })
}

let updateChecker = function() {
    executor.exec(`${__dirname}\\update-checker.bat`, (err, res) => {
        if (err) {
            logger.log(err);
        }
        if (res) {
            logger.log("There are updates");
            // there are updates
            if (usagiProcess) {
                usagiProcess.kill();
            }

            executor.exec(`${__dirname}\\updater.bat`, (subErr, res) => {
                if (subErr) {
                    logger.log(subErr);
                };
                usagi();
            })
        }
    })
}

usagi();
timeoutChainer(updateChecker, 10000);