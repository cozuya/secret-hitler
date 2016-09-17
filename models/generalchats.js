'use strict';

let mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	Generalchats = new Schema({
		chats: Array
	});

module.exports = mongoose.model('Generalchats', Generalchats);