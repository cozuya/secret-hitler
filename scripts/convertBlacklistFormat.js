const Account = require("../models/account");
const mongoose = require("mongoose");

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

let count = 0;

Account.find({ "gameSettings.blacklist.0": { $exists: true } })
  .cursor()
  .eachAsync((account) => {
    account.gameSettings.blacklist = account.gameSettings.blacklist.map((userName) => ({ userName }));

    count++;
    if (count % 100 == 0) {
      console.log(count + " processed");
    }

    // return the save so eachAsync awaits it — otherwise the cursor drains and the trailing
    // .then() logs "done" while writes are still pending (same bug class as the eloReset.js fix).
    return account.save();
  })
  .then(() => {
    console.log("done " + count);
    mongoose.connection.close();
  });
