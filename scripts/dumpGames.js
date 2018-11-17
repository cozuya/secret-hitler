const child_process = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');
const GameSummary = require('../models/game-summary');

/**
 * This script gets all game summaries for a day, strips personally
 * identifiable player information, and outputs the contents of the summaries
 * to stdout.
 */

// Ideally we'd take this via command line arguments, but it's already
// getting a bit unwieldy.  For local testing, either create this directory
// or change it to something different.
const OUTPUT_DIR = '/var/www/secret-hitler/public/profile-dumps';

// Determine the date for which we want to dump game summaries
//
// ... validate args
if (process.argv.length >= 4) {
	console.log(`Usage: ${process.argv[0]} ${process.argv[1]} [--all] [date (e.g. "2017-01-31")]`);
	process.exit(1);
}
if (process.argv.length == 3) {
	// ... dump all dates if requested
	if (process.argv[2] == '--all') {
		startDate = new Date('1970-01-01');
		endDate = new Date('2100-01-01');

		// ... else, get the date the user requested
	} else {
		if (isNaN(Date.parse(process.argv[2]))) {
			console.log(`Invalid date: "${date}".  Expected format: "YYYY-MM-DD".`);
			process.exit(1);
		}
		startDate = new Date(process.argv[2]);
		endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
	}
}
// ... default to yesterday
if (process.argv.length == 2) {
	endDate = new Date();
	startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
}
dumpDateFrom = `${startDate.getFullYear()}-${startDate.getMonth() + 1}-${startDate.getDate()}`;
dumpDateTo = `${endDate.getFullYear()}-${endDate.getMonth() + 1}-${endDate.getDate()}`;

// Connect to mongo
mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

// Dump summaries for the day
const summaries = [];
GameSummary.find({
	date: { $gte: new Date(dumpDateFrom), $lt: new Date(dumpDateTo) }
})
	.lean()
	.cursor()
	.eachAsync(summary => {
		// ... strip personally identifiable information
		for (i = 0; i < summary.players.length; i++) {
			delete summary.players[i]._id;
			delete summary.players[i].username;
		}
		summaries.push(summary);
	})
	.then(() => {
		// ... write summaries
		//
		// We create the initial tmpfile to make sure we aren't stepping on
		// the toes of any other activity going on in the temp directory.  We
		// do a bit of additional juggling inside the tempfolder by creating
		// another folder with the date of the game summaries so that when we
		// go to create the output archive the resulting directory has a
		// sensical name (e.g. untarring will result in the files
		// "2017-01-01/gameFoo", "2017-01-01/gameBar").
		fs.mkdtemp(path.join(os.tmpdir(), 'game-summaries-'), (err, tmpFolder) => {
			let folder = path.join(tmpFolder, dumpDateFrom);
			fs.mkdir(folder, err => {
				for (let summary of summaries) {
					debugger;
					fs.writeFileSync(path.join(folder, summary._id), JSON.stringify(summary));
				}

				// ... determine output filename
				if (process.argv.length == 3 && process.argv[2] == '--all') {
					output_file = `${path.join(OUTPUT_DIR, 'all')}.tar.gz`;
				} else {
					output_file = `${path.join(OUTPUT_DIR, dumpDateFrom)}.tar.gz`;
				}

				// ... tar gz the results
				child_process.execSync(`tar -zcvf ${output_file} .`, { cwd: tmpFolder });

				// ... cleanup the temporary files
				//
				// I'd prefer to use something in the fs module, but that's
				// only for deleting non-empty directories.  So we'll just
				// let another process do the work.
				child_process.execSync(`rm -rf ${tmpFolder}`);
			});
		});

		// ... close db connection
		mongoose.connection.close();
	});
