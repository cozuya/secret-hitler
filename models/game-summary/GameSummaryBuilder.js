const
	GameSummary = require('./index'),
	debug = require('debug')('game:summary');

module.exports = class GameSummaryBuilder {

	constructor(uid, date, players, logs = []) {
		this._id = uid;
		this.date = date;
		this.players = players;
		this.logs = logs;

		debug('%O', { uid, date, players, logs });
	}

	publish() {
		const { _id, date, players, logs } = this;
		return new GameSummary({ _id, date, players, logs });
	}

	// applyToPreviousTurn gets set to true for claims that are made after the start of the next turn
	updateLog(update, applyToPreviousTurn = false) {
		const
			init = this.logs.slice(0, -1),
			dropLastTwo = this.logs.slice(0, -2),
			penultimate = this.logs.slice(-2, -1)[0],
			last = this.logs.slice(-1)[0],
			nextLog = log => Object.assign({}, log, update),
			nextLogs = (() => {
				if (applyToPreviousTurn) {
					return dropLastTwo.concat(nextLog(penultimate)).concat(last);
				} else {
					return init.concat(nextLog(last));
				}
			})();

		return new GameSummaryBuilder(this._id, this.date, this.players, nextLogs);
	}

	nextTurn() {
		return new GameSummaryBuilder(this._id, this.date, this.players, this.logs.concat({}));
	}

};