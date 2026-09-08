// Run once, off-peak, with MONGO_URL set to the intended database. Safe to rerun;
// this only creates the non-unique uid index and never drops or replaces indexes.
const mongoose = require("mongoose");
const Game = require("../models/game");

async function main() {
  if (!process.env.MONGO_URL) throw new Error("MONGO_URL must identify the database to index");
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: false,
    });
    const name = await Game.collection.createIndex({ uid: 1 }, { background: true });
    console.log("Game uid index ready:", name);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("Game uid index creation failed:", err.message);
  process.exitCode = 1;
});
