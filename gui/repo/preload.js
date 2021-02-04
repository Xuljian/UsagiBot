// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const {
    contextBridge,
    ipcRenderer
} = require("electron");

const whiteListCommands = [
    'load-repo', 'click'
]

var int = 0;

contextBridge.exposeInMainWorld(
    "electron", {
        usagi: (data) => {
            if (data == null) {
                return;
            }
            if (whiteListCommands.includes(data.command)) {
                ipcRenderer.send(data.command, data);
            }
        }
    }
);

function assignClickListener(element, data) {
    element.addEventListener('click', () => {
        
    });
}

window.addEventListener('DOMContentLoaded', () => {
    ipcRenderer.on('repo', (event, msg) => {
        console.log(msg)
    })
})