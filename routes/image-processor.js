const Crusher = require('pngcrush');
const Jimp = require('jimp');
const Stream = require('stream');
const Account = require('../models/account');
const fs = require('fs');
const { userList, games } = require('./socket/models');
const { secureGame } = require('./socket/util');
const { sendGameList } = require('./socket/user-requests');

module.exports.ProcessImage = (username, raw, callback) => {
	Jimp.read(Buffer.from(raw, 'base64'), (err, img) => {
		if (err) {
			callback(null, err);
			return;
		}
		img.resize(70, 95).getBuffer(Jimp.MIME_PNG, (err2, buff) => {
			if (err2) {
				callback(null, err2);
				return;
			}
			const streamPass = new Stream.PassThrough();
			streamPass.end(buff);
			streamPass
				.pipe(new Crusher(['-brute', '-rem', 'alla', '-c', '2', '-force', '-fix']))
				.pipe(fs.createWriteStream(`public/images/custom-cardbacks/${username}.png`));
			Account.findOne({ username: username }).then((account) => {
				account.gameSettings.customCardback = 'png';
				account.gameSettings.customCardbackSaveTime = Date.now().toString();
				account.gameSettings.customCardbackUid = Math.random().toString(36).substring(2);
				account.save(() => {
					const user = userList.find((u) => u.userName === username);
					if (user) {
						user.customCardback = 'png';
						user.customCardbackUid = account.gameSettings.customCardbackUid;
					}
					// redis todo
					Object.keys(games).forEach((uid) => {
						const game = games[uid];
						const foundUser = game.publicPlayersState.find((user) => user.userName === username);
						if (foundUser) {
							foundUser.customCardback = '';
							io.sockets.in(uid).emit('gameUpdate', secureGame(game));
							sendGameList();
						}
					});
					const socketId = Object.keys(io.sockets.sockets).find(
						(socketId) =>
							io.sockets.sockets[socketId].handshake.session.passport &&
							io.sockets.sockets[socketId].handshake.session.passport.user === username
					);
					if (socketId && io.sockets.sockets[socketId]) {
						io.sockets.sockets[socketId].emit('gameSettings', account.gameSettings);
					}
					callback('Image uploaded successfully.');
				});
			});
		});
	});
};
