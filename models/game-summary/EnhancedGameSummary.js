module.exports = class EnhancedGameSummary {

	constructor(summary) {
		// from summary
		this.summary = summary;
		this.uid = summary.uid;
		this.date = summary.date;
		this.players = summary.players;
		this.logs = summary.logs;

		// derived
		this.playerSize = this.players.length;

		this.numberOfTurns = this.logs.length;

		this.lastTurn = this.logs.slice(-1)[0];

		this.hitlerZone = (() => {
			const step = (turn, reds) => {
				const
					log = this.logs[turn],
					enactedPolicy = log && log.enactedPolicy;

				if (!log) {
					return -1;
				} else if (reds === 3) {
					return turn;
				} else if (enactedPolicy === 'fascist') {
					return step(turn + 1, reds + 1);
				} else {
					return step(turn + 1, reds);
				}
			};

			return step(0, 0);
		})();

		// bind own methods
		this._isId = this._isId.bind(this);
		this.playerOf = this.playerOf.bind(this);
		this.indexOf = this.indexOf.bind(this);
		this.loyaltyOf = this.loyaltyOf.bind(this);
	}

	_isId(identifier) {
		return Number.isInteger(identifier);
	}

	playerOf(identifier) {
		if (this._isId(identifier)) {
			return this.players[identifier];
		} else {
			return this.players.find(p => p.username === identifier);
		}
	}

	indexOf(identifier) {
		if (this._isId(identifier)) {
			return identifier;
		} else {
			return this.players.findIndex(p => p.username === identifier);
		}
	}

	isWinner(identifier) {
		return this.loyaltyOf(identifier) === this.lastTurn.enactedPolicy;
	}

	// different from `roleOf()`
	loyaltyOf(identifier) {
		const player = this.playerOf(identifier);

		if (player.role === 'fascist' || player.role === 'hitler') {
			return 'fascist';
		} else {
			return 'liberal';
		}
	}

	// different from `loyaltyOf()`
	roleOf(identifier) {
		const player = this.playerOf(identifier);
		return player.role;
	}

	votesOf(identifier) {
		const playerIndex = this.indexOf(identifier);

		return this.logs.map(log => {
			const { presidentId, chancellorId, votes } = log;

			return {
				presidentId,
				chancellorId,
				vote: votes[playerIndex]
			};
		});
	}

	shotsOf(identifier) {
		const playerIndex = this.indexOf(identifier);

		return this.logs
			.filter(log => log.presidentId === playerIndex && Number.isInteger(log.execution))
			.map(log => log.execution);
	}

};