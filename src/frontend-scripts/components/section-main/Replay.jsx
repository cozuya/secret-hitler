import React from 'react'; // eslint-disable-line no-unused-vars
import { connect } from 'react-redux';
import Tracks from './Tracks.jsx';
import Players from './Players.jsx';
import ReplayControls from './ReplayControls.jsx';
import toGameInfo from '../../replay/toGameInfo';
import classnames from 'classnames';
import { Map, List, Range } from 'immutable';

const mapStateToProps = ({ replay }) => ({
	snapshot: replay.ticks.get(replay.position)
});

const mapDispatchToProps = dispatch => ({
	nextTick: () => dispatch({ type: 'REPLAY_NEXT_TICK' }),
	prevTick: () => dispatch({ type: 'REPLAY_PREV_TICK' })
});

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
		const i = cards.lastIndexOf(c => c.type === discard);

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

const Replay = ({ snapshot, nextTick, prevTick }) => {
	const gameInfo = toGameInfo(snapshot);
	const userInfo = { username: '' };

	const gameDate = '5/7/2017';
	const turnNum = snapshot.turnNum;
	const phase = Map({
		candidacy: 'Candidacy',
		nomination: 'Nomination',
		election: 'Election',
		presidentLegislation: 'President Legislation',
		chancellorLegislation: 'Chancellor Legislation',
		policyEnaction: 'Policy Enaction',
		investigation: 'Investigation',
		execution: 'Execution'
	}).get(snapshot.phase);
	const description = snapshot.description || 'asdf lol';

	console.log(turnNum, snapshot.phase);

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
		<section className="game replay">
			<div className="ui grid">
				<div className="eight wide column">
					{renderOverlay()}
					{renderTrackPieces()}
					<Tracks
						gameInfo={gameInfo}
						userInfo={userInfo}
					/>
				</div>
				<div className="eight wide column">
					<ReplayControls
						gameDate={gameDate}
						turnNum={turnNum}
						phase={phase}
						description={description}
						onNextTickClick={nextTick}
						onPrevTickClick={prevTick} />
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

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Replay);