// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const {
    contextBridge,
    ipcRenderer
} = require("electron");

const whiteListCommands = [
    'dm', 'ignore', 'load', 'unignore', 'registerEmojiChannel', 'unregisterEmojiChannel', 'dmId',
    'unregisterGuildArchive', 'registerGuildArchive', 'registerArchiveListener', 'unregisterArchiveListener'
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
        let eventData = data;
        let event = new CustomEvent('message-click', {
            detail: eventData,
            bubbles: true
        })
        element.dispatchEvent(event);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    ipcRenderer.on('log', (event, msg) => {
        let messageLogElement = document.querySelector('div[message-log]');
        if (int >= 100) {
            messageLogElement.removeChild(messageLogElement.children[0]);
        }

        let container = document.createElement('div');
        container.setAttribute('counter', int);
        if (!msg.isMe) {
            container.setAttribute('message-container', '');
        } else {
            container.setAttribute('message-container-me', '');
        }

        let element = document.createElement('div');
        element.setAttribute('message', '');
        if (msg.isMe) {
            element.classList.add('message-right');
        }
        container.appendChild(element);

        assignClickListener(element, msg);

        let usernameElement = document.createElement('div');
        usernameElement.innerText += msg.username;
        if (msg.userNick != null) {
            usernameElement.innerText += ' (' + msg.userNick + ')';
        }
        if (msg.isTargetted) {
            usernameElement.innerText += '  ';
            let important = document.createElement('span');
            important.classList.add('important');
            important.innerText = 'IMPORTANT!';
            usernameElement.appendChild(important);
        }
        element.appendChild(usernameElement);
        
        let userIdElement = document.createElement('div');
        userIdElement.classList.add('tiny');
        userIdElement.innerText = `${msg.userId}`;
        element.appendChild(userIdElement);

        if (msg.guildId != null) {
            let guildName = msg.guildName;
            let guildId = msg.guildId;
            let pairElement = document.createElement('div');
            pairElement.innerText = `${guildName}`;
            let subElement = document.createElement('span');
            subElement.classList.add('id');
            subElement.innerText = ` [${guildId}]`;
            pairElement.appendChild(subElement);
            element.appendChild(pairElement);
        }

        if (msg.channelId != null) {
            let channelName = msg.channelName;
            let channelId = msg.channelId;
            let pairElement = document.createElement('div');
            pairElement.innerText = `${channelName}`;
            let subElement = document.createElement('span');
            subElement.classList.add('id');
            subElement.innerText = ` [${channelId}]`;
            pairElement.appendChild(subElement);
            element.appendChild(pairElement);
        }
        
        let messageElement = document.createElement('div');
        messageElement.innerText = `${msg.message}`;
        messageElement.classList.add('message-section');
        if (msg.isMe) {
            messageElement.classList.add('message-left');
        }
        element.appendChild(messageElement);
        
        if (msg.imageUri != null) {
            let imageElement = document.createElement('img');
            imageElement.src = msg.imageUri;
            element.appendChild(imageElement);
        }

        let messageIdElement = document.createElement('div');
        messageIdElement.classList.add('tiny');
        messageIdElement.innerText = `(${msg.messageId})`;
        element.appendChild(messageIdElement);

        messageLogElement.appendChild(container);

        messageLogElement.scrollTo(0, messageLogElement.scrollHeight);
        int++;
    })
})