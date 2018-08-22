const mongoose = require('mongoose');
const { Schema } = mongoose;
const Gamestatistics = new Schema({
	isRainbow: Boolean,
	rebalance6p: Boolean,
	rebalance7p: Boolean,
	rebalance9p: Boolean,
	rerebalance9p: Boolean,
	rebalance9p2f: Boolean,
	fascistBias: Number,
	liberalBias: Number
});

module.exports = mongoose.model('GameStatistics', Gamestatistics);
