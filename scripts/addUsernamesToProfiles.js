const mongoose = require('mongoose');
const Profile = require('../models/profile');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

Profile.find({})
	.cursor()
	.eachAsync(profile => {
		profile.username = profile._id;
		profile.save();
	})
	.then(() => {
		console.log('profile updates complete');
	});
