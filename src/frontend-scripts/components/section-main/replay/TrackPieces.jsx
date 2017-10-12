import React from 'react'; // eslint-disable-line
import CardGroup from '../../reusable/CardGroup.jsx';
import { Map } from 'immutable';
import classnames from 'classnames';
import { handToCards } from './replay-utils.jsx';

const ElectionTracker = ({ position }) => {
	const positionToClassName = Map([[0, 'zero'], [1, 'one'], [2, 'two'], [3, 'three']]);

	const classes = classnames('election-tracker', positionToClassName.get(position));

	return <div className={classes} />;
};

const TrackPieces = ({ phase, track, electionTracker }) => {
	const cards = handToCards(track);

	const redCards = cards.slice(0, track.reds);
	const blueCards = cards.slice(track.reds);

	const classes = classnames('track-pieces', {
		blurred: ['presidentLegislation', 'chancellorLegislation', 'policyPeek'].includes(phase)
	});

	return (
		<section className={classes}>
			<CardGroup className="enacted fascist-policies" cards={redCards} />
			<CardGroup className="enacted liberal-policies" cards={blueCards} />
			<ElectionTracker position={electionTracker} />
		</section>
	);
};

export default TrackPieces;
