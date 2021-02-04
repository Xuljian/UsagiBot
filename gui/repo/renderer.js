window.addEventListener('load', init);
var messageLogElement = null;
var adminElement = null;
var input = null;
var ignoreEnter = false;

function init() {
    electron.usagi({command: 'load-repo'});
    resize();
    eventBinding();
}

var currentData = null;

function eventBinding() {
    window.addEventListener('resize', resize);
    //messageLogElement.addEventListener('message-click', handleClick);
}

function handleClick(e, s) {

}

function resize() {
}