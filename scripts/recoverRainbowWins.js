const mongoose = require('mongoose');
const Account = require('../models/account');
const debug = require('debug')('game:scripts');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/secret-hitler-app');

/**
 * This is a job that scrolls through all users with rainbow game wins and adds them to their total account score.
 */

debug('Recovering rainbow wins...');

let numFixed = 0;

Account
    .find({ rainbowWins: { $gt: 0 } })
    .cursor()
    .eachAsync(account => {
        // in case something goes wrong with the job and it needs to be run again
        if (!account.isFixed) {
            account.wins += account.rainbowWins;
            account.isFixed = true;
            return account.save().then(() => {
                numFixed++;
                debug(account.username);
            });
        }
    })
    .then(() => {
        debug(`Rainbow wins recovered for ${numFixed} accounts. Job complete.`);
        mongoose.connection.close();
    });