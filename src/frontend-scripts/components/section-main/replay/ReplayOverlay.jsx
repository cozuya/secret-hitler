import React from 'react'; // eslint-disable-line
import { List } from 'immutable';
import classnames from 'classnames';
import CardGroup from '../../reusable/CardGroup.jsx';
import { handToCards } from './replay-utils.jsx';

const Legislation = ({ type, handTitle, claimTitle, hand, discard, claim }) => (
	<div className={classnames(type, 'legislation')}>
		<CardGroup
			className="hand"
			title={handTitle}
			cards={handToCards(hand, discard)} />
		<CardGroup
			className="claim"
			title={claimTitle}
			cards={claim.map(c => handToCards(c)).valueOrElse(List())} />
	</div>
);

const PresidentLegislation = ({ hand, discard, claim }) => (
	<Legislation
		type="president"
		handTitle={'President Hand'}
		claimTitle={'President Claim'}
		hand={hand}
		discard={discard}
		claim={claim} />
);

const ChancellorLegislation = ({ hand, discard, claim }) => (
	<Legislation
		type="chancellor"
		handTitle={'Chancellor Hand'}
		claimTitle={'Chancellor Claim'}
		hand={hand}
		discard={discard}
		claim={claim} />
);

const PolicyPeek = ({ peek, claim }) => (
	<Legislation
		type="policy-peek"
		handTitle={'Policy Peek'}
		claimTitle={'Claim'}
		hand={peek}
		claim={claim} />
);

const ReplayOverlay = ({ snapshot }) => {
	const overlay = (() => {
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
		case 'policyPeek':
			return <PolicyPeek
				peek={snapshot.policyPeek}
				claim={snapshot.policyPeekClaim} />;
		default:
			return null;
		}
	})();

	return (
		<section className="replay-overlay">
			{overlay}
		</section>
	);
};

export default ReplayOverlay;