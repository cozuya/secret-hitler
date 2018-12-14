import React from 'react';
import $ from 'jquery';
import { Range } from 'rc-slider';
import Modal from 'semantic-ui-modal';
import Checkbox from 'semantic-ui-checkbox';
import Dropzone from 'react-dropzone';
import PropTypes from 'prop-types';

$.fn.checkbox = Checkbox;
$.fn.modal = Modal;

class Settings extends React.Component {
	constructor() {
		super();
		this.sliderChange = this.sliderChange.bind(this);
		this.sliderDrop = this.sliderDrop.bind(this);
		this.profileSearchSubmit = this.profileSearchSubmit.bind(this);
		this.toggleGameSettings = this.toggleGameSettings.bind(this);
		this.handleSoundChange = this.handleSoundChange.bind(this);
		this.state = {
			namechangeValue: '',
			sliderValues: [8, 24],
			imageUid: Math.random()
				.toString(36)
				.substring(6),
			preview: '',
			cardbackUploadStatus: '',
			isUploaded: false,
			profileSearchValue: '',
			fontChecked: 'comfortaa',
			fontSize: '',
			enableTimestamps: '',
			disableHelpMessages: '',
			disableHelpIcons: '',
			enableRightSidebarInGame: '',
			disablePlayerColorsInChat: '',
			disablePlayerCardbacks: '',
			disableConfetti: '',
			disableCrowns: '',
			disableSeasonal: '',
			disableElo: '',
			disableAggregations: '',
			soundStatus: '',
			isPrivate: '',
			failedNameChangeMessage: '',
			soundSelected: 'Pack 1',
			staffDisableVisibleElo: '',
			staffDisableStaffColor: '',
			staffIncognito: '',
			fullheight: false
		};
	}

	componentWillMount() {
		const gameSettings = this.props.userInfo.gameSettings || window.gameSettings;

		this.setState({
			fontChecked: gameSettings.fontFamily || 'comfortaa',
			fontSize: gameSettings.fontSize ? gameSettings.fontSize : 16,
			enableTimestamps: gameSettings.enableTimestamps || '',
			disableHelpMessages: gameSettings.disableHelpMessages || '',
			disableHelpIcons: gameSettings.disableHelpIcons || '',
			enableRightSidebarInGame: gameSettings.enableRightSidebarInGame || '',
			disablePlayerColorsInChat: gameSettings.disablePlayerColorsInChat || '',
			disableCrowns: gameSettings.disableCrowns || '',
			disablePlayerCardbacks: gameSettings.disablePlayerCardbacks || '',
			disableConfetti: gameSettings.disableConfetti || '',
			disableSeasonal: gameSettings.disableSeasonal || '',
			disableElo: gameSettings.disableElo || '',
			disableAggregations: gameSettings.disableAggregations || '',
			isPrivate: gameSettings.isPrivate || '',
			fullheight: gameSettings.fullheight || false,
			soundSelected: gameSettings.soundStatus || 'Off',
			staffDisableVisibleElo: gameSettings.staffDisableVisibleElo || false,
			staffDisableStaffColor: gameSettings.staffDisableStaffColor || false,
			staffIncognito: gameSettings.staffIncognito || false
		});
	}

	handleSoundChange(e) {
		this.setState(
			{
				soundSelected: e.target.value
			},
			() => {
				this.props.socket.emit('updateGameSettings', {
					soundStatus: this.state.soundSelected
				});
			}
		);
	}

	/**
	 * @param {string} value - todo
	 */
	toggleGameSettings(value) {
		const obj = {};

		obj[value] = !this.state[value];
		this.props.socket.emit('updateGameSettings', obj);
		this.setState(obj);
	}

	sliderChange(event) {
		this.setState({ fontSize: event[0] });
	}

	sliderDrop(e) {
		this.props.socket.emit('updateGameSettings', {
			fontSize: this.state.fontSize
		});
	}

	profileSearchSubmit(e) {
		e.preventDefault();

		window.location.hash = `#/profile/${this.state.profileSearchValue}`;
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
								fontSize: this.state.fontSize
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
								fontSize: this.state.fontSize
							}}
						>
							The quick brown fascist jumped over the lazy liberal.
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
								fontSize: this.state.fontSize
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
								fontSize: this.state.fontSize
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
		/**
		 * @param {array} files - todo
		 * @param {array} rejectedFile - todo
		 */
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
		};

		const displayCardbackInfoModal = () => {
			$('.cardbackinfo')
				.modal('setting', 'transition', 'scale')
				.modal('show');
		};

		const previewSaveClick = () => {
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
		};

		const previewClearClick = e => {
			e.preventDefault;
			this.setState({ preview: '' });
		};

		const handleSearchProfileChange = e => {
			this.setState({ profileSearchValue: e.currentTarget.value });
		};

		const gameSettings = this.props.gameSettings || window.gameSettings;

		const ownProfileSubmit = e => {
			e.preventDefault();

			window.location.hash = `#/profile/${this.props.userInfo.userName}`;
		};

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
							<a href="/account" rel="noopener noreferrer">
								here.
							</a>
						</div>
						<button className="ui primary button" onClick={ownProfileSubmit}>
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
							<div className="ui fitted toggle checkbox">
								<input type="checkbox" name="timestamps" checked={this.state.enableTimestamps} onChange={() => this.toggleGameSettings('enableTimestamps')} />
								<label /> {/* N.B You need a blank label tag after input for the semantic checkboxes to display! */}
							</div>
							<h4 className="ui header">Disable Help Messages</h4>
							<div className="ui fitted toggle checkbox">
								<input
									type="checkbox"
									name="disableHelpMessages"
									checked={this.state.disableHelpMessages}
									onChange={() => this.toggleGameSettings('disableHelpMessages')}
								/>
								<label />
							</div>
							<h4 className="ui header">Show overall winrates and colors (instead of current season)</h4>
							<div className="ui fitted toggle checkbox">
								<input
									type="checkbox"
									name="disableSeasonal"
									checked={this.state.disableSeasonal}
									onChange={() => this.toggleGameSettings('disableSeasonal')}
								/>
								<label />
							</div>
							{window.staffRole && window.staffRole !== 'contrib' && window.staffRole !== 'trial' && (
								<React.Fragment>
									<h4 className="ui header" style={{ color: '#05bba0' }}>
										Incognito (hide from userlist)
									</h4>
									<div className="ui fitted toggle checkbox">
										<input type="checkbox" checked={this.state.staffIncognito} onChange={() => this.toggleGameSettings('staffIncognito')} />
										<label />
									</div>
								</React.Fragment>
							)}
						</div>
						<div className="four wide column popups">
							<h4 className="ui header">Show right sidebar in games</h4>
							<div className="ui fitted toggle checkbox">
								<input
									type="checkbox"
									name="sidebar"
									checked={this.state.enableRightSidebarInGame}
									onChange={() => this.toggleGameSettings('enableRightSidebarInGame')}
								/>
								<label />
							</div>
							<h4 className="ui header">Disable Help Icons</h4>
							<div className="ui fitted toggle checkbox">
								<input
									type="checkbox"
									name="disableHelpIcons"
									checked={this.state.disableHelpIcons}
									onChange={() => this.toggleGameSettings('disableHelpIcons')}
								/>
								<label />
							</div>
							<h4 className="ui header">Disable elo system</h4>
							<div className="ui fitted toggle checkbox">
								<input type="checkbox" name="disableElo" checked={this.state.disableElo} onChange={() => this.toggleGameSettings('disableElo')} />
								<label />
							</div>

							{window.staffRole && window.staffRole !== 'contrib' && window.staffRole !== 'trial' && (
								<React.Fragment>
									<h4 className="ui header" style={{ color: '#05bba0' }}>
										Disable visible elo
									</h4>
									<div className="ui fitted toggle checkbox">
										<input
											type="checkbox"
											name="staffDisableVisibleElo"
											checked={this.state.staffDisableVisibleElo}
											onChange={() => this.toggleGameSettings('staffDisableVisibleElo')}
										/>
										<label />
									</div>
								</React.Fragment>
							)}
						</div>
						<div className="four wide column popups">
							<h4 className="ui header">Disable player cardbacks</h4>
							<div className="ui fitted toggle checkbox">
								<input
									type="checkbox"
									name="cardbacks"
									checked={this.state.disablePlayerCardbacks}
									onChange={() => this.toggleGameSettings('disablePlayerCardbacks')}
								/>
								<label />
							</div>
							<h4 className="ui header">Disable confetti</h4>
							<div className="ui fitted toggle checkbox">
								<input type="checkbox" name="confetti" checked={this.state.disableConfetti} onChange={() => this.toggleGameSettings('disableConfetti')} />
								<label />
							</div>
							<h4 className="ui header">Disable seasonal awards</h4>
							<div className="ui fitted toggle checkbox">
								<input type="checkbox" name="disablecrowns" checked={this.state.disableCrowns} onChange={() => this.toggleGameSettings('disableCrowns')} />
								<label />
							</div>
							<h4 className="ui header">Disable playerlist aggregations</h4>
							<div className="ui fitted toggle checkbox">
								<input
									type="checkbox"
									name="disableaggregations"
									checked={this.state.disableAggregations}
									onChange={() => this.toggleGameSettings('disableAggregations')}
								/>
								<label />
							</div>
							{window.staffRole && window.staffRole !== 'contrib' && window.staffRole !== 'trial' && (
								<React.Fragment>
									<h4 className="ui header" style={{ color: '#05bba0' }}>
										Disable staff color (show elo color)
									</h4>
									<div className="ui fitted toggle checkbox">
										<input
											type="checkbox"
											name="staffDisableStaffColor"
											checked={this.state.staffDisableStaffColor}
											onChange={() => this.toggleGameSettings('staffDisableStaffColor')}
										/>
										<label />
									</div>
								</React.Fragment>
							)}
						</div>
						<div className="four wide column popups">
							<h4 className="ui header">Disable player colors in chat</h4>
							<div className="ui fitted toggle checkbox">
								<input
									type="checkbox"
									name="playercolors"
									checked={this.state.disablePlayerColorsInChat}
									onChange={() => this.toggleGameSettings('disablePlayerColorsInChat')}
								/>
								<label />
							</div>
							<h4 className="ui header">Sound effect status</h4>
							<select onChange={this.handleSoundChange} value={this.state.soundSelected}>
								<option>Off</option>
								<option>Pack1</option>
								<option>Pack2</option>
							</select>
							<h4 className="ui header">UI full height in games</h4>
							<div className="ui fitted toggle checkbox">
								<input type="checkbox" name="fullheight" checked={this.state.fullheight} onChange={() => this.toggleGameSettings('fullheight')} />
								<label />
							</div>
							<h4 className="ui header" style={{ color: 'red' }}>
								Private-games-only (this action will log you out, 18 hour cooldown)
							</h4>
							<div className="ui fitted toggle checkbox">
								<input type="checkbox" name="privateonly" checked={this.state.isPrivate} onChange={() => this.toggleGameSettings('isPrivate')} />
								<label />
							</div>
						</div>
					</div>
					<div className="row centered">
						<div className="four wide column popups" />
					</div>
					<div className="row centered">
						<div className="eight wide column slider">
							<h4
								className="ui header"
								style={{
									fontSize: this.state.fontSize
								}}
							>
								Gamechat font size
							</h4>
							<Range
								onAfterChange={this.sliderDrop}
								onChange={this.sliderChange}
								min={8}
								max={24}
								value={[this.state.fontSize]}
								marks={{ 8: '8px', 12: '12px', 16: '16px', 20: '20px', 24: '24px' }}
							/>
						</div>
					</div>
					{this.renderFonts()}{' '}
					<div className="row cardback-container">
						<div className="ui grid">
							<div className="row centered cardback-header-container">
								<h4 className="ui header">
									Cardback
									<i className="info circle icon" title="Click to get information about user uploaded cardbacks" onClick={displayCardbackInfoModal} />
								</h4>
							</div>
							<div className="row cardbacks-container">
								<div className="current">
									<h5 className="ui header">Current</h5>
									{(() => {
										if (this.state.isUploaded) {
											return <img src={this.state.isUploaded} />;
										}

										if (gameSettings && gameSettings.customCardback) {
											return (
												<div
													className="current-cardback"
													style={{
														background: `url(../images/custom-cardbacks/${this.props.userInfo.userName}.${gameSettings.customCardback}?${
															gameSettings.customCardbackUid
														}) no-repeat`
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
								{this.state.preview && (
									<div className="preview-container">
										<h5 className="ui header">Preview</h5>
										<img src={this.state.preview} />
										<button onClick={previewSaveClick} className="ui button">
											Save
										</button>
										<a href="#" onClick={previewClearClick}>
											Clear
										</a>
									</div>
								)}
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

Settings.defaultProps = {
	gameInfo: {},
	userInfo: {}
};

Settings.propTypes = {
	userInfo: PropTypes.object,
	socket: PropTypes.object
};

export default Settings;
