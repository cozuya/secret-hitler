import React from 'react';
import $ from 'jquery';

/* eslint-disable */

export default class Balloons extends React.Component {
	componentDidMount() {
		setTimeout(() => {
			$(this.container).addClass('active');
		}, 50);
	}

	render() {
		return (
			<div
				className="balloon-container"
				ref={c => {
					this.container = c;
				}}
			>
				<div className="balloon" />
				<div className="balloon" />
				<div className="balloon" />
				<div className="balloon" />
				<div className="balloon" />
			</div>
		);
	}
}
