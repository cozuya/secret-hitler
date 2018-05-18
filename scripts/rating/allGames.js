const mongoose = require('mongoose');
const Game = require('../../models/game'); // temp

module.exports = async rate => {
	try {
		mongoose.Promise = global.Promise;
		await mongoose.connect(`mongodb://localhost:15726/secret-hitler-app`);
		const cursor = await Game.find({}, { chats: 0 }).cursor();
		for (let game = await cursor.next(); game != null; game = await cursor.next()) {
			// Ignore casual games
			if (!game.casualGame) {
				await rate(game);
			}
		}
	} catch (error) {
		console.error(error);
	} finally {
		await mongoose.disconnect();
	}
};