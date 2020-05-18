const ipc = require('node-ipc');

ipc.config.id = 'cache';

const games = {};

ipc.serve(() => {
	ipc.server.on('addNewGame', (uid, game) => {
		games[uid] = game;
	});

	ipc.server.on('getGame', (data, socket) => {
		ipc.server.emit(socket, 'sendGame', { hi: 'world' });
	});
});

ipc.server.start();
