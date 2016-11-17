import React from 'react';

export default class Defaultmid extends React.Component {
	render() {
		return (
			<section className="defaultmid">
				<img src="images/lizard.png" alt="Secret Hitler logo" style={{position: 'absolute', left: '50%', marginLeft: '-200px', top: '140px'}} width="400" height="400" />
			</section>
		);
	}
}

Defaultmid.propTypes = {
	quickDefault: React.PropTypes.func
};