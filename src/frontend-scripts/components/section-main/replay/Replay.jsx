/* eslint-disable spaced-comment */
import React from 'react'; // eslint-disable-line no-unused-vars
import { connect } from 'react-redux';
import toGameInfo from '../../../replay/toGameInfo';
import toDescription from '../../../replay/toDescription';
import classnames from 'classnames';
import { Map, List } from 'immutable';
import { some, none, fromNullable } from 'option';
import Tracks from '../Tracks.jsx';
import Players from '../Players.jsx';
import ReplayOverlay from './ReplayOverlay.jsx';
import ReplayControls from './ReplayControls.jsx';
import TrackPieces from './TrackPieces.jsx';

const mapStateToProps = ({ replay, userInfo }) => ({
	replay,
	isSmall: userInfo.gameSettings && userInfo.gameSettings.enableRightSidebarInGame
});

const mapDispatchToProps = dispatch => ({
	to: position => dispatch({ type: 'REPLAY_TO', position }),
	exit: () => dispatch({ type: 'CLOSE_REPLAY' })
});

const buildPlayback = (replay, to) => {
	const { ticks, position } = replay;
	const snapshot = ticks.get(position);
	const { turnNum, phase } = snapshot;


	/***********
	 * HELPERS *
	 ***********/

	// (turnNum: Int, [phases: List[String] | phase: String]) => Int
	const findTickPos = (turnNum, _phases) => {
		const phases = List.isList(_phases) ? _phases : List([ _phases ]);

		const i = ticks.findLastIndex(t =>
			t.turnNum === turnNum && phases.includes(t.phase));

		return i > -1 ? some(i) : none;
	};

	const bindTo = position => to.bind(null, position);


	/***********
	 * EXPORTS *
	 ***********/

	const hasNext = position < ticks.size - 1;
	const hasPrev = position > 0;

	const toBeginning = bindTo(0);
	const toEnd = bindTo(ticks.size - 1);

	const nextTick = bindTo(position + 1);
	const prevTick = bindTo(position - 1);

	const { nextPhase, prevPhase } = (() => {
		const toTurnWithPhaseElseFallback = (targetTurn, end) => {
			const fallbacks = Map({
				presidentLegislation: List(['topDeck', 'election']),
				chancellorLegislation: List(['topDeck', 'election']),
				topDeck: List(['presidentLegislation', 'election']),
				veto: List(['presidentLegislation', 'election']),
				policyEnaction: List(['election']),
				investigation: List(['policyEnaction', 'election']),
				policyPeek: List(['policyEnaction', 'election']),
				specialElection: List(['policyEnaction', 'election']),
				execution: List(['policyEnaction', 'election'])
			});

			const ideal = findTickPos(targetTurn, phase)
				.map(pos => bindTo(pos));

			const fallback = () => bindTo(
				fromNullable(fallbacks.get(phase))
					.flatMap(fallbackPhases => findTickPos(targetTurn, fallbackPhases))
					.valueOrElse(end)
			);

			return ideal.valueOrElse(fallback);
		};

		return {
			nextPhase: toTurnWithPhaseElseFallback(turnNum + 1, ticks.size - 1),
			prevPhase: toTurnWithPhaseElseFallback(turnNum - 1, 0)
		};
	})();

	const { hasLegislation, hasAction, toElection, toLegislation, toAction } = (() => {
		const rotate = (cycles, fallback) => {
			return findTickPos(
				turnNum,
				fromNullable(cycles.get(phase))
					.valueOrElse(fallback)
			);
		};

		const electionPos = rotate(
			Map({
				candidacy: 'nomination',
				nomination: 'election',
				election: 'candidacy'
			}),
			'candidacy'
		);

		const legislationPos = rotate(
			Map({
				presidentLegislation: List(['chancellorLegislation']),
				chancellorLegislation: List(['veto', 'policyEnaction']),
				topDeck: List(['policyEnaction']),
				veto: List(['policyEnaction', 'topDeck', 'presidentLegislation']),
				policyEnaction: List(['presidentLegislation', 'topDeck']),
			}),
			List(['presidentLegislation', 'topDeck'])
		);

		const actionPos = findTickPos(
			turnNum,
			List(['investigation', 'policyPeek', 'specialElection', 'execution'])
		);

		return {
			hasLegislation: legislationPos.isSome(),
			hasAction: actionPos.isSome(),
			toElection: bindTo(electionPos.valueOrElse(position)),
			toLegislation: bindTo(legislationPos.valueOrElse(position)),
			toAction: bindTo(actionPos.valueOrElse(position))
		};
	})();

	const toTurn = targetTurn => to(
		findTickPos(targetTurn, 'candidacy')
			.valueOrElse(position)
	);

	return { hasNext, hasPrev, toBeginning, toEnd, nextTick, prevTick, nextPhase, prevPhase,
		hasLegislation, hasAction, toElection, toLegislation, toAction, toTurn };
};

const Replay = ({ replay, isSmall, to }) => {
	const { ticks, position, game } = replay;

	const snapshot = ticks.get(position);

	const playback = buildPlayback(replay, to);
	const gameInfo = toGameInfo(snapshot);
	const userInfo = { username: '' };

	const { phase } = snapshot;
	const description = toDescription(snapshot, game);

	return (
		<section className={classnames({ small: isSmall, big: !isSmall }, 'game')}>
			<div className="ui grid">
				<div className="left-side eight wide column">
					<ReplayOverlay snapshot={snapshot} />
					<TrackPieces
						phase={snapshot.phase}
						track={snapshot.track}
						electionTracker={snapshot.electionTracker} />
					<Tracks
						gameInfo={gameInfo}
						userInfo={userInfo} />
				</div>
				<div className="right-side eight wide column">
					<ReplayControls
						turnsSize={ticks.last().turnNum + 1}
						turnNum={snapshot.turnNum}
						phase={phase}
						description={description}
						playback={playback} />
				</div>
			</div>
			<div className="row players-container">
				<Players
					userList={{}}
					onClickedTakeSeat={null}
					socket={null}
					userInfo={userInfo}
					gameInfo={gameInfo} />
			</div>
		</section>
	);
};

const ReplayWrapper = ({ replay, isSmall, to, exit }) => {
	const children = (() => {
		switch (replay.status) {
		case 'INITIAL':
		case 'LOADING':
			return (
				<div className="ui active dimmer">
					<div className="ui huge text loader">Loading</div>
				</div>
			);
		case 'NOT_FOUND':
			return (
				<h1 className="not-found ui icon center aligned header">
					<i className="settings icon" />
					<div className="content">Replay not found</div>
				</h1>
			);
		case 'READY':
			return <Replay replay={replay} isSmall={isSmall} to={to} />;
		}
	})();

	return (
		<section id="replay" className="ui segment">
			<button className="exit ui inverted red button" onClick={exit}>
				<i className="sign out icon"></i>
				Exit Replay
			</button>
			{children}
		</section>
	);
};

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ReplayWrapper);
