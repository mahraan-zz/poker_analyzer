// ==UserScript==
// @name         Save Betonline Hand Data
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://poker.betonline.ag/desktoppoker/index.htm?ID=*
// @grant        none
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js
// @require https://goessner.net/download/prj/jsonxml/json2xml.js
// @require https://goessner.net/download/prj/jsonxml/xml2json.js
// ==/UserScript==

(function() {
    'use strict';
    var OrigWebSocket = window.WebSocket;
    var callWebSocket = OrigWebSocket.apply.bind(OrigWebSocket);
    var wsAddListener = OrigWebSocket.prototype.addEventListener;
    wsAddListener = wsAddListener.call.bind(wsAddListener);
    var table_id = location.search.substr(4),
        players = {},
        stacks = {};
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
        // Do something with event.data (received data) if you wish.
        wsAddListener(ws, 'message', function(event) {
            // Do something with event.data (received data) if you wish.
            var message = event.data;
            var xmlDoc = $.parseXML(message),
                $xml = $(xmlDoc).find("*").eq(0),
                root = $xml[0],
                rootTitle = root.nodeName;
            if(rootTitle == "TableDetails"){
                var $seats = $(xmlDoc).find("Seats");
                $seats.children().each(function(){
                    var id = $(this).attr('id'),
                        playerInfo = $(this).find("PlayerInfo"),
                        nickname = playerInfo.attr("nickname"),
                        stack = $(this).find("Chips").attr("stack-size");
                    players[id] = nickname;
                    if(nickname != null){
                        stacks[nickname] = stack;
                    }
                });
                console.log(players);
                console.log(stacks);
            }
            else if(rootTitle == "PlayerInfo"){
                //console.log(rootTitle);
                //console.log(root);
            }
            else if(rootTitle == "Message"){
                //console.log(rootTitle);
                //console.log(root);
            }
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