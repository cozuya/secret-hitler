const ipc = require('node-ipc');

ipc.config.id = 'cache';

const games = {};

ipc.serve(() => {
	ipc.server.on('addNewGame', (uid, game) => {
		games[uid] = game;
	});

	ipc.server.on('getGame', (uid, socket) => {
		ipc.server.emit(socket, 'sendGame', games[uid]);
	});
});

ipc.server.start();
