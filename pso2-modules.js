exports.pso2ModulesReady = false;

const fs = require('fs');

const allowSearchExtension = ['acb', 'cml'];

const pathToList = 'C:\\Data\\UsagiBotDump\\ice_mapped_list.json';
const destinationFolder = 'C:\\Data\\UsagiBotDump\\';

const pso2win32Path = 'C:\\PHANTASYSTARONLINE2_JP\\pso2_bin\\data\\win32';

let readString = fs.readFileSync(pathToList, 'utf-8');
let fileMap = JSON.parse(readString);

let regexExtensions = allowSearchExtension.join('|');

let regexExtension = new RegExp(`^.*\.(?:${regexExtensions})$`);

let newFileMaps = fileMap.filter(string => {
    return regexExtension.exec(string) != null;
});

let int = 0;

exports.pso2ModulesReady = true;

// new Functions here

const queue = [];

exports.getPayload = function(name, callback) {
    queue.push({
        name: name,
        callback: callback
    })
}

let getPayload = function(name, num, callback) {
    const executor = require('child_process');
    let regex = new RegExp(`^.*\\.*${name}.*\.(${regexExtensions})$`);
    let foundString = newFileMaps.find(string => {
        return regex.exec(string) != null;
    });
    if (foundString != null) {
        let exactFilename = foundString.split('\\')[1];
        let ice = foundString.split('\\')[0];
        fs.copyFile(`${pso2win32Path}\\${ice}`, `${destinationFolder}${num}\\${ice}`, (err) => {
            if (err) {
                callback(null);
                return;
            }
            let command = `${destinationFolder}\\ice.exe -o ${destinationFolder}${num}\\${ice}_ext ${destinationFolder}${num}\\${ice}`;
            executor.exec(command, (subSubErr, res) => {
                if (subSubErr) {
                    callback("not null");
                    return;
                }
                if (res.indexOf('FAILED') > -1) {
                    callback("not null");
                    return;
                }
                fs.readFile(`${destinationFolder}${num}\\${ice}_ext\\${exactFilename}`, (subSubSubErr, data) => {
                    if (subSubSubErr) {
                        callback("not null");
                        return;
                    }
                    let extension = exactFilename.split('.')[exactFilename.split('.').length - 1];
                    callback({
                        buffer: data,
                        extension: extension
                    });
                    fs.rmdir(`${destinationFolder}${num}`, {
                        maxRetries: 10,
                        retryDelay: 500,
                        recursive: true
                    }, () => {

                    })
                })
            })
        });
    } else {
        callback(null);
    }
}

let isReady = true;

setInterval(() => {
    if (isReady) {
        isReady = false;
        let dat = queue.shift();
        if (dat == null){
            isReady = true;
            return;
        }
        let num = int++;
        fs.mkdirSync(`${destinationFolder}${num}`);
        getPayload(dat.name, num, dat.callback);
        isReady = true;
    }
}, 500);