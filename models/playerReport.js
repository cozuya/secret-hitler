const mongoose = require("mongoose");
const { Schema } = mongoose;
const playerReport = new Schema({
  date: Date,
  gameUid: String,
  reportedPlayer: String,
  reason: String,
  reportingPlayer: String,
  gameType: String,
  comment: String,
  isActive: Boolean,
  neighborMessageId: String,
  neighborChatContext: Array, // Captured server-side, available only to authorized reviewers after the game.
});

module.exports = mongoose.model("PlayerReport", playerReport);
