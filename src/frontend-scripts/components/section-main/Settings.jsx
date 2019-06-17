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
	state = {
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
		fontSize: null,
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
		contributorDisableContributorColor: '',
		staffIncognito: '',
		fullheight: false
	};

	componentDidMount() {
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
			contributorDisableContributorColor: gameSettings.contributorDisableContributorColor || false,
			staffIncognito: gameSettings.staffIncognito || false
		});
	}

	handleSoundChange = e => {
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
	};

	/**
	 * @param {string} value - todo
	 */
	toggleGameSettings = value => {
		const obj = {};

		obj[value] = !this.state[value];
		this.props.socket.emit('updateGameSettings', obj);
		this.setState(obj);
	};

	sliderChange = event => {
		this.setState({ fontSize: event[0] });
	};

	sliderDrop = e => {
		this.props.socket.emit('updateGameSettings', {
			fontSize: this.state.fontSize
		});
	};

	profileSearchSubmit = e => {
		e.preventDefault();

		window.location.hash = `#/profile/${this.state.profileSearchValue}`;
	};

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
							The quick brown fascist jumped over the lazy liberal. (lato)
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
			if (rejectedFile.length) {
				this.setState({
					cardbackUploadStatus: 'The file you selected is not an image.'
				});
				return;
			}

			this.setState({
				cardbackUploadStatus: 'Resizing...'
			});
			try {
				const img = new Image();
				img.onload = () => {
					const canvas = document.createElement('canvas');
					canvas.width = 70;
					canvas.height = 95;
					const ctx = canvas.getContext('2d');
					ctx.drawImage(img, 0, 0, 70, 95);
					const data = canvas.toDataURL('image/png');
					if (data.length > 100 * 1024) {
						this.setState({
							cardbackUploadStatus: 'The file you selected is too big.  A maximum of 100kb is allowed.'
						});
						return;
					}
					const targetRatio = 70 / 95;
					const thisRatio = img.width / img.height;
					const ratioData = targetRatio > thisRatio ? thisRatio / targetRatio : targetRatio / thisRatio;
					this.setState({
						preview: data,
						cardbackUploadStatus: ratioData < 0.8 ? 'Image may be distorted. If this is a problem, manually create a 70x95px image.' : null
					});
				};

				img.src = URL.createObjectURL(files[0]);
			} catch (err) {
				this.setState({
					cardbackUploadStatus: 'The file you selected is not an image.'
				});
			}
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
						isUploaded: data.message === 'Image uploaded successfully.' ? this.state.preview : '',
						preview: ''
					});
				})
				.catch(err => {
					if (err.status == 413) {
						this.setState({
							cardbackUploadStatus: 'Image too large.',
							isUploaded: '',
							preview: ''
						});
					} else {
						this.setState({
							cardbackUploadStatus: 'An unknown error occurred, refer to the console and show a dev.',
							isUploaded: '',
							preview: ''
						});
						console.log('Unknown cardback error', err);
					}
				});
		};

		const previewClearClick = e => {
			e.preventDefault();
			this.setState({ preview: '', cardbackUploadStatus: null });
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
							{window.staffRole && window.staffRole !== 'altmod' && window.staffRole !== 'trialmod' && (
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

							{window.staffRole && window.staffRole !== 'altmod' && window.staffRole !== 'trialmod' && (
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
							{window.staffRole && window.staffRole !== 'altmod' && window.staffRole !== 'trialmod' && (
								<React.Fragment>
									<h4 className="ui header" style={{ color: '#05bba0' }}>
										Disable staff color (show contributor or elo color)
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
								<option>pack1</option>
								<option>pack2</option>
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
							{window.isContributor && (
								<React.Fragment>
									<h4 className="ui header" style={{ color: '#21bae0' }}>
										Disable contributor color (show elo color)
									</h4>
									<div className="ui fitted toggle checkbox">
										<input
											type="checkbox"
											name="contributorDisableContributorColor"
											checked={this.state.contributorDisableContributorColor}
											onChange={() => this.toggleGameSettings('contributorDisableContributorColor')}
										/>
										<label />
									</div>
								</React.Fragment>
							)}
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
									<Dropzone accept="image/*" onDrop={onDrop} multiple={false} className="dropzone">
										Click here (or drag and drop) an image to upload
									</Dropzone>
								</div>
								{this.state.preview && (
									<div className="preview-container">
										<h5 className="ui header">Preview</h5>
										<img src={this.state.preview} />
										<button onClick={previewSaveClick} className="ui button">
											Save
										</button>
										<a href="#/settings" onClick={previewClearClick}>
											Clear
										</a>
									</div>
								)}
								<div className="ui basic modal cardbackinfo">
									<div className="header">Cardback info and terms of use</div>
									<p>Rainbow players only. Can only upload an image once per 30 second.</p>
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
	socket: PropTypes.object,
	gameSettings: PropTypes.object
};

export default Settings;
