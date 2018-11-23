// ==UserScript==
// @name         Save Betonline Hand Data
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://poker.betonline.ag/desktoppoker/index.htm?ID=*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    console.log("Starting Userscript")
    var OrigWebSocket = window.WebSocket;
    var callWebSocket = OrigWebSocket.apply.bind(OrigWebSocket);
    var wsAddListener = OrigWebSocket.prototype.addEventListener;
    wsAddListener = wsAddListener.call.bind(wsAddListener);
    window.WebSocket = function WebSocket(url, protocols) {
        var ws;
        if (!(this instanceof WebSocket)) {
            // Called without 'new' (browsers will throw an error).
            ws = callWebSocket(this, arguments);
        } else if (arguments.length === 1) {
            ws = new OrigWebSocket(url);
        } else if (arguments.length >= 2) {
            ws = new OrigWebSocket(url, protocols);
        } else { // No arguments (browsers will throw an error)
            ws = new OrigWebSocket();
        }

        wsAddListener(ws, 'message', function(event) {
            // TODO: Do something with event.data (received data) if you wish.
            console.log(location.search)
            console.log(event.data)
        });
        return ws;
    }.bind();
    window.WebSocket.prototype = OrigWebSocket.prototype;
    window.WebSocket.prototype.constructor = window.WebSocket;

    var wsSend = OrigWebSocket.prototype.send;
    wsSend = wsSend.apply.bind(wsSend);
    OrigWebSocket.prototype.send = function(data) {
        // TODO: Do something with the sent data if you wish.
        return wsSend(this, arguments);
    };

})();
