import React from 'react';
import { connect } from 'react-redux';
import { fetchProfile } from '../../actions/actions';
import $ from 'jquery';
import Slider from 'rc-slider';
import Checkbox from 'semantic-ui-checkbox';

$.fn.checkbox = Checkbox;

const mapDispatchToProps = dispatch => ({
	fetchProfile: username => dispatch(fetchProfile(username))
});

class Settings extends React.Component {
	constructor() {
		super();
		this.leaveSettings = this.leaveSettings.bind(this);
		this.sliderChange = this.sliderChange.bind(this);
		this.sliderDrop = this.sliderDrop.bind(this);
		this.state = {
			sliderValues: [8, 28]
		};
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

	sliderChange(event) {
		this.setState({sliderValues: event});
	}

	sliderDrop(e) {
		this.props.socket.emit('updateGameSettings', {
			fontSize: this.state.sliderValues[0]
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
					<div className="row">
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
							<button
								className="ui button"
								onClick={this.props.fetchProfile.bind(null, this.props.userInfo.userName)}>
								View your profile
							</button>
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
					<div className="row centered">
						<div className="eight wide column slider">
							<h4 className="ui header">Gamechat font size</h4>
							<Slider onAfterChange={this.sliderDrop} onChange={this.sliderChange} min={8} max={28} range defaultValue={[18]} marks={{8: '8px', 18: '18px', 28: '28px'}} />
						</div>
					</div>
					<div className="row centered">
						<p style={{color: '#fff', fontSize: this.state.sliderValues.length > 1 ? '18px' : `${this.state.sliderValues[0]}px`}}>A sentence for demoing font size changes.</p>
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

export default connect(
	null,
	mapDispatchToProps
)(Settings);
