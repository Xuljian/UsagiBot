window.addEventListener('load', init);
var messageLogElement = null;
var adminElement = null;
var input = null;
var ignoreEnter = false;

function init() {
    electron.usagi({command: 'load'});
    messageLogElement = document.querySelector('div[message-log]');
    adminElement = document.querySelector('div[admin]');
    input = document.getElementById("input-value");
    resize();
    eventBinding();
}

function validateMessage() {
    let message = input.value;
    if (message == null || message.trim() === '') {
        return null;
    }
    input.value = '';
    return message;
}

var currentData = null;

function executeCommand() {
    if (currentData == null) {
        window.alert('select a message');
    }
    let select = document.getElementById('command');

    switch(select.value) {
        case 'dm': {
            let message = validateMessage();
            if (message == null) return;
            let data = {
                command: 'dm',
                channelId: currentData.channelId,
                message: message,
                messageReference: currentData.messageReference
            }
            window.electron.usagi(data);
            break;
        }
        case 'ignore': {
            let data = {
                command: 'ignore',
                channelId: currentData.channelId,
            }
            window.electron.usagi(data);
            break;
        }
        case 'unignore': {
            let data = {
                command: 'unignore',
                channelId: currentData.channelId,
            }
            window.electron.usagi(data);
            break;
        }
        case 'registerEmojiChannel': {
            let data = {
                command: 'registerEmojiChannel',
                channelId: currentData.channelId,
            }
            window.electron.usagi(data);
            break;
        }
        case 'unregisterEmojiChannel': {
            let data = {
                command: 'unregisterEmojiChannel',
                channelId: currentData.channelId,
            }
            window.electron.usagi(data);
            break;
        }
        case 'dmId': {
            let message = validateMessage();
            if (message == null) return;
            let data = {
                command: 'dmId',
                message: message,
                userId: currentData.userId,
            }
            window.electron.usagi(data);
            break;
        }
        case 'registerGuildArchive': {
            let data = {
                command: 'registerGuildArchive',
                guildId: currentData.guildId,
                channelId: currentData.channelId
            }
            window.electron.usagi(data);
            break;
        }
        case 'unregisterGuildArchive': {
            let data = {
                command: 'unregisterGuildArchive',
                channelId: currentData.guildId
            }
            window.electron.usagi(data);
            break;
        }
        case 'registerArchiveListener': {
            let data = {
                command: 'registerArchiveListener',
                guildId: currentData.guildId,
                channelId: currentData.channelId
            }
            window.electron.usagi(data);
            break;
        }
        case 'unregisterArchiveListener': {
            let data = {
                command: 'unregisterArchiveListener',
                guildId: currentData.guildId,
                channelId: currentData.channelId
            }
            window.electron.usagi(data);
            break;
        }
    }
    delete currentData.messageReference;
}

function eventBinding() {
    window.addEventListener('resize', resize);
    messageLogElement.addEventListener('message-click', handleClick);
    let executeButton = document.getElementById("execute");

    let messageIdContainer = document.querySelector('div[message-id-container]');
    messageIdContainer.addEventListener('click', () => {
        if (currentData.messageReference != null) {
            delete currentData.messageReference;
            let info = document.querySelector('div[info]');
            info.classList.add('hide');
            info.innerText = '';
            return;
        }

        let userIdEl = document.querySelector('div[user-id]');
        let id = userIdEl.innerText;
        if (id == null || id.trim() === '' || id.trim() === '-') {
            return;
        }
        let info = document.querySelector('div[info]');
        info.classList.remove('hide');
        info.innerText = `Replying to ${currentData.username} for message ${currentData.messageId}`; 
        if (currentData != null) {
            currentData.messageReference = {
                guild_id: currentData.guildId,
                channel_id: currentData.channelId,
                message_id: currentData.messageId
            }
        }
    });

    let userId = document.querySelector('div[user-id]');
    userId.parentElement.addEventListener('click', () => {
        let userIdEl = document.querySelector('div[user-id]');
        let id = userIdEl.innerText;
        if (id == null || id.trim() === '' || id.trim() === '-') {
            return;
        }
        input.value += `<@!${id}>`;
    });

    executeButton.addEventListener('click', executeCommand);

    input.addEventListener("keydown", function(event) {
        if (event.key === "Shift" ) {
            ignoreEnter = true;
        }
    });

    input.addEventListener("keyup", function(event) {
        if (event.key === "Shift" ) {
            setTimeout(() => {
                ignoreEnter = false;
            }, 500)
        }
        if (event.key === "Enter" && !ignoreEnter) {
            event.preventDefault();
            executeButton.click();
        }
    });
}

function handleClick(e, s) {
    let data = e.detail;
    currentData = data;
    let messageId = document.querySelector('div[message-id]');
    messageId.innerText = data.messageId;

    let userId = document.querySelector('div[user-id]');
    userId.innerText = data.userId;
    let username = document.querySelector('div.admin-info > div:nth-child(2) > div:last-child');
    username.innerText = data.username;

    let guildId = document.querySelector('div[guild-id]');
    guildId.innerText = data.guildId;
    let guildName = document.querySelector('div.admin-info > div:nth-child(3) > div:last-child');
    guildName.innerText = data.guildName;

    let channelId = document.querySelector('div[channel-id]');
    channelId.innerText = data.channelId;
    let channelName = document.querySelector('div.admin-info > div:nth-child(4) > div:last-child');
    channelName.innerText = data.channelName;
}

function resize() {
    let height = window.innerHeight;
    let width = window.innerWidth;

    messageLogElement.style.height = (height / 100 * 70) + 'px';
    messageLogElement.style.width = width + 'px';

    adminElement.style.height = (height / 100 * 30) + 'px';
    adminElement.style.width = width + 'px';
}