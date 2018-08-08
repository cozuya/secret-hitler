const mongoose = require('mongoose');
const { Schema } = mongoose;
const Bias = new Schema({
	size: {
		type: Number,
		required: true
	},
	balance: {
		type: Number,
		required: true
	},
	liberal: {
		type: Number,
		default: 1600,
		required: true
	},
	fascist: {
		type: Number,
		default: 1600,
		required: true
	}
});

module.exports = mongoose.model('Bias', Bias);
