import React from 'react';
import $ from 'jquery';
import Checkbox from 'semantic-ui-checkbox';

$.fn.checkbox = Checkbox;

export default class Settings extends React.Component {
	constructor() {
		super();
		this.leaveSettings = this.leaveSettings.bind(this);
	}

	componentDidMount() {
		const {socket} = this.props;

		$(this.timestamps).checkbox({
			onChecked() {
				socket.emit('updateGameSettings', {
					enableTimestamps: true
				});
			},
			onUnchecked() {
				socket.emit('updateGameSettings', {
					enableTimestamps: false
				});
			}
		});

		$(this.sidebar).checkbox({
			onChecked() {
				socket.emit('updateGameSettings', {
					enableRightSidebarInGame: true
				});
			},
			onUnchecked() {
				socket.emit('updateGameSettings', {
					enableRightSidebarInGame: false
				});
			}
		});

		$(this.playercolors).checkbox({
			onChecked() {
				socket.emit('updateGameSettings', {
					disablePlayerColorsInChat: true
				});
			},
			onUnchecked() {
				socket.emit('updateGameSettings', {
					disablePlayerColorsInChat: false
				});
			}
		});
	}

	leaveSettings() {
		this.props.onLeaveSettings('default');
	}

	render() {
		return (
			<section className="settings">
				<i className="remove icon" onClick={this.leaveSettings} />
				<div className="ui header">
					<div className="content">
						Game settings
						<div className="sub header">
							Account settings can be found <a href="/account" target="_blank" rel="noopener noreferrer">here</a> (new tab).
						</div>
					</div>
				</div>
				<div className="ui grid">
					<div className="four wide column popups">
						<h4 className="ui header">Add timestamps to chats</h4>
						<div className="ui fitted toggle checkbox" ref={c => {
							this.timestamps = c;
						}}>
							<input type="checkbox" name="timestamps" defaultChecked={this.props.userInfo.gameSettings.enableTimestamps} />
						</div>
					</div>
					<div className="four wide column popups">
						<h4 className="ui header">Show right sidebar in games</h4>
						<div className="ui fitted toggle checkbox" ref={c => {
							this.sidebar = c;
						}}>
							<input type="checkbox" name="sidebar" defaultChecked={this.props.userInfo.gameSettings.enableRightSidebarInGame} />
						</div>
					</div>
					<div className="four wide column popups">
						<h4 className="ui header">Disable player colors in chat</h4>
						<div className="ui fitted toggle checkbox" ref={c => {
							this.playercolors = c;
						}}>
							<input type="checkbox" name="playercolors" defaultChecked={this.props.userInfo.gameSettings.disablePlayerColorsInChat} />
						</div>
					</div>
				</div>
			</section>
		);
	}
}

Settings.propTypes = {
	onLeaveSettings: React.PropTypes.func,
	userInfo: React.PropTypes.object,
	socket: React.PropTypes.object
};