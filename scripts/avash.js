/* eslint-disable */
const mongoose = require('mongoose');
const Game = require('../models/game');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);


Game.find({"players.role":"merlin"}, {_id: 1, uid: 1})
    .cursor()
    .eachAsync(game => {
        console.log(game.uid);
    })
    .then(() => {
        console.log('done');
    })
    .catch(err => {
        console.log(err, 'err');
        mongoose.connection.close();
    });
