const child_process = require('child_process');
const fs = require('fs');
const path = require('path');

const mongoose = require('mongoose');

const Account = require('../models/account');
const Game = require('../models/game');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

const OUTPUT_DIR = '/var/www/secret-hitler/public/game-dumps';
const GAMES_DIR = `${OUTPUT_DIR}/games`;
child_process.execSync(`mkdir -p ${GAMES_DIR}`);
fs.accessSync(GAMES_DIR, fs.constants.W_OK);
let count = 0;

Game.find()
	.skip(parseInt(process.argv[2], 10))
	.limit(25000)
	.lean()
	.cursor()
	.eachAsync(game => {
		// first collect all usernames
		const playersByName = new Map(); // cache players here for removing pii later
		const usernames = [].concat(
			...['winning', 'losing'].map(gameResult => {
				return game[gameResult + 'Players'].map(player => {
					const uname = player.username || player.userName;
					playersByName[uname] = player;
					return uname;
				});
			})
		);

		// then find all hashUids at once, for efficiency
		const usernameClauses = usernames.map(username => ({ username }));

		Account.find({ $or: usernameClauses }, 'username hashUid')
			.lean()
			.cursor()
			.eachAsync(account => {
				const hashUid = account.hashUid;

				// remove pii from player now that we know the hashUid
				// according to schema in /routes/socket/game/end-game.js:27
				const player = playersByName[account.username];
				delete player._id;
				delete player.username;
				delete player.userName;
				player.hashUid = hashUid;

				// sanitize the chats of mentions of this user
				const unameRegex = new RegExp('\\b' + account.username + '\\b', 'gi');

				// chat schema is inferred from /routes/socket/game/{election, user-events}.js
				if (!game || !game.chats) {
					return;
				}
				game.chats.forEach(chat => {
					const chatUname = chat.username || chat.userName;
					// replace username of any chats made by this user
					if (chatUname === account.username) {
						delete chat.username;
						delete chat.userName;
						chat.hashUid = hashUid;
					}

					// replace mentions of this user in the text of all chats
					if (Array.isArray(chat.chat)) {
						// more robust than `if (chat.gameChat || chat.isClaim)`
						chat.chat.forEach(chunk => {
							chunk.text = chunk.text.replace(unameRegex, hashUid);
						});
					} else {
						chat.chat = chat.chat.replace(unameRegex, hashUid);
					}
				});
			})
			.then(() => {
				// write each game out individually for tarring later
				fs.writeFileSync(path.join(GAMES_DIR, game.uid + '.json'), JSON.stringify(game));
				count++;
				if (!(count % 1000)) {
					console.log(count + ' processed');
				}
			});
	})
	.then(() => {
		console.log('all done');
		mongoose.connection.close();
		output_file = `${path.join(OUTPUT_DIR, `games${process.argv[3]}`)}.tar.gz`;
		child_process.execSync(`tar czf ${output_file} .`, { cwd: GAMES_DIR });
	});
