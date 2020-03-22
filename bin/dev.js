'use strict';

const cluster = require('cluster');
const coreCount = require('os').cpus().length;

if (cluster.isMaster) {
	new Array(coreCount).fill(true).forEach(() => {
		cluster.fork();
	});
} else {
	console.log(`Worker ${process.pid} started`);

	const http = require('http');
	const express = require('express');
	const port = (() => {
		const val = process.env.PORT || '8080';
		const port = parseInt(val, 10);

		if (isNaN(port)) {
			return val;
		}

		if (port >= 0) {
			return port;
		}

		return false;
	})();

	require('dotenv').config();

	global.app = express();

	const debug = require('debug')('app:server');
	const server = http.createServer(app);

	global.io = require('socket.io')(server);
	global.notify = require('node-notifier');

	app.set('port', port);
	app.set('strict routing', true);
	server.listen(port);

	function onError(error) {
		if (error.syscall !== 'listen') {
			throw error;
		}

		const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

		switch (error.code) {
			case 'EACCES':
				console.error(bind + ' requires elevated privileges');
				process.exit(1);
				break;
			case 'EADDRINUSE':
				console.error(bind + ' is already in use');
				process.exit(1);
				break;
			default:
				throw error;
		}
	}

	function onListening() {
		const addr = server.address();
		const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
		debug('Listening on ' + bind);
		console.log('Listening on ' + bind);
		require('../app');
	}

	server.on('error', onError);
	server.on('listening', onListening);
}
