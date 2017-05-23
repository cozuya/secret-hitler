import React from 'react'; // eslint-disable-line no-unused-vars
import { Range } from 'immutable';
import classnames from 'classnames';

const Policy = ({ policy }) => (
	<div className={classnames(policy, 'policy')}></div>
);

const Claim = ({ type, claim }) => {
	const f = (policy, count) => Range(0, count).map(i => policy).toArray();

	const reds = f('fascist', claim.reds);
	const blues = f('liberal', claim.blues);
	const policies = reds.concat(blues);

	return (
		<div className={classnames(type, 'claim')}>
			<h1>{type}</h1>
			{policies.map((p, i) =>
				<Policy key={i} policy={p} />
			)}
		</div>
	);
};

const DrawClaims = ({ presidentClaim, chancellorClaim }) => (
	<section className="replay-claims">
		<Claim type="president" claim={presidentClaim} />
		<Claim type="chancellor" claim={chancellorClaim} />
	</section>
);

export default ({ isActive, presidentClaim, chancellorClaim }) => (
	isActive
		? <DrawClaims
			presidentClaim={presidentClaim}
			chancellorClaim={chancellorClaim} />
		: null
);