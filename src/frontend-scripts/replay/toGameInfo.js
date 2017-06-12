export default function toGameInfo(snapshot) {
	const gameState = {
		isTracksFlipped: true,
		undrawnPolicyCount: snapshot.deckSize
	};

	const general = {
		playerCount: snapshot.players.size,
		experiencedMode: false
	};

	const cardFlingerState = [];

	const publicPlayersState =
		snapshot.players.map((p, i) => {
			const maybe = (predicate, field, value) => (
				predicate ? { [field]: value } : {}
			);

			const isSpecialElection = Number.isInteger(snapshot.specialElection);

			const maybePresident = maybe(
				!isSpecialElection && snapshot.presidentId === i
				|| isSpecialElection && snapshot.specialElection === i,
				'governmentStatus',
				'isPresident'
			);

			const maybeChancellor = maybe(
				!isSpecialElection && snapshot.chancellorId === i,
				'governmentStatus',
				'isChancellor'
			);

			const cardStatus = (() => {
				const f = (cardDisplayed, isFlipped, cardFront, cardBack) => ({
					cardDisplayed, isFlipped, cardFront, cardBack
				});

				if (snapshot.gameOver) {
					return f(true, true, '', {
						cardName: p.role,
						icon: 0
					});
				}

				switch(snapshot.phase) {
				case 'election':
					return f(true, true, 'ballot', {
						cardName: snapshot.votes.get(i)
							.map(x => x ? 'ja' : 'nein')
							.valueOrElse(null)
					});
				case 'investigation':
					const isInvTarget = i === snapshot.investigationId;

					return f(
						isInvTarget,
						isInvTarget,
						'role',
						{ cardName: isInvTarget && 'membership-' + p.loyalty }
					);
				default:
					return f(false, false, '', {});
				}
			})();

			const base = {
				isDead: p.isDead,
				userName: p.username,
				nameStatus: p.role,
				connected: true,
				cardStatus
			};

			return Object.assign({},
				base,
				maybePresident,
				maybeChancellor
			);
		}).toArray();

	const trackState = {
		fascistPolicyCount: snapshot.track.reds,
		liberalPolicyCount: snapshot.track.blues,
		enactedPolicies: [],
		isBlurred: [
			'presidentLegislation',
			'chancellorLegislation',
			'policyPeek'
		].includes(snapshot.phase),
		isHidden: true
	};

	return {
		gameState,
		publicPlayersState,
		trackState,
		general,
		cardFlingerState
	};
};