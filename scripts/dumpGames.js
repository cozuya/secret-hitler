const mongoose = require('mongoose');
const Game = require('../models/game');
const GameSummary = require('../models/game-summary');
const { List } = require('immutable');
const debug = require('debug')('game:summary');


/**
 * This script gets all game summaries for a day, strips personally
 * identifiable player information, and outputs the contents of the summaries
 * to stdout.
 */


// Determine the date for which we want to dump game summaries
//
// ... validate args
if (process.argv.length >= 4) {
    console.log(`Usage: ${process.argv[0]} ${process.argv[1]} [date (e.g. "2017-01-31")]`);
    process.exit(1);
}
// ... get the date, if passed in
if (process.argv.length == 3) {
    if (isNaN(Date.parse(process.argv[2]))) {
        console.log(`Invalid date: "${date}".  Expected format: "YYYY-MM-DD".`);
        process.exit(1);
    }
    startDate = new Date(process.argv[2]);
}
// ... default to today
if (process.argv.length == 2) {
    startDate = new Date();
}
endDate = new Date(startDate.getTime() + (24 * 60 * 60 * 1000));
dumpDateFrom = `${startDate.getFullYear()}-${startDate.getMonth()+1}-${startDate.getDate()}`;
dumpDateTo = `${endDate.getFullYear()}-${endDate.getMonth()+1}-${endDate.getDate()}`;


// Connect to mongo
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/secret-hitler-app');


// Dump summaries for the day
var summaries = [];
console.log(new Date(dumpDateFrom))
console.log(new Date(dumpDateTo))
GameSummary.find({
        date: {$gte: new Date(dumpDateFrom), $lt: new Date(dumpDateTo)}
    })
    .lean()
	.cursor()
	.eachAsync(summary => {

        // ... strip personally identifable information
        for (i = 0; i < summary.players.length; i++) {
            delete summary.players[i]._id
            delete summary.players[i].username
        }
        summaries.push(summary);

	})
	.then(() => {

        // ... dump summaries to stdout
        console.log(JSON.stringify(summaries, null, 2));

        // ... close db connection
		mongoose.connection.close();

	});
