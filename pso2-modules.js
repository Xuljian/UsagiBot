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

const allowConversionExtension = 
[
    "fhp", "fnp", "fcp", "fdp",
    "mhp", "mnp", "mcp", "mdp",
];

let newFileMaps = fileMap.filter(string => {
    return regexExtension.exec(string) != null;
});

let int = 0;

exports.pso2ModulesReady = true;

// new Functions here

const queue = [];

exports.getPayloadWildcard = function(name, ext, callback) {
    queue.push({
        name: name,
        ext: ext,
        callback: callback
    })
}

let getPayload = function(name, num, ext, callback) {
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
                let inputFilePath = `${destinationFolder}${num}\\${ice}_ext\\${exactFilename}`;
                let extension = exactFilename.split('.')[exactFilename.split('.').length - 1];
                let outputPath = `${destinationFolder}${num}`;
                switch (extension) {
                    case "cml": {
                        processConversionCml(inputFilePath, outputPath, ext, uploadFile, callback);
                        break;
                    }
                }
            })
        });
    } else {
        callback(null);
    }
}

let uploadFile = function(subDat, callback) {
    if (subDat.error) {
        callback("not null");
    } else {
        fs.readFile(subDat.newPath, (subSubSubErr, data) => {
            if (subSubSubErr) {
                callback("not null");
                return;
            }
            callback({
                buffer: data,
                extension: subDat.newExtension
            });
            fs.rmdir(`${subDat.cleanupPath}`, {
                maxRetries: 10,
                retryDelay: 500,
                recursive: true
            }, () => {

            })
        })
    }
}

let processConversionCml = function(inputFilePath, outputPath, extension, callback, mainCallback) {
    const executor = require('child_process');
    if (extension == null || extension === '' || allowConversionExtension.indexOf(extension) < 0) {
        callback({
            newPath: `${inputFilePath}`,
            newExtension: `cml`,
            cleanupPath: outputPath
        }, mainCallback)
        return;
    }
    let exactFilename = inputFilePath.split('\\')[inputFilePath.split('\\').length - 1];
    let filename = exactFilename.split('.')[0];
    let command = `${destinationFolder}\\PSO2SalonTool.exe -o ${outputPath} -ext ${extension} ${inputFilePath}`;
    executor.exec(command, (subSubErr, res) => {
        if (subSubErr) {
            callback({
                error: true
            }, mainCallback);
            return;
        }
        if (res.length > 500) {
            callback({
                error: true
            }), mainCallback;
            return;
        }
        callback({
            newPath: `${outputPath}\\${filename}.${extension}`,
            newExtension: `${extension}`,
            cleanupPath: outputPath
        }, mainCallback)
    })
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
        getPayload(dat.name, num, dat.ext, dat.callback);
        isReady = true;
    }
}, 500);