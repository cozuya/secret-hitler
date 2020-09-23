import React, { useEffect } from 'react'; // eslint-disable-line no-unused-vars
import { Range, List, OrderedMap, Map } from 'immutable';
import { fromNullable } from 'option';
import classnames from 'classnames';
import Slider from 'rc-slider';
import { capitalize } from '../../../../../utils';
import GameText from '../../reusable/GameText.jsx';

const TurnNav = ({ position, size, toTurn }) => {
	const marks = Map(
		Range(1, size + 1).map(i => [
			i,
			{
				label: i,
				style: { fontSize: '16px' }
			}
		])
	).toObject();

	return (
		<div className="turn-nav">
			<h1>Turn</h1>
			<Slider onChange={value => toTurn(value - 1)} className="slider" min={1} max={size} value={position + 1} marks={marks} dots />
		</div>
	);
};

const PhaseNav = ({ phase, hasLegislation, hasAction, toElection, toLegislation, toAction }) => {
	const nav = OrderedMap({
		election: List(['candidacy', 'nomination', 'election']),
		legislation: List(['presidentLegislation', 'chancellorLegislation', 'topDeck', 'veto', 'policyEnaction']),
		action: List(['investigation', 'policyPeek', 'specialElection', 'execution'])
	});

	const localize = s => {
		const custom = Map({
			presidentLegislation: 'President',
			chancellorLegislation: 'Chancellor',
			topDeck: 'Top Deck',
			policyEnaction: 'Policy Enaction',
			policyPeek: 'Policy Peek',
			specialElection: 'Special Election'
		});

		return fromNullable(custom.get(s)).valueOrElse(capitalize(s));
	};

	const events = Map({
		election: toElection,
		legislation: toLegislation,
		action: toAction
	});

	const disabled = Map({
		election: false,
		legislation: !hasLegislation,
		action: !hasAction
	});

	const Step = ({ title, description, isFilled, isDisabled, onClick }) => {
		const classes = classnames(
			{
				filled: isFilled,
				disabled: isDisabled
			},
			'step'
		);

		return (
			<div className={classes} onClick={onClick}>
				<div className="content">
					<div className="title">{title}</div>
					<div className="description">{description}</div>
				</div>
			</div>
		);
	};

	const Overlay = () => (
		<div className="overlay-container">
			<div className={classnames(phase, 'overlay')} />
		</div>
	);

	const filled = (() => {
		const phases = nav.valueSeq().flatten();
		const i = phases.findIndex(p => p === phase);

		const maxIndexes = Map({
			election: 2,
			legislation: 6,
			action: 7
		});

		const filled = maxIndexes.map(max => max <= i);

		return filled;
	})();

	const steps = nav
		.map((phases, block) => {
			return (
				<Step
					key={block}
					title={localize(block)}
					description={phases.includes(phase) ? localize(phase) : ''}
					isFilled={filled.get(block)}
					isDisabled={disabled.get(block)}
					onClick={events.get(block)}
				/>
			);
		})
		.valueSeq();

	return (
		<div className="phase-nav">
			<h1 className="ui header">Phase</h1>
			<div className="ui three tiny steps">{steps}</div>
			<Overlay />
		</div>
	);
};

const Description = ({ description }) => {
	return (
		<div className="description-container">
			<h1 className="ui header">Description</h1>
			<p className="content">
				<GameText text={description} />
			</p>
		</div>
	);
};

const Playback = ({ hasNext, hasPrev, next, prev, forward, backward, beginning, end }) => {
	const onKeyDown = event => {
		// ignore typing in textboxes
		if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
		const char = String.fromCharCode(event.keyCode);
		if (char === 'H' && hasPrev) {
			backward();
		} else if (char === 'J' && hasPrev) {
			prev();
		} else if (char === 'K' && hasNext) {
			next();
		} else if (char === 'L' && hasNext) {
			forward();
		}
	};

	useEffect(() => {
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('keydown', onKeyDown);
		};
	});

	return (
		<div className="playback">
			<h1>Playback Controls</h1>
			<div className="ui horizontal segments">
				<button className={classnames('ui icon', { disabled: !hasPrev }, 'button segment')} onClick={beginning}>
					<i className="fast backward icon" />
				</button>
				<button className={classnames('ui icon', { disabled: !hasPrev }, 'button segment')} onClick={backward}>
					<i className="backward icon" />
				</button>
				<button className={classnames('ui icon', { disabled: !hasPrev }, 'button segment')} onClick={prev}>
					<i className="flipped play icon" />
				</button>
				<button className={classnames('ui icon', { disabled: !hasNext }, 'button segment')} onClick={next}>
					<i className="play icon" />
				</button>
				<button className={classnames('ui icon', { disabled: !hasNext }, 'button segment')} onClick={forward}>
					<i className="forward icon" />
				</button>
				<button className={classnames('ui icon', { disabled: !hasNext }, 'button segment')} onClick={end}>
					<i className="fast forward icon" />
				</button>
			</div>
		</div>
	);
};

const ReplayControls = ({ turnsSize, turnNum, phase, description, playback }) => {
	const {
		hasNext,
		hasPrev,
		toBeginning,
		toEnd,
		nextTick,
		prevTick,
		nextPhase,
		prevPhase,
		hasLegislation,
		hasAction,
		toElection,
		toLegislation,
		toAction,
		toTurn
	} = playback;

	return (
		<section className="replay-controls">
			<TurnNav position={turnNum} size={turnsSize} toTurn={toTurn} />
			<PhaseNav phase={phase} hasLegislation={hasLegislation} hasAction={hasAction} toElection={toElection} toLegislation={toLegislation} toAction={toAction} />
			<Description description={description} />
			<Playback
				hasNext={hasNext}
				hasPrev={hasPrev}
				beginning={toBeginning}
				end={toEnd}
				next={nextTick}
				prev={prevTick}
				forward={nextPhase}
				backward={prevPhase}
			/>
		</section>
	);
};

export default ReplayControls;
