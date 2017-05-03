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
		this.playerOf = this.playerOf.bind(this);
		this.indexOf = this.indexOf.bind(this);
		this.loyaltyOf = this.loyaltyOf.bind(this);
	}

	playerOf(username, isId = false) {
		if (isId) {
			return this.players[username];
		} else {
			return this.players.find(p => p.username === username);
		}
	}

	indexOf(username, isId = false) {
		if (isId) {
			return username;
		} else {
			return this.players.findIndex(p => p.username === username);
		}
	}

	isWinner(username, isId = false) {
		return this.loyaltyOf(username, isId) === this.lastTurn.enactedPolicy;
	}

	// different from `roleOf()`
	// RETURNS: 'liberal' | 'fascist'
	loyaltyOf(username, isId = false) {
		const player = this.playerOf(username, isId);

		if (player.role === 'fascist' || player.role === 'hitler') {
			return 'fascist';
		} else {
			return 'liberal';
		}
	}

	roleOf(username, isId = false) {
		const player = this.playerOf(username, isId);
		return player.role;
	}

	votesOf(username, isId = false) {
		const playerIndex = this.indexOf(username, isId);

		return this.logs.map(log => {
			const { presidentId, chancellorId, votes } = log;

			return {
				presidentId,
				chancellorId,
				vote: votes[playerIndex]
			};
		});
	}

	shotsOf(username, isId = false) {
		const playerIndex = this.indexOf(username, isId);

		return this.logs
			.filter(log => log.presidentId === playerIndex && Number.isInteger(log.execution))
			.map(log => log.execution);
	}

};