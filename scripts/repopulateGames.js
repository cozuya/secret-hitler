const mongoose = require('mongoose');
const GameSummary = require('../models/game-summary');
const { List } = require('immutable');
const debug = require('debug')('game:summary');
const {
	mockGameSummary,
	p5HitlerElected,
	p7HitlerKilled,
	p7LiberalWin,
	veto,
	veto2
} = require('../__test__/mocks');

/*
 * This job replenishes the database with mock games.
 * Useful for testing stuff related to profiles and replays.
 *
 * ONLY RUN ON DEV!
 */

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/secret-hitler-app');

debug('Repopulating mock games');

const mocks = List([
	mockGameSummary,
	p5HitlerElected,
	p7HitlerKilled,
	p7LiberalWin,
	veto,
	veto2
]);

const savePromises = mocks.map(m => {
	debug('Saving %s', m._id);
	return new GameSummary(m).save();
});

Promise.all(savePromises).then(() => {
	debug('All games repopulated');
	mongoose.connection.close();
});
