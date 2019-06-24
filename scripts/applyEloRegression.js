const mongoose = require('mongoose');
const Account = require('../models/account');
const Config = require('../models/configs');

// db.configs.insert({for: 'eloRegression', created: new Date(), data: {enabled: true, overallMedian: 1650, maximumOverallLossPerDay: 40, seasonalMedian: 1600, maximumSeasonalLossPerDay: 35, gracePeriod: 35}})

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`, { useNewUrlParser: true });

Config.findOne({ for: 'eloRegression' })
  .then(config => {
    const data = config.data;
    if (data.enabled) {
      const { overallMedian: Om, maximumOverallLossPerDay: Ok, seasonalMedian: Sm, maximumSeasonalLossPerDay: Sk, gracePeriod: d } = data;
      Account.find({
        lastCompletedGame: { $exists: true, $lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        eloOverall: { $exists: true, $ne: 1650 },
        eloSeason: { $exists: true, $ne: 1600 }
      })
        .cursor()
        .eachAsync(account => {
          const Or_i = account.eloOverall, Sr_i = account.eloSeason, t = (new Date() - account.lastCompletedGame) / (24 * 60 * 60 * 1000);
          // Overall
          let Odiff = -(
            Or_i -
            (
              (Or_i - Om) *
              (Math.pow(
                (
                  (1 + Math.pow(Math.E, d)) /
                  (Math.pow(Math.E, Math.floor(t)) + Math.pow(Math.E, d))
                ),
                1 / Ok)
              ) + Om
            )
          );

          const overallDelta = Odiff > 0 ? Math.min(Odiff, Ok) : Odiff < 0 ? Math.max(Odiff, -Ok) : 0;


          // Seasonal
          let Sdiff = -(
            Sr_i -
            (
              (Sr_i - Sm) *
              (Math.pow(
                (
                  (1 + Math.pow(Math.E, d)) /
                  (Math.pow(Math.E, Math.floor(t)) + Math.pow(Math.E, d))
                ),
                1 / Sk)
              ) + Sm
            )
          );

          const seasonalDelta = Sdiff > 0 ? Math.min(Sdiff, Sk) : Sdiff < 0 ? Math.max(Sdiff, -Sk) : 0;

          // const seasonalTotal = account.eloRegressionSeason && account.eloRegressionSeason.totalAmount && account.eloRegressionSeason.totalAmount + seasonalDelta || seasonalDelta;
          // const overallTotal = account.eloRegressionSeason && account.eloRegressionSeason.totalAmount && account.eloRegressionSeason.totalAmount + overallDelta || overallDelta;

          // account.eloRegressionOverall = { lastDate: new Date(), lastAmount: overallDelta, totalAmount: overallTotal };
          // account.eloRegressionSeason = { lastDate: new Date(), lastAmount: seasonalDelta, totalAmount: seasonalTotal };

          console.log('User:', account.username, 'Overall Delta:', overallDelta, 'Om:', Om, '- Ok:', Ok, '- Or_i:', Or_i.toFixed(2), '- d:', d, '- t:', Math.floor(t));
          console.log('User:', account.username, 'Seasonal Delta:', seasonalDelta, 'Sm:', Sm, '- Sk:', Sk, '- Sr_i:', Sr_i.toFixed(2), '- d:', d, '- t:', Math.floor(t));
          console.log(account.eloRegressionOverall);
          console.log(account.eloRegressionSeason);

          // account.eloOverall = account.eloOverall + overallDelta;
          // account.eloSeason = account.eloSeason + seasonalDelta;

          // account.save();
        })
        .then(() => {
          console.log('All Accounts Regressed.');
          mongoose.connection.close();
          return 0;
        })
        .catch(e => {
          console.log('error in applying elo regression', e);
          return 1;
        });
    } else {
      console.log('Regression Disabled.');
      mongoose.connection.close();
      return 0;
    }
  })
  .catch(e => {
    console.log('error in gathering config for elo regression', e);
    return 1;
  });

