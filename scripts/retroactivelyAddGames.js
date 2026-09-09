const mongoose = require("mongoose");
const Game = require("../models/game");
const Account = require("../models/account");
const { seasonCounterFields } = require("../src/shared/season");

let count = 0;
const season = 17;
const SEASON_FIELDS = seasonCounterFields(season);

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`, { useNewUrlParser: true });

Game.find({
  // date: {
  // 	$gte: new Date('2019-04-01 00:00:00.000'),
  // 	$lte: new Date()
  // },
  season: 17,
  casualGame: false,
})
  .cursor()
  .eachAsync((game) => {
    game.winningPlayers.forEach((username) => {
      Account.findOne({ username: username.userName })
        .cursor()
        .eachAsync((user) => {
          user[SEASON_FIELDS.wins] = user[SEASON_FIELDS.wins] ? user[SEASON_FIELDS.wins] + 1 : 1;
          if (game.isRainbow)
            user[SEASON_FIELDS.rainbowWins] = user[SEASON_FIELDS.rainbowWins] ? user[SEASON_FIELDS.rainbowWins] + 1 : 1;
          user.save();
        });
    });

    game.losingPlayers.forEach((username) => {
      Account.findOne({ username: username.userName })
        .cursor()
        .eachAsync((user) => {
          user[SEASON_FIELDS.losses] = user[SEASON_FIELDS.losses] ? user[SEASON_FIELDS.losses] + 1 : 1;
          if (game.isRainbow)
            user[SEASON_FIELDS.rainbowLosses] = user[SEASON_FIELDS.rainbowLosses]
              ? user[SEASON_FIELDS.rainbowLosses] + 1
              : 1;
          user.save();
        });
    });

    count++;

    if (!(count % 100)) {
      console.log(count + " games processed.");
    }
  })
  .then(() => {
    console.log("done");
    mongoose.connection.close();
  });
