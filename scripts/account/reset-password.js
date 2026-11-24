const mongoose = require("mongoose");
const Account = require("../../models/account");

const TEMP_PASSWORD = "ChangeMe123";

if (process.argv.length === 3) {
  mongoose.Promise = global.Promise;
  mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);
  const username = process.argv[2];
  Account.findOne({ username })
    .then(async (user) => {
      if (user) {
        await user.setLocalPassword(TEMP_PASSWORD);
        console.log(`Set ${username}'s password to ${TEMP_PASSWORD}`);
      } else {
        console.log(`No user with the username ${username} found`);
      }
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => mongoose.connection.close());
} else if (process.argv.length > 3) {
  console.error("Error: To many arguments");
} else {
  console.error("Error: Please specify an account name");
}
