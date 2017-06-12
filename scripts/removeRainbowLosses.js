process.env['NODE_ENV'] = 'development';
process.env['DEBUG'] = 'game:scripts';

const mongoose = require('mongoose');
const Account = require('../models/account');
const debug = require('debug')('game:scripts');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/secret-hitler-app');

/**
 * This is a job that scrolls through all users with rainbow game losses and subtracts them from their total account score.
 */

debug('Removing rainbow losses...');

let numFixed = 0;

Account
    .find({ rainbowLosses: { $gt: 0 } })
    .cursor()
    .eachAsync(account => {
        // in case something goes wrong with the job and it needs to be run again
        if (!account.isFixed) {
            account.losses -= account.rainbowLosses;
            account.isFixed = true;
            return account.save().then(() => {
                numFixed++;
                debug(account.username);
            });
        }
    })
    .then(() => {
        debug(`Rainbow losses removed for ${numFixed} accounts. Job complete.`);
        mongoose.connection.close();
    });