/* eslint-disable */
// ==UserScript==
// @name         Socket Hitler
// @namespace    http://tampermonkey.net/
// @version      6.7
// @description  This Machine Kills Fascists
// @author       Bot
// @match        https://secrethitler.io/*
// @match        http://localhost:8080/*
// @grant        none
// ==/UserScript==

//                                               //
// ///////////////////////////////////////////// //
// Sends client-bound messages to localhost:3222 //
// Messages from localhost:3222 are passed on to //
// the server as if from the client itself.      //
// ///////////////////////////////////////////// //
//                 ~ Note: Spams browser console //

(function () {
	let shorten = function (raw_data) {
		let n = '"' + raw_data + '"';
		try {
			let data = raw_data.replace(/^(\d+)/g, '');
			// let number = raw_data.substring(0, length(data));
			let json = JSON.parse(data);
			n = json[0];
		} catch (e) {}
		return n.padEnd(22);
	};

	let SafeWebSocket = window.WebSocket;
	let py = new SafeWebSocket('ws://localhost:3222/');
	py.onopen = function (event) {
		console.log('Backend Connection Oppened');
		py.send('00["connection", {"status":"ok"}]');
	};
	py.onclose = function (event) {
		console.log('Backend Connection Closed');
	};
	let OrigWebSocket = window.WebSocket;
	let callWebSocket = OrigWebSocket.apply.bind(OrigWebSocket);
	let wsSend = OrigWebSocket.prototype.send;
	wsSend = wsSend.apply.bind(wsSend);
	let wsAddListener = OrigWebSocket.prototype.addEventListener;
	wsAddListener = wsAddListener.call.bind(wsAddListener);
	window.WebSocket = function WebSocket(url, protocols) {
		let ws;
		if (!(this instanceof WebSocket)) {
			ws = callWebSocket(this, arguments);
		} else if (arguments.length === 1) {
			ws = new OrigWebSocket(url);
		} else if (arguments.length >= 2) {
			ws = new OrigWebSocket(url, protocols);
		} else {
			ws = new OrigWebSocket();
		}
		wsAddListener(ws, 'message', function (event) {
			console.log('Incoming <<<     ' + shorten(event.data) + ' <<< ' + ws.url);
			wsSend(py, arguments);
		});
		wsAddListener(ws, 'open', function (event) {
			console.log('Connection Linked');
			py.onmessage = function (event) {
				ws.send(event.data);
			};
		});
		wsAddListener(ws, 'close', function (event) {
			console.log('Connection Unlinked');
			py.onmessage = function (event) {
				console.error('Received data but is Unlinked');
				console.error(event.data);
			};
		});
		ws.send = function (data) {
			console.log('Outgoing     >>> ' + shorten(data) + ' >>> ' + this.url);
			return wsSend(this, arguments);
		};
		window.shio = function (obj) {
			ws.send('42' + JSON.stringify(obj));
		};
		document.ws = ws;
		return ws;
	}.bind();
	window.WebSocket.prototype = OrigWebSocket.prototype;
	window.WebSocket.prototype.constructor = window.WebSocket;
})();
