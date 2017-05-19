const
    mongoose = require('mongoose'),
    GameSummary = require('./models/game-summary'),
    EnhancedGameSummary = require('./models/game-summary/EnhancedGameSummary'),
    { updateProfiles } = require('./models/profile/utils'),
    Profile = require('./models/profile'),
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