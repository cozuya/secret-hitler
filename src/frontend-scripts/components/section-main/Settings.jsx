import React from 'react';
import { connect } from 'react-redux';
import { fetchProfile } from '../../actions/actions';
import $ from 'jquery';
import { Range } from 'rc-slider';
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
		this.sliderChange = this.sliderChange.bind(this);
		this.sliderDrop = this.sliderDrop.bind(this);
		this.widthSliderChange = this.widthSliderChange.bind(this);
		this.widthSliderDrop = this.widthSliderDrop.bind(this);
		this.profileSearchSubmit = this.profileSearchSubmit.bind(this);
		this.state = {
			sliderValues: [8, 28],
			imageUid: Math.random()
				.toString(36)
				.substring(6),
			widthSliderValue: '',
			preview: '',
			cardbackUploadStatus: '',
			isUploaded: false,
			profileSearchValue: '',
			fontChecked: 'comfortaa'
		};
	}

	componentDidMount() {
		const { socket } = this.props,
			gameSettings = this.props.gameSettings || window.gameSettings;

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

		$(this.cardbacks).checkbox({
			onChecked() {
				socket.emit('updateGameSettings', {
					disablePlayerCardbacks: true
				});
			},
			onUnchecked() {
				socket.emit('updateGameSettings', {
					disablePlayerCardbacks: false
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

		this.setState({
			fontChecked: gameSettings.fontFamily
		});
	}

	sliderChange(event) {
		this.setState({ sliderValues: event });
	}

	sliderDrop(e) {
		this.props.socket.emit('updateGameSettings', {
			fontSize: this.state.sliderValues[0]
		});
	}

	widthSliderDrop(e) {
		this.props.socket.emit('updateGameSettings', {
			customWidth: this.state.widthSliderValue
		});
	}

	widthSliderChange(event) {
		$('#game-container').css('width', event[0] === 1853 ? 'inherit' : `${event[0]}px`);
		this.setState({ widthSliderValue: `${event[0]}px` });
	}

	profileSearchSubmit(e) {
		e.preventDefault();

		this.props.fetchProfile(this.state.profileSearchValue);
	}

	renderFonts() {
		const changeFontSubmit = fontName => {
			this.setState({
				fontChecked: fontName
			});

			this.props.socket.emit('updateGameSettings', {
				fontFamily: fontName
			});
		};
		return (
			<div className="row font-container">
				<h4 className="ui header">Body font style</h4>
				<div className="field">
					<div className="ui radio comfortaa checkbox">
						<input
							type="radio"
							id="comfortaa"
							onChange={() => {
								changeFontSubmit('comfortaa');
							}}
							checked={this.state.fontChecked === 'comfortaa'}
						/>
						<label
							htmlFor="comfortaa"
							style={{
								fontSize: this.state.sliderValues.length > 1 ? '18px' : `${this.state.sliderValues[0]}px`
							}}
						>
							The quick brown fascist jumped over the lazy liberal. (comfortaa, default)
						</label>
					</div>
				</div>
				<div className="field">
					<div className="ui radio lato checkbox">
						<input
							type="radio"
							id="lato"
							onChange={() => {
								changeFontSubmit('lato');
							}}
							checked={this.state.fontChecked === 'lato'}
						/>
						<label
							htmlFor="lato"
							style={{
								fontSize: this.state.sliderValues.length > 1 ? '18px' : `${this.state.sliderValues[0]}px`
							}}
						>
							The quick brown fascist jumped over the lazy liberal. (lato, prior to v0.8)
						</label>
					</div>
				</div>
				<div className="field">
					<div className="ui radio germaniaone checkbox">
						<input
							type="radio"
							id="germaniaone"
							onChange={() => {
								changeFontSubmit('germania one');
							}}
							checked={this.state.fontChecked === 'germania one'}
						/>
						<label
							htmlFor="germaniaone"
							style={{
								fontSize: this.state.sliderValues.length > 1 ? '18px' : `${this.state.sliderValues[0]}px`
							}}
						>
							The quick brown fascist jumped over the lazy liberal. (germania one)
						</label>
					</div>
				</div>
				<div className="field">
					<div className="ui radio robotoslab checkbox">
						<input
							type="radio"
							id="robotoslab"
							onChange={() => {
								changeFontSubmit('roboto slab');
							}}
							checked={this.state.fontChecked === 'roboto slab'}
						/>
						<label
							htmlFor="robotoslab"
							style={{
								fontSize: this.state.sliderValues.length > 1 ? '18px' : `${this.state.sliderValues[0]}px`
							}}
						>
							The quick brown fascist jumped over the lazy liberal. (roboto slab)
						</label>
					</div>
				</div>
			</div>
		);
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
					this.setState({ preview: reader.result });
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
				this.setState({ preview: '' });
			},
			handleSearchProfileChange = e => {
				this.setState({ profileSearchValue: e.currentTarget.value });
			},
			gameSettings = this.props.gameSettings || window.gameSettings;

		return (
			<section className="settings">
				<a href="/game/#/">
					<i className="remove icon" />
				</a>
				<div className="ui header">
					<div className="content">
						Game settings
						<div className="sub header">
							Account settings can be found{' '}
							<a href="/account" target="_blank" rel="noopener noreferrer">
								here
							</a>{' '}
							(new tab).
						</div>
						<button className="ui button" onClick={this.props.fetchProfile.bind(null, this.props.userInfo.userName)}>
							View your profile
						</button>
						<form className="profile-search" onSubmit={this.profileSearchSubmit}>
							<div className="ui action input">
								<input
									placeholder="Search profiles.."
									value={this.state.profileSearchValue}
									onChange={handleSearchProfileChange}
									maxLength="20"
									spellCheck="false"
								/>
							</div>
							<button className={this.state.profileSearchValue ? 'ui primary button' : 'ui primary button disabled'}>Submit</button>
						</form>
					</div>
				</div>
				<div className="ui grid">
					<div className="row">
						<div className="four wide column popups">
							<h4 className="ui header">Add timestamps to chats</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.timestamps = c;
								}}
							>
								<input type="checkbox" name="timestamps" defaultChecked={gameSettings.enableTimestamps} />
							</div>
						</div>
						<div className="four wide column popups">
							<h4 className="ui header">Show right sidebar in games</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.sidebar = c;
								}}
							>
								<input type="checkbox" name="sidebar" defaultChecked={gameSettings.enableRightSidebarInGame} />
							</div>
						</div>
						<div className="four wide column popups">
							<h4 className="ui header">Disable player cardbacks</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.cardbacks = c;
								}}
							>
								<input type="checkbox" name="cardbacks" defaultChecked={gameSettings.disablePlayerCardbacks} />
							</div>
						</div>
						<div className="four wide column popups">
							<h4 className="ui header">Disable player colors in chat</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.playercolors = c;
								}}
							>
								<input type="checkbox" name="playercolors" defaultChecked={gameSettings.disablePlayerColorsInChat} />
							</div>
						</div>
					</div>
					<div className="row centered">
						<div className="eight wide column slider">
							<h4
								className="ui header"
								style={{
									fontSize: this.state.sliderValues.length > 1 ? '18px' : `${this.state.sliderValues[0]}px`
								}}
							>
								Gamechat font size
							</h4>
							<Range
								onAfterChange={this.sliderDrop}
								onChange={this.sliderChange}
								min={8}
								max={28}
								defaultValue={gameSettings.fontSize ? [gameSettings.fontSize] : [18]}
								marks={{ 8: '8px', 18: '18px', 28: '28px' }}
							/>
						</div>
					</div>
					<div className="row centered">
						<div className="eight wide column slider">
							<h4 className="ui header">Application width</h4>
							<Range
								onAfterChange={this.widthSliderDrop}
								onChange={this.widthSliderChange}
								min={1253}
								max={1853}
								defaultValue={gameSettings.customWidth ? [parseInt(gameSettings.customWidth.split('px')[0])] : [1853]}
								marks={{ 1253: 'Minimum', 1853: 'Full screen' }}
							/>
						</div>
					</div>
					{this.renderFonts()}
					<div className="row cardback-container">
						<div className="ui grid">
							<div className="row centered cardback-header-container">
								<h4 className="ui header">
									Cardback<i className="info circle icon" title="Click to get information about user uploaded cardbacks" onClick={displayCardbackInfoModal} />
								</h4>
							</div>
							<div className="row cardbacks-container">
								<div className="current">
									<h5 className="ui header">Current</h5>
									{(() => {
										if (this.state.isUploaded) {
											return <img src={this.state.isUploaded} />;
										}

										if (gameSettings.customCardback) {
											return (
												<div
													className="current-cardback"
													style={{
														background: `url(../images/custom-cardbacks/${this.props.userInfo.userName}.${gameSettings.customCardback}?${this.state
															.imageUid}) no-repeat`
													}}
												/>
											);
										}

										return <div className="current-cardback" />;
									})()}
								</div>
								<div className="upload">
									<h5 className="ui header">New</h5>
									<Dropzone accept="image/png, image/jpg, image/jpeg" onDrop={onDrop} multiple={false} className="dropzone">
										Click here or drag and drop a 70px by 95px image to upload
									</Dropzone>
								</div>
								{(() => {
									if (this.state.preview) {
										return (
											<div className="preview-container">
												<h5 className="ui header">Preview</h5>
												<img src={this.state.preview} />;
												<button onClick={previewSaveClick} className="ui button">
													Save
												</button>
												<a href="#" onClick={previewClearClick}>
													Clear
												</a>
											</div>
										);
									}
								})()}
								<div className="ui basic modal cardbackinfo">
									<div className="header">Cardback info and terms of use</div>
									<p>
										<strong>
											Image uploaded must be 70px by 95px, or it will not look right. Do not trust the previewer - it will crunch to fit the box, the game
											itself won't do that.
										</strong>{' '}
										Rainbow players only. Can only upload an image once per 30 second. Only png, jpg, and jpeg are permitted. Must be below 40kb.
									</p>
									<p>
										<strong>No NSFW images, nazi anything, or images from the site itself to be tricky.</strong>
									</p>
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
	userInfo: PropTypes.object,
	socket: PropTypes.object
};

export default connect(null, mapDispatchToProps)(Settings);
