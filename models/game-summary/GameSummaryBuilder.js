const GameSummary = require('./index');
const debug = require('debug')('game:summary');
const { fromNullable } = require('option');
const { List } = require('immutable');
const { objectContains } = require('../../utils');

module.exports = class GameSummaryBuilder {
	constructor(uid, date, gameSetting, players, logs = List()) {
		this._id = uid;
		this.date = date;
		this.gameSetting = gameSetting;
		this.players = players;
		this.logs = logs;

		debug('%O', { uid, date, gameSetting, players, logs: logs.toArray() });
	}

	publish() {
		const { _id, date, gameSetting, players, logs } = this;
		return new GameSummary({ _id, date, gameSetting, players, logs: logs.toArray() });
	}

	// (update: Object, targetAttrs: (?) Object) => GameSummaryBuilder
	// targetAttrs used to attach claims to the correct log
	updateLog(update, _targetAttrs) {
		const { logs } = this;
		const targetAttrs = fromNullable(_targetAttrs);

		const targetIndex = targetAttrs.map(attrs => logs.findLastIndex(log => objectContains(log, attrs))).valueOrElse(logs.size - 1);

		const nextTarget = Object.assign({}, logs.get(targetIndex), update);

		const nextLogs = logs
			.slice(0, targetIndex)
			.push(nextTarget)
			.concat(logs.slice(targetIndex + 1));

		return new GameSummaryBuilder(this._id, this.date, this.gameSetting, this.players, nextLogs);
	}

	nextTurn() {
		return new GameSummaryBuilder(this._id, this.date, this.gameSetting, this.players, this.logs.push({}));
	}
};
