const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Generalchats = new Schema({
	chats: Array
});

module.exports = mongoose.model('Generalchats', Generalchats);
