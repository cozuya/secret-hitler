/**
 * Paladin of Ioun's game dump script for their api
 * DM Paladin of Ioun#5905 for more info
 */

const child_process = require('child_process');
const fs = require('fs');
const path = require('path');

const mongoose = require('mongoose');

const GameSummary = require('../models/game-summary');
const Game = require('../models/game');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`, { useNewUrlParser: true });

const now = new Date();
console.log('Starting at', now);
const OUTPUT_DIR = '/var/www/secret-hitler/public/game-dumps';
const SUMMARY_DIR = `${OUTPUT_DIR}/games`;
if (!fs.existsSync(OUTPUT_DIR)) {
	fs.mkdirSync(OUTPUT_DIR);
}
if (!fs.existsSync(SUMMARY_DIR)) {
	fs.mkdirSync(SUMMARY_DIR);
}
fs.accessSync(SUMMARY_DIR, fs.constants.W_OK);
let count = 0;

GameSummary.find()
	.sort({ $natural: -1 })
	.skip(parseInt(process.argv[5], 10))
	.limit(parseInt(process.argv[2], 10) || 25000)
	.lean()
	.cursor()
	.eachAsync(summary => {
		count++;
		Game.find({ uid: summary._id })
			.lean()
			.limit(1)
			.cursor()
			.eachAsync(game => {
				delete game._id;
				delete game.__v;
				const usernameToSeat = {};
				for (let i = 0; i < summary.players.length; i++) {
					usernameToSeat[summary.players[i].username] = i;
				}

				console.log(usernameToSeat);

				for (let i = 0; i < game.winningPlayers.length; i++) {
					game.winningPlayers[i].seat = usernameToSeat[game.winningPlayers[i].userName];
					delete game.winningPlayers[i].userName;
				}

				for (let i = 0; i < game.losingPlayers.length; i++) {
					game.losingPlayers[i].seat = usernameToSeat[game.losingPlayers[i].userName];
					delete game.losingPlayers[i].userName;
				}

				delete game.chats;
				delete game.uid;

				summary['gameOverview'] = game;
				console.log(JSON.stringify(summary));
				delete summary._id;
				delete summary.__v;
				for (i = 0; i < summary.players.length; i++) {
					delete summary.players[i]._id;
					delete summary.players[i].username;
					summary.players[i].seat = i;
				}
				for (i = 0; i < summary.logs.length; i++) {
					delete summary.logs[i]._id;
				}
				// summaries.push(summary);
				fs.writeFileSync(path.join(SUMMARY_DIR, `${count}.json`), JSON.stringify(summary));
				if (!(count % 100)) {
					console.log(count + ' read');
				}
			});
	})
	.then(() => {
		mongoose.connection.close();
	})
	.then(() => {
		console.log('\nCompressing...');
		const filename = 'apiDump';
		output_file = `${path.join(OUTPUT_DIR, `${filename}`)}.tar.gz`;
		child_process.execSync(`tar -zcf ${output_file} ${SUMMARY_DIR}`);
		console.log('Cleaning Up...');
		child_process.execSync(`rm -rf ${SUMMARY_DIR}`);
		console.log(`Tarball Created at ${output_file}.`);
		console.log('-------------------------------------\nTotal time taken: ', new Date() - now + 'ms');
	});
