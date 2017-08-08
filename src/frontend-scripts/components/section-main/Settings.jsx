import React from 'react';
import { connect } from 'react-redux';
import { fetchProfile } from '../../actions/actions';
import $ from 'jquery';
import Slider from 'rc-slider';
import Modal from 'semantic-ui-modal';
import Checkbox from 'semantic-ui-checkbox';
import Dropzone from 'react-dropzone';
import PropTypes from 'prop-types';

$.fn.checkbox = Checkbox;
$.fn.modal = Modal;

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
			sliderValues: [8, 28],
			preview: '',
			cardbackUploadStatus: '',
			isUploaded: false
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
		const onDrop = (files, rejectedFile) => {
				const reader = new FileReader();

				if (rejectedFile.length) {
					this.setState({
						cardbackUploadStatus: 'The file you selected has a wrong extension.  Only png jpg and jpeg are allowed.'
					});
					return;
				}

				if (files[0].size > 40000) {
					this.setState({
						cardbackUploadStatus: 'The file you selected is too big.  A maximum of 40kb is allowed.'
					});
					return;
				}

				reader.onload = () => {
					this.setState({preview: reader.result});
				};

				reader.readAsDataURL(files[0]);
			},
			displayCardbackInfoModal = () => {
				$('.cardbackinfo')
					.modal('setting', 'transition', 'scale')
					.modal('show');
			},
			previewSaveClick = () => {
				$.ajax({
					url: '/upload-cardback',
					method: 'POST',
					data: {
						image: this.state.preview
					}
				})
				.then(data => {
					this.setState({
						cardbackUploadStatus: data.message,
						isUploaded: data.message === 'You need to have played 50 games to upload a cardback.' ? '' : this.state.preview,
						preview: ''
					});
				})
				.catch(err => {
					console.log(err, 'err');
				});
			},
			previewClearClick = e => {
				e.preventDefault;
				this.setState({preview: ''});
			};

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
							<h4 className="ui header" style={{fontSize: this.state.sliderValues.length > 1 ? '18px' : `${this.state.sliderValues[0]}px`}}>Gamechat font size</h4>
							<Slider onAfterChange={this.sliderDrop} onChange={this.sliderChange} min={8} max={28} range defaultValue={this.props.userInfo.gameSettings.fontSize ? [this.props.userInfo.gameSettings.fontSize] : [18]} marks={{8: '8px', 18: '18px', 28: '28px'}} />
						</div>
					</div>
					<div className="row cardback-container">
						<div className="ui grid">
							<div className="row centered cardback-header-container">
								<h4 className="ui header">Cardback<i className="info circle icon" title="Click to get information about user uploaded cardbacks" onClick={displayCardbackInfoModal} /></h4>
							</div>
							<div className="row cardbacks-container">
								<div className="current">
									<h5 className="ui header">Current</h5>
									{(() => {
										if (this.state.isUploaded) {
											return <img src={this.state.isUploaded} />;
										}

										if (this.props.userInfo.gameSettings.customCardback) {
											const imageUid = Math.random().toString(36).substring(6);

											return <div className="current-cardback" style={{background: `url(../images/custom-cardbacks/${this.props.userInfo.userName}.${this.props.userInfo.gameSettings.customCardback}?${imageUid}) no-repeat`}} />;
										}

										return <div className="current-cardback" />;
									})()}
								</div>
								<div className="upload">
									<h5 className="ui header">New</h5>
									<Dropzone
										accept='image/png, image/jpg, image/jpeg'
										onDrop={onDrop}
										multiple={false}
										className='dropzone'
									>
										Click here or drag and drop a 70px by 95px image to upload
									</Dropzone>
								</div>
								{(() => {
									if (this.state.preview) {
										return (
											<div className="preview-container">
												<h5 className="ui header">Preview</h5>
												<img src={this.state.preview} />;
												<button onClick={previewSaveClick} className="ui button">Save</button>
												<a href="#" onClick={previewClearClick}>Clear</a>
											</div>
										);
									}
								})()}
								<div className="ui basic modal cardbackinfo">
									<div className="header">Cardback info and terms of use</div>
									<p><strong>Image uploaded must be 70px by 95px, or it will not look right.  Do not trust the previewer - it will crunch to fit the box, the game itself won't do that.</strong> Rainbow players only. Can only upload an image once per 18 hours, be careful before hitting save. Only png, jpg, and jpeg are permitted.  Must be below 40kb.</p>
									<p><strong>No NSFW images, nazi anything, or images from the site itself to be tricky.</strong></p>
								</div>
							</div>
							<div className="centered row cardback-message-container">{this.state.cardbackUploadStatus}</div>
						</div>
					</div>
				</div>
			</section>
		);
	}
}

Settings.propTypes = {
	onLeaveSettings: PropTypes.func,
	userInfo: PropTypes.object,
	socket: PropTypes.object
};

export default connect(
	null,
	mapDispatchToProps
)(Settings);
