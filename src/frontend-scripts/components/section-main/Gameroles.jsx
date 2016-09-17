import React from 'react';
import $ from 'jquery';

$.fn.popup = Popup;

export default class Gameroles extends React.Component {
	constructor() {
		super();

		this.handleRoleClick = this.handleRoleClick.bind(this);
	}

	componentDidMount() {
		if (this.props.userInfo.gameSettings && !this.props.userInfo.gameSettings.disablePopups) {
			$('div.roles').popup({ // refs don't work?
				inline: true,
				hoverable: true,
				lastResort: true,
				delay: {
					show: 700,
					hide: 800
				}
			});
		}
	}

	handleRoleClick(e) {
		if (this.props.userInfo.userName && !(this.props.gameInfo.gameState.isStarted && !this.props.gameInfo.gameState.isDay)) {
			this.props.selectedGamerole({
				role: $(e.currentTarget).attr('data-role'),
				random: Math.random().toString(36).substring(2)
			});
		}
	}

	render() {
		return (
			<section className="gameroles">
				<div className="ui right pointing label">
					Roles in this game:
				</div>
					{(() => {
						return this.props.roles.map((role, i) => {
							return (
								<div key={i}>
									<div
										data-role={role}
										onClick={this.handleRoleClick}
										ref={c => {
											this.popups = c;
										}}
										className={
										(() => {
											const notifyClass = this.props.roleState === 'notify' ? 'notify' : '';

											return `roles role-${role} ${this.props.roleState} ${notifyClass}`;
										})()
									}
									/>
									<div className="ui small popup transition hidden top left" dangerouslySetInnerHTML={{__html: ''}} />
								</div>
							);
						});
					})()}
			</section>
		);
	}
}

Gameroles.propTypes = {
	roles: React.PropTypes.array,
	userInfo: React.PropTypes.object,
	gameInfo: React.PropTypes.object,
	roleState: React.PropTypes.string,
	selectedGamerole: React.PropTypes.func
};