// Deletes the local dev "seed" accounts (the quick-login users in Defaultmid.jsx) so that
// `node scripts/createAccounts.js` can recreate them fresh with the password "snipsnap".
// Local-only: connects to the dev mongod. Safe to re-run.
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Account = require("../models/account");
const Profile = require("../models/profile/index");

const filePath = path.join(__dirname, "..", "src", "frontend-scripts", "components", "section-main", "Defaultmid.jsx");
const fileString = fs.readFileSync(filePath, "utf8");
const nameRegex = /data-name="([A-z]+)" className="loginquick">/g;

const names = [];
let m;
while ((m = nameRegex.exec(fileString))) names.push(m[1]);

mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost:27017/secret-hitler-app", { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.once("open", async () => {
  console.log(`Deleting ${names.length} seed accounts: ${names.join(", ")}`);
  // Match case-insensitively: the local dump can contain differently-cased collisions
  // (e.g. "uthER"), and signup's existence check is itself case-insensitive.
  const ci = names.map((n) => new RegExp(`^${n}$`, "i"));
  const acc = await Account.deleteMany({ username: { $in: ci } });
  const prof = await Profile.deleteMany({ _id: { $in: ci } });
  console.log(`Removed ${acc.deletedCount} accounts and ${prof.deletedCount} profiles.`);
  await mongoose.connection.close();
});
