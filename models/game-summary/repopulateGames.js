const mongoose = require('mongoose');
const GameSummary = require('./index');
const mockGameSummary = require('../../__test__/mocks/mockGameSummary');
const p5HitlerElected = require('../../__test__/mocks/p5HitlerElected');
const p7HitlerKilled = require('../../__test__/mocks/p7HitlerKilled');
const p7LiberalWin = require('../../__test__/mocks/p7LiberalWin');
const { List } = require('immutable');
const debug = require('debug')('game:summary');

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
    p7LiberalWin
]);

const savePromises = mocks.map(m => {
	debug('Saving %s', m._id)
	return (new GameSummary(m)).save();
});

Promise.all(savePromises)
	.then(() => {
		debug('All games repopulated');
		mongoose.connection.close();
	});