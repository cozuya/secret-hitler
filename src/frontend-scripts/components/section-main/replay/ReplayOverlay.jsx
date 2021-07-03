import React from 'react'; // eslint-disable-line
import { List } from 'immutable';
import classnames from 'classnames';
import CardGroup from '../../reusable/CardGroup.jsx';
import { handToCards } from './replay-utils.jsx';
import { some, none } from 'option';

const Legislation = ({ type, handTitle, claimTitle, hand, discard, claim, hideHand }) => (
	<div className={classnames(type, 'legislation')} style={{ top: '50px' }}>
		{!hideHand && <CardGroup className="hand card-group" title={handTitle} cards={handToCards(hand, discard.valueOrElse(null))} />}
		<CardGroup className="claim card-group" title={claimTitle} cards={claim.map(c => handToCards(c)).valueOrElse(List())} />
	</div>
);

const PresidentLegislation = ({ hand, discard, claim, hideHand }) => (
	<Legislation
		type="president"
		handTitle={'President Hand'}
		claimTitle={'President Claim'}
		hand={hand}
		discard={some(discard)}
		claim={claim}
		hideHand={hideHand}
	/>
);

const ChancellorLegislation = ({ hand, discard, claim, hideHand }) => (
	<Legislation
		type="chancellor"
		handTitle={'Chancellor Hand'}
		claimTitle={'Chancellor Claim'}
		hand={hand}
		discard={discard}
		claim={claim}
		hideHand={hideHand}
	/>
);

const PolicyPeek = ({ peek, claim, hideHand }) => (
	<Legislation type="policy-peek" handTitle={'Policy Peek'} claimTitle={'Claim'} hand={peek} claim={claim} discard={none} hideHand={hideHand} />
);

const ReplayOverlay = ({ snapshot, hideHand }) => {
	const overlay = (() => {
		switch (snapshot.phase) {
			case 'presidentLegislation':
				return <PresidentLegislation hand={snapshot.presidentHand} discard={snapshot.presidentDiscard} claim={snapshot.presidentClaim} hideHand={hideHand} />;
			case 'chancellorLegislation':
				return (
					<ChancellorLegislation hand={snapshot.chancellorHand} discard={snapshot.chancellorDiscard} claim={snapshot.chancellorClaim} hideHand={hideHand} />
				);
			case 'policyPeek':
				return <PolicyPeek peek={snapshot.policyPeek} claim={snapshot.policyPeekClaim} hideHand={hideHand} />;
			default:
				return null;
		}
	})();

	return <section className="replay-overlay">{overlay}</section>;
};

export default ReplayOverlay;
