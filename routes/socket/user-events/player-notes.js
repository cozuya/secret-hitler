const PlayerNote = require('../../../models/playerNote');
const { sendPlayerNotes } = require('../user-requests');
/**
 * @param {object} socket - user socket reference.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdatedPlayerNote = (socket, data) => {
	PlayerNote.findOne({ userName: data.userName, notedUser: data.notedUser }).then(note => {
		if (note) {
			note.note = data.note;
			note.save(() => {
				sendPlayerNotes(socket, { userName: data.userName, seatedPlayers: [data.notedUser] });
			});
		} else {
			const playerNote = new PlayerNote({
				userName: data.userName,
				notedUser: data.notedUser,
				note: data.note
			});

			playerNote.save(() => {
				sendPlayerNotes(socket, { userName: data.userName, seatedPlayers: [data.notedUser] });
			});
		}
	});
};
