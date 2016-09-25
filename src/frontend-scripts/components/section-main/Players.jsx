import React from 'react';
// import $ from 'jquery';

export default class Players extends React.Component {
	// constructor() {
	// 	super();
	// 	this.handlePlayerClick = this.handlePlayerClick.bind(this);
	// }

	// componentDidMount() {

	// }

	render() {
		return (
			<section className="players">
				<div className="ui right pointing label">
					label
				</div>
					{(() => {
						// return this.props.players.map((role, i) => {
						// 	return (
						// 		<div key={i}>
						// 			<div
						// 				onClick={this.handlePlayerClick}
						// 				ref={c => {
						// 					this.popups = c;
						// 				}}
						// 				className={
						// 				(() => {
						// 					const notifyClass = this.props.roleState === 'notify' ? 'notify' : '';

						// 					return `roles role-${role} ${this.props.roleState} ${notifyClass}`;
						// 				})()
						// 			}
						// 			/>
						// 		</div>
						// 	);
						// });
					})()}
			</section>
		);
	}
}

Players.propTypes = {
	roles: React.PropTypes.array,
	userInfo: React.PropTypes.object,
	gameInfo: React.PropTypes.object,
	roleState: React.PropTypes.string,
	selectedGamerole: React.PropTypes.func
};