const { userList, modDMs, games } = require('../models');
const { handleAEMMessages, getStaffRole, sendInProgressModDMUpdate } = require('../util.js');
const { generateCombination } = require('gfycat-style-urls');
const https = require('https');
const ModThread = require('../../../models/modThread');

module.exports.handleOpenChat = (socket, data, modUserNames, editorUserNames, adminUserNames) => {
	const passport = socket.handshake.session.passport;
	if (data.aemMember !== passport.user) return;

	const aemMember = userList.find(x => x.userName === data.aemMember);
	if (aemMember && aemMember.staffIncognito) {
		socket.emit('sendAlert', 'You cannot start or join a chat while Incognito.');
		return;
	}

	const dmReceiver = userList.find(x => x.userName === data.userName) || {};
	const modInDM = Object.keys(modDMs).find(x => modDMs[x].subscribedPlayers.indexOf(data.aemMember) !== -1);
	const modInGame = Object.keys(games).find(x => games[x].gameState.isTracksFlipped && games[x].publicPlayersState.find(y => y.userName === data.aemMember));

	if (modInGame) {
		socket.emit('sendAlert', 'You cannot start or join a chat while in-game.');
		return;
	}

	if (modInDM) {
		// if the mod is already DMing someone, we should send them the DM they were in instead of opening a new one
		socket.emit('preOpenModDMs'); // this is necessary in order to allow the socket on the client to prepare for the openModDMs event
		socket.emit('openModDMs', handleAEMMessages(modDMs[dmReceiver], passport.user, modUserNames, editorUserNames, adminUserNames));
		return; // something fucky happened and they got disconnected from the chat
	}

	if (modDMs[dmReceiver.userName]) {
		// if there is an open DM but the mod is not the one who created it, they should start observing
		const dm = modDMs[dmReceiver.userName];
		dm.subscribedPlayers.push(data.aemMember);
		dm.aemOnlyMessages.push({
			date: new Date(),
			chat: 'has joined.',
			userName: data.aemMember,
			staffRole: getStaffRole(passport.user, modUserNames, editorUserNames, adminUserNames),
			type: 'join'
		});

		socket.emit('preOpenModDMs');
		socket.emit('openModDMs', handleAEMMessages(modDMs[dmReceiver], data.aemMember, modUserNames, editorUserNames, adminUserNames));
		return sendInProgressModDMUpdate(dm, modUserNames, editorUserNames, adminUserNames);
	}

	const dmReceiverSocketID = Object.keys(io.sockets.sockets).find(
		socketId => io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === data.userName
	);
	const dmReceiverSocket = io.sockets.sockets[dmReceiverSocketID];

	if (!Object.keys(dmReceiver).length || dmReceiverSocketID == null || dmReceiverSocket == null) {
		return socket.emit('sendAlert', 'That player is not online!');
	}

	const initMessage = {
		date: new Date(),
		chat:
			"Every moderator can access this chat if they choose to. Please do not out confidential game information if you're currently playing with a moderator. If you prefer talking to a specific moderator one on one, feel free to DM one on Discord. ToU applies to this chat.",
		userName: '',
		staffRole: 'moderator',
		isBroadcast: true,
		type: 'broadcast'
	};

	const dmInitializeData = {
		// create mod DM
		_id: generateCombination(3, '', true),
		username: data.userName,
		aemMember: data.aemMember,
		startDate: new Date(),
		subscribedPlayers: [data.userName, data.aemMember],
		messages: [initMessage],
		aemOnlyMessages: [initMessage]
	};

	dmReceiverSocket.emit('preOpenModDMs');
	dmReceiverSocket.emit('openModDMs', handleAEMMessages(dmInitializeData, data.userName, modUserNames, editorUserNames, adminUserNames));
	socket.emit('preOpenModDMs');
	socket.emit('openModDMs', handleAEMMessages(dmInitializeData, data.aemMember, modUserNames, editorUserNames, adminUserNames));

	modDMs[dmReceiver.userName] = dmInitializeData;

	const discordThreadNotifyBody = JSON.stringify({
		// and post it to discord
		content: `__**Mod DM Opened**__\n__AEM Member__: ${data.aemMember}\n__User__: ${dmReceiver.userName}`
	});
	const discordThreadNotifOptions = {
		hostname: 'discordapp.com',
		path: process.env.DISCORDMODDMSTHREADURL,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(discordThreadNotifyBody)
		}
	};
	try {
		const threadReq = https.request(discordThreadNotifOptions);
		threadReq.end(discordThreadNotifyBody);
	} catch (e) {
		console.log(e, 'err in broadcast');
	}
};

module.exports.handleCloseChat = (socket, data, modUserNames, editorUserNames, adminUserNames) => {
	// save, notify, etc
	const passport = socket.handshake.session.passport;

	const dmID = Object.keys(modDMs).find(x => modDMs[x].subscribedPlayers.indexOf(passport.user) !== -1);
	if (dmID) {
		const dm = modDMs[dmID];

		if (
			passport.user === dm.aemMember ||
			(getStaffRole(passport.user, modUserNames, editorUserNames, adminUserNames) &&
				getStaffRole(passport.user, modUserNames, editorUserNames, adminUserNames) !== 'moderator') // only the mod who created the DM or any editor can close the DM
		) {
			for (const user of dm.subscribedPlayers) {
				try {
					const sock =
						io.sockets.sockets[
							Object.keys(io.sockets.sockets).find(
								socketId => io.sockets.sockets[socketId].handshake.session.passport && io.sockets.sockets[socketId].handshake.session.passport.user === user
							)
						];

					sock.emit('closeModDMs');
					sock.emit('postCloseModDMs');
				} catch (e) {}
			}

			dm.endDate = new Date();
			dm.messages = dm.aemOnlyMessages;
			delete dm.aemOnlyMessages;
			delete dm.subscribedPlayers;

			const savedDM = new ModThread(dm);
			savedDM.save();

			const dmCloseMessage = `__**Mod DM Closed**__\n__AEM Member__: ${dm.aemMember}\n__User__: ${dm.username}\n__Start Date__: ${dm.startDate}\n__End Date__: ${dm.endDate}\n__Chat Log__: https://secrethitler.io/modThread?id=${dm._id}`;
			const discordThreadNotifyBody = JSON.stringify({
				// save and send to discord
				content: dmCloseMessage
			});
			const discordThreadNotifOptions = {
				hostname: 'discordapp.com',
				path: process.env.DISCORDMODDMSTHREADURL,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(discordThreadNotifyBody)
				}
			};
			try {
				const threadReq = https.request(discordThreadNotifOptions);
				threadReq.end(discordThreadNotifyBody);
			} catch (e) {
				console.log(e, 'err in notif');
			}

			delete modDMs[dmID];
		}
	} else {
		socket.emit('sendAlert', 'Could not find a DM you are in!');
	}
};

module.exports.handleUnsubscribeChat = (socket, data, modUserNames, editorUserNames, adminUserNames) => {
	const passport = socket.handshake.session.passport;

	const dmID = Object.keys(modDMs).find(x => modDMs[x].subscribedPlayers.indexOf(passport.user) !== -1);
	const dm = modDMs[dmID];

	if (dm) {
		dm.aemOnlyMessages.push({
			// add leave message (this is only called for mods leaving and not the DM closing)
			date: new Date(),
			chat: 'has left.',
			userName: passport.user,
			staffRole: getStaffRole(passport.user, modUserNames, editorUserNames, adminUserNames),
			type: 'leave'
		});

		const idx = dm.subscribedPlayers.indexOf(passport.user);
		if (idx !== -1) {
			dm.subscribedPlayers.splice(idx, 1);
		}

		socket.emit('closeModDMs');
		socket.emit('postCloseModDMs'); // this is necessary to allow the force-mounted right sidebar to be properly disposed in the right order
		sendInProgressModDMUpdate(dm, modUserNames, editorUserNames, adminUserNames);
	}
};

module.exports.handleAddNewModDMChat = (socket, passport, data, modUserNames, editorUserNames, adminUserNames) => {
	const receivingPlayer = Object.keys(modDMs).find(x => modDMs[x].username === passport.user || modDMs[x].aemMember === socket.handshake.session.passport.user);
	if (receivingPlayer) {
		// add a new chat and push it to AEM chat and player chat
		const dm = modDMs[receivingPlayer];
		const now = new Date();
		const newMessage = {
			date: now,
			chat: data.chat,
			userName: passport.user,
			staffRole: getStaffRole(passport.user, modUserNames, editorUserNames, adminUserNames),
			type: 'message'
		};

		dm.messages.push(newMessage);
		dm.aemOnlyMessages.push(newMessage);

		sendInProgressModDMUpdate(dm, modUserNames, editorUserNames, adminUserNames);
	}
};
