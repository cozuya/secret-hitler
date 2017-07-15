import React from 'react';
import _ from 'lodash';

export default class EnactedPolicies extends React.Component {
	render() {
		return (
			<section className="enactedpolicies-container">
				{(() => {
					return _.range(1, 12).map((num, i) => {
						const stateObj = this.props.gameInfo.trackState.enactedPolicies[i];

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
			</section>
		);
	}
}

EnactedPolicies.propTypes = {
	gameInfo: React.PropTypes.object
};