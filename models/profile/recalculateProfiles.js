const
    mongoose = require('mongoose'),
    GameSummary = require('../game-summary'),
    EnhancedGameSummary = require('../game-summary/EnhancedGameSummary'),
    { updateProfiles } = require('./utils'),
    Profile = require('./'),
    debug = require('debug')('game:profile');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/secret-hitler-app');

/**
 * This is a job to scroll through all games in the database and update player profiles.
 * Run this whenever stat calculations get tweaked or new stats are added.
 */ 

recalculateAllProfiles();

function recalculateAllProfiles() {
    debug('Recalculating all player profiles');

    const version = Math.random().toString(36).substring(6);

    GameSummary
        .find(null, null, { sort: { date: 'asc' }})
        .cursor()
        .map(game => new EnhancedGameSummary(game))
        .eachAsync(game => updateProfiles(game, { version }))
        .then(() => {
            debug('Player profiles recalculated');
            mongoose.connection.close();
        });
}