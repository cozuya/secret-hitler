const mongoose = require('mongoose');
const { Schema } = mongoose;
const ModThread = new Schema({
	_id: String, // game-name style id
	username: String, // username of the player
	aemMember: String, // aem member speaking to the player
	startDate: Date, // start date of the convo
	endDate: Date, // end date of the convo
	messages: Array // { content: String, type: String, author: String, staffRole: String, date: Date }
});

module.exports = mongoose.model('ModThread', ModThread);
