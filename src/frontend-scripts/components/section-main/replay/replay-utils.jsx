import React from 'react'; // eslint-disable-line
import { handToPolicies } from '../../../../../utils';
import { fromNullable } from 'option';
import Card from '../../reusable/Card.jsx';

export const handToCards = (hand, _discard) => {
	const discard = fromNullable(_discard);

	const policies = handToPolicies(hand);
	const discardIndex = discard.map(d => policies.findLastIndex(p => p === d)).valueOrElse(-1);

	return policies.map((policy, i) => (i === discardIndex ? <Card key={i} type={policy} icon={'huge red ban'} /> : <Card key={i} type={policy} />));
};
