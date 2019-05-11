const child_process = require('child_process');
const fs = require('fs');
const path = require('path');

const mongoose = require('mongoose');

const GameSummary = require('../models/game-summary');

if (![2, 3, 5, 6].includes(process.argv.length)) {
	console.log(`Usage: node scripts/dumpGameSummariesAnon.js [limit (25000)] [output directory(./gameSummaries)] [tarball name (gameSummaries)] [skip (0)]`);
	process.exit(1);
}

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`, { useNewUrlParser: true });

let now = new Date();
console.log('Starting at', now);
const OUTPUT_DIR = process.argv[3] || 'gameSummaries';
const SUMMARY_DIR = `${OUTPUT_DIR}/games`;
if (!fs.existsSync(OUTPUT_DIR)) {
	fs.mkdirSync(OUTPUT_DIR);
}
if (!fs.existsSync(SUMMARY_DIR)) {
	fs.mkdirSync(SUMMARY_DIR);
}
fs.accessSync(SUMMARY_DIR, fs.constants.W_OK);
const summaries = [];
let count = 0;

GameSummary.find()
	.sort({ $natural: -1 })
	.skip(parseInt(process.argv[5], 10))
	.limit(parseInt(process.argv[2], 10) || 25000)
	.lean()
	.cursor()
	.eachAsync(summary => {
		count++;
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
		summaries.push(summary);
		if (!(count % 100)) {
			console.log(count + ' read');
		}
	})
	.then(() => {
		mongoose.connection.close();

		summaries.forEach((summary, id) => {
			// write each game out individually for tarring later
			fs.writeFileSync(path.join(SUMMARY_DIR, `${id + 1}.json`), JSON.stringify(summary));
			if (!((id + 1) % 100)) {
				console.log(id + 1 + ' processed');
			}
		});
	})
	.then(() => {
		console.log('\nCompressing...');
		const filename = process.argv[4] || 'gameSummaries';
		output_file = `${path.join(OUTPUT_DIR, `${filename}`)}.tar.gz`;
		child_process.execSync(`tar -zcf ${output_file} ${SUMMARY_DIR}`);
		console.log('Cleaning Up...');
		child_process.execSync(`rm -rf ${SUMMARY_DIR}`);
		console.log(`Tarball Created at ${output_file}.`);
		console.log('-------------------------------------\nTotal time taken: ', new Date() - now + 'ms');
	});
