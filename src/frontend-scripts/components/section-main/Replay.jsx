import React from 'react'; // eslint-disable-line no-unused-vars
import { connect } from 'react-redux';
import Tracks from './Tracks.jsx';
import Players from './Players.jsx';
import ReplayControls from './ReplayControls.jsx';
import toGameInfo from '../../replay/toGameInfo';
import classnames from 'classnames';
import { Map, List, Range } from 'immutable';
import { some, none, fromNullable } from 'option';

const mapStateToProps = ({ replay, userInfo }) => {
	const { ticks, position } = replay;
	const snapshot = ticks.get(position);

	return { 
		replay: Object.assign({}, replay, { snapshot }),
		isSmall: userInfo.gameSettings && userInfo.gameSettings.enableRightSidebarInGame
	};
};

const mapDispatchToProps = dispatch => ({
	to: position => {
		return dispatch({ type: 'REPLAY_TO', position })
	}
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
	const { replay } = stateProps;
	const { ticks, position, snapshot } = replay;
	const { turnNum, phase } = snapshot;
	const { to } = dispatchProps;

	// (turnNum: Int, [phases: List[String] | phase: String]) => Int
	const findTickPos = (turnNum, _phases) => {
		const phases = List.isList(_phases) ? _phases : List([ _phases ]);

		const i = ticks.findIndex(t => t.turnNum === turnNum 
			&& phases.reduce((acc, p) => acc || t.phase === p, false));

		return i > -1 ? some(i) : none;
	};

	// (position: Int) => () => dispatch(REPLAY_TO)
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
				policyEnaction: List(['election']),
				investigation: List(['policyEnaction', 'election']),
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
		// (cycles: Map[String, List[String]], fallback: List[String]) => Option[Int]
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
				chancellorLegislation: List(['policyEnaction']),
				topDeck: List(['policyEnaction']),
				policyEnaction: List(['presidentLegislation', 'topDeck']),
			}),
			List(['presidentLegislation', 'topDeck'])
		);

		const actionPos = findTickPos(
			turnNum,
			List(['investigation', 'execution'])
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

	const playback = { hasNext, hasPrev, toBeginning, toEnd, nextTick, prevTick, nextPhase, prevPhase,
		hasLegislation, hasAction, toElection, toLegislation, toAction, toTurn };

	return Object.assign({}, stateProps, ownProps, { playback });
};

const policiesToCards = (count, type) => Range(0, count).map(i => ({ type })).toList();

const handToCards = hand => {
	const reds = policiesToCards(hand.reds, 'fascist');
	const blues = policiesToCards(hand.blues, 'liberal');

	return reds.concat(blues);
};

const Card = ({ type, icon }) => {
	const renderedIcon = icon
		? <i className={classnames(icon, 'icon')} />
		: null;

	return (
		<div className={classnames(type, 'card')}>
			{renderedIcon}
		</div>
	);
};

const CardGroup = ({ title, cards, className }) => {
	const renderedTitle = title ? <h1>{title}</h1> : null;

	return (
		<div className={classnames(className, 'card-group')}>
			{renderedTitle}
			{cards.map((c, i) =>
				<Card
					key={i}
					type={c.type}
					icon={c.icon} />
			)}
		</div>
	);
};

const Legislation = ({ type, hand, discard, claim }) => {
	const applyDiscard = (cards, discard) => {
		const i = cards.findLastIndex(c => c.type === discard);

		return cards.set(i, Object.assign({}, {
			type: classnames('discarded', discard),
			icon: 'huge red ban'
		}));
	};

	return (
		<div className={classnames(type, 'legislation')}>
			<CardGroup className="hand"
				title={type}
				cards={applyDiscard(handToCards(hand), discard)} />
			<CardGroup
				className="claim"
				title={type}
				cards={claim.map(c => handToCards(c)).valueOrElse(List())} />
		</div>
	);
};

const PresidentLegislation = ({ hand, discard, claim }) => (
	<Legislation
		type="president"
		hand={hand}
		discard={discard}
		claim={claim} />
);

const ChancellorLegislation = ({ hand, discard, claim }) => (
	<Legislation
		type="chancellor"
		hand={hand}
		discard={discard}
		claim={claim} />
);

const Replay = ({ replay, isSmall, playback }) => {
	const { ticks, snapshot } = replay;

	const gameInfo = toGameInfo(snapshot);
	const userInfo = { username: '' };

	const { turnNum, phase, description } = snapshot;

	console.log(snapshot.presidentHand);
	console.log(snapshot.presidentDiscard);

	const pickOverlay = () => {
		switch (snapshot.phase) {
		case 'presidentLegislation':
			return <PresidentLegislation
				hand={snapshot.presidentHand}
				discard={snapshot.presidentDiscard}
				claim={snapshot.presidentClaim} />;
		case 'chancellorLegislation':
			return <ChancellorLegislation
				hand={snapshot.chancellorHand}
				discard={snapshot.chancellorDiscard}
				claim={snapshot.chancellorClaim} />;
		default:
			return null;
		}
	};

	const ElectionTracker = ({ position }) => {
		const positionToClassName = Map([
			[0, 'zero'],
			[1, 'one'],
			[2, 'two'],
			[3, 'three']
		]);

		const classes = classnames(
			'election-tracker',
			positionToClassName.get(position)
		);

		return <div className={classes} />;
	};

	const renderOverlay = () => (
		<section className="replay-overlay">
			{pickOverlay()}
		</section>
	);

	const renderTrackPieces = () => {
		const numReds = snapshot.track.reds;
		const numBlues = snapshot.track.blues;

		const redCards = policiesToCards(numReds, 'fascist');
		const blueCards = policiesToCards(numBlues, 'liberal');

		const classes = classnames('track-pieces', {
			blurred: [
				'presidentLegislation',
				'chancellorLegislation'
			].includes(snapshot.phase)
		});

		return (
			<section className={classes}>
				<CardGroup
					className="enacted fascist-policies"
					cards={redCards} />
				<CardGroup
					className="enacted liberal-policies"
					cards={blueCards} />
				<ElectionTracker position={snapshot.electionTracker} />
			</section>
		);
	};

	return (
		<section className={classnames({ small: isSmall, big: !isSmall }, 'game replay')}>
			<div className="ui grid">
				<div className="left-side eight wide column">
					{renderOverlay()}
					{renderTrackPieces()}
					<Tracks
						gameInfo={gameInfo}
						userInfo={userInfo}
					/>
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
					onClickedTakeSeat={null}
					socket={null}
					userInfo={userInfo}
					gameInfo={gameInfo} />
			</div>
		</section>
	);
};

const ReplayWrapper = (props) => {
	const { replay } = props

	switch (replay.status) {
	case 'INITIAL':
		return null;
	case 'READY':
		return <Replay {...props} />
	}
}

export default connect(
	mapStateToProps,
	mapDispatchToProps,
	mergeProps
)(ReplayWrapper);