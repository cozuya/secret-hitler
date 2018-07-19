const mongoose = require('mongoose');
const Game = require('../models/game');
const moment = require('moment');
const _ = require('lodash');
const fs = require('fs');
const labels = [];
const data = {};
const { CURRENTSEASONNUMBER } = require('../src/frontend-scripts/constants');

const allPlayerGameData = {
	fascistWinCount: 0,
	totalGameCount: 0,
	fascistWinCountSeason: 0,
	totalGameCountSeason: 0
};
const fivePlayerGameData = {
	fascistWinCount: 0,
	totalGameCount: 0,
	fascistWinCountSeason: 0,
	totalGameCountSeason: 0
};
const sixPlayerGameData = {
	fascistWinCount: 0,
	totalGameCount: 0,
	rebalancedFascistWinCount: 0,
	rebalancedTotalGameCount: 0,
	fascistWinCountSeason: 0,
	totalGameCountSeason: 0,
	rebalancedFascistWinCountSeason: 0,
	rebalancedTotalGameCountSeason: 0
};
const sevenPlayerGameData = {
	fascistWinCount: 0,
	totalGameCount: 0,
	rebalancedFascistWinCount: 0,
	rebalancedTotalGameCount: 0,
	fascistWinCountSeason: 0,
	totalGameCountSeason: 0,
	rebalancedFascistWinCountSeason: 0,
	rebalancedTotalGameCountSeason: 0
};
const eightPlayerGameData = {
	fascistWinCount: 0,
	totalGameCount: 0,
	fascistWinCountSeason: 0,
	totalGameCountSeason: 0
};
const ninePlayerGameData = {
	fascistWinCount: 0,
	totalGameCount: 0,
	rebalanced2fFascistWinCount: 0,
	rebalanced2fTotalGameCount: 0,
	fascistWinCountSeason: 0,
	totalGameCountSeason: 0,
	rebalanced2fFascistWinCountSeason: 0,
	rebalanced2fTotalGameCountSeason: 0
};
const tenPlayerGameData = {
	fascistWinCount: 0,
	totalGameCount: 0,
	fascistWinCountSeason: 0,
	totalGameCountSeason: 0
};

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:15726/secret-hitler-app`);

Game.find({})
	.cursor()
	.eachAsync(game => {
		const playerCount = game.losingPlayers.length + game.winningPlayers.length;
		const fascistsWon = game.winningTeam === 'fascist';
		const gameDate = moment(new Date(game.date)).format('l');
		const rebalanced = (game.rebalance6p && playerCount === 6) || (game.rebalance7p && playerCount === 7) || (game.rebalance9p && playerCount === 9);

		if (
			gameDate === '5/13/2017' ||
			gameDate === moment(new Date()).format('l') ||
			(rebalanced &&
				playerCount === 9 &&
				(gameDate === '10/29/2017' || gameDate === '10/30/2017' || gameDate === '10/31/2017' || gameDate === '11/1/2017' || gameDate === '11/2/2017'))
		) {
			return;
		}

		switch (playerCount) {
			case 5:
				fivePlayerGameData.totalGameCount++;
				if (fascistsWon) {
					fivePlayerGameData.fascistWinCount++;
				}

				if (game.season && game.season === CURRENTSEASONNUMBER) {
					fivePlayerGameData.totalGameCountSeason++;
					if (fascistsWon) {
						fivePlayerGameData.fascistWinCountSeason++;
					}
				}
				break;
			case 6:
				if (rebalanced) {
					if (fascistsWon) {
						sixPlayerGameData.rebalancedFascistWinCount++;
					}
					sixPlayerGameData.rebalancedTotalGameCount++;

					if (game.season && game.season === CURRENTSEASONNUMBER) {
						sixPlayerGameData.rebalancedTotalGameCountSeason++;
						if (fascistsWon) {
							sixPlayerGameData.rebalancedFascistWinCountSeason++;
						}
					}
				} else {
					if (fascistsWon) {
						sixPlayerGameData.fascistWinCount++;
					}
					sixPlayerGameData.totalGameCount++;

					if (game.season && game.season === CURRENTSEASONNUMBER) {
						sixPlayerGameData.totalGameCountSeason++;
						if (fascistsWon) {
							sixPlayerGameData.fascistWinCountSeason++;
						}
					}
				}
				break;
			case 7:
				if (rebalanced) {
					if (fascistsWon) {
						sevenPlayerGameData.rebalancedFascistWinCount++;
					}
					sevenPlayerGameData.rebalancedTotalGameCount++;

					if (game.season && game.season === CURRENTSEASONNUMBER) {
						sevenPlayerGameData.rebalancedTotalGameCountSeason++;
						if (fascistsWon) {
							sevenPlayerGameData.rebalancedFascistWinCountSeason++;
						}
					}
				} else {
					if (fascistsWon) {
						sevenPlayerGameData.fascistWinCount++;
					}
					sevenPlayerGameData.totalGameCount++;

					if (game.season && game.season === CURRENTSEASONNUMBER) {
						sevenPlayerGameData.totalGameCountSeason++;
						if (fascistsWon) {
							sevenPlayerGameData.fascistWinCountSeason++;
						}
					}
				}
				break;
			case 8:
				eightPlayerGameData.totalGameCount++;
				if (fascistsWon) {
					eightPlayerGameData.fascistWinCount++;
				}
				if (game.season && game.season === CURRENTSEASONNUMBER) {
					eightPlayerGameData.totalGameCountSeason++;
					if (fascistsWon) {
						eightPlayerGameData.fascistWinCountSeason++;
					}
				}
				break;
			case 9:
				if (rebalanced) {
					if (fascistsWon) {
						ninePlayerGameData.rebalancedFascistWinCount++;
					}
					ninePlayerGameData.rebalancedTotalGameCount++;
				} else if (rebalanced9p2f) {
					if (fascistsWon) {
						ninePlayerGameData.rebalanced2fFascistWinCount++;
					}
					ninePlayerGameData.rebalanced2fTotalGameCount++;

					if (game.season && game.season === CURRENTSEASONNUMBER) {
						ninePlayerGameData.rebalanced2fTotalGameCountSeason++;
						if (fascistsWon) {
							ninePlayerGameData.rebalanced2fFascistWinCountSeason++;
						}
					}
				} else {
					if (fascistsWon) {
						ninePlayerGameData.fascistWinCount++;
					}
					ninePlayerGameData.totalGameCount++;
					if (game.season && game.season === CURRENTSEASONNUMBER) {
						ninePlayerGameData.totalGameCountSeason++;
						if (fascistsWon) {
							ninePlayerGameData.fascistWinCountSeason++;
						}
					}
				}
				break;
			case 10:
				tenPlayerGameData.totalGameCount++;
				if (fascistsWon) {
					tenPlayerGameData.fascistWinCount++;
				}
				if (game.season && game.season === CURRENTSEASONNUMBER) {
					tenPlayerGameData.totalGameCountSeason++;
					if (fascistsWon) {
						tenPlayerGameData.fascistWinCountSeason++;
					}
				}
				break;
		}
		allPlayerGameData.totalGameCount++;
		if (fascistsWon) {
			allPlayerGameData.fascistWinCount++;
		}
		if (game.season && game.season === CURRENTSEASONNUMBER) {
			allPlayerGameData.totalGameCountSeason++;
			if (fascistsWon) {
				allPlayerGameData.fascistWinCountSeason++;
			}
		}
		labels.push(moment(new Date(game.date)).format('l'));
	})
	.then(() => {
		const uLabels = _.uniq(labels),
			series = new Array(uLabels.length).fill(0);

		labels.forEach(date => {
			series[uLabels.indexOf(date)]++;
		});

		data.completedGames = {
			labels: uLabels,
			series
		};

		data.allPlayerGameData = allPlayerGameData;
		data.fivePlayerGameData = fivePlayerGameData;
		data.sixPlayerGameData = sixPlayerGameData;
		data.sevenPlayerGameData = sevenPlayerGameData;
		data.eightPlayerGameData = eightPlayerGameData;
		data.ninePlayerGameData = ninePlayerGameData;
		data.tenPlayerGameData = tenPlayerGameData;
		fs.writeFile('/var/www/secret-hitler/data/data.json', JSON.stringify(data), () => {
			mongoose.connection.close();
		});
	});
