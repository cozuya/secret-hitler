import React from 'react'; // eslint-disable-line
import _ from 'lodash';
import PropTypes from 'prop-types';

const EnactedPolicies = props =>
	<section className="enactedpolicies-container">
		{(() => {
			return _.range(1, 12).map((num, i) => {
				const stateObj = props.gameInfo.trackState.enactedPolicies[i];

				let frontClasses = 'enactedpolicies-card front',
					backClasses = 'enactedpolicies-card back',
					containerClasses = `enactedpolicies-card-container`;

				if (stateObj && Object.keys(stateObj).length) {
					if (stateObj.isFlipped) {
						containerClasses += ' flippedY inplace';
					}

					if (stateObj.position) {
						containerClasses = `${containerClasses} ${stateObj.position}`;
					}

					if (stateObj.cardBack) {
						backClasses = `${backClasses} ${stateObj.cardBack}`;
					}
				}

				return (
					<div key={i} className={containerClasses}>
						<div className={frontClasses} />
						<div className={backClasses} />
					</div>
				);
			});
		})()}
	</section>;

EnactedPolicies.propTypes = {
	gameInfo: PropTypes.object
};

export default EnactedPolicies;
