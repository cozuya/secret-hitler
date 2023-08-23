import React from 'react';
import $ from 'jquery';
import { Range } from 'rc-slider';
import Modal from 'semantic-ui-modal';
import Checkbox from 'semantic-ui-checkbox';
import Dropzone from 'react-dropzone';
import PropTypes from 'prop-types';
import { SketchPicker } from 'react-color';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import SweetAlert2 from 'react-sweetalert2';
import Swal from 'sweetalert2';
import CollapsibleSegment from '../reusable/CollapsibleSegment.jsx';

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
		playerPronouns: '',
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
		disableKillConfirmation: '',
		disableAggregations: '',
		soundStatus: '',
		isPrivate: '',
		failedNameChangeMessage: '',
		soundSelected: 'Pack 1',
		staffDisableVisibleElo: '',
		staffDisableVisibleXP: '',
		staffDisableStaffColor: '',
		staffIncognito: '',
		fullheight: false,
		truncatedSize: 250,
		safeForWork: false,
		keyboardShortcuts: 'disable',
		claimCharacters: 'short',
		claimButtons: 'text',
		primaryColor: 'hsl(225, 73%, 57%)',
		secondaryColor: 'hsl(225, 48%, 57%)',
		tertiaryColor: 'hsl(265, 73%, 57%)',
		backgroundColor: 'hsl(0, 0%, 0%)',
		textColor: 'hsl(0, 0%, 100%)',
		primaryPickerVisible: false,
		secondaryPickerVisible: false,
		tertiaryPickerVisible: false,
		backgroundPickerVisible: false,
		textPickerVisible: false,
		cropper: null,
		cropperImage: null,
		cropperImageType: null,
		cropperSwal: {}
	};

	componentDidMount() {
		const gameSettings = this.props.userInfo.gameSettings || window.gameSettings;

		this.setState({
			playerPronouns: gameSettings.playerPronouns || '',
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
			disableKillConfirmation: gameSettings.disableKillConfirmation || '',
			disableAggregations: gameSettings.disableAggregations || '',
			isPrivate: gameSettings.isPrivate || '',
			fullheight: gameSettings.fullheight || false,
			soundSelected: gameSettings.soundStatus || 'Off',
			staffDisableVisibleElo: gameSettings.staffDisableVisibleElo || false,
			staffDisableVisibleXP: gameSettings.staffDisableVisibleXP || false,
			staffDisableStaffColor: gameSettings.staffDisableStaffColor || false,
			staffIncognito: gameSettings.staffIncognito || false,
			truncatedSize: gameSettings.truncatedSize || 250,
			safeForWork: gameSettings.safeForWork || false,
			keyboardShortcuts: gameSettings.keyboardShortcuts || 'disable',
			claimCharacters: gameSettings.claimCharacters || 'short',
			claimButtons: gameSettings.claimButtons || 'text',
			primaryColor: window
				.getComputedStyle(document.documentElement)
				.getPropertyValue('--theme-primary')
				.trim(),
			secondaryColor: window
				.getComputedStyle(document.documentElement)
				.getPropertyValue('--theme-secondary')
				.trim(),
			tertiaryColor: window
				.getComputedStyle(document.documentElement)
				.getPropertyValue('--theme-tertiary')
				.trim(),
			backgroundColor: window
				.getComputedStyle(document.documentElement)
				.getPropertyValue('--theme-background-1')
				.trim(),
			textColor: window
				.getComputedStyle(document.documentElement)
				.getPropertyValue('--theme-text-1')
				.trim()
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

	handleClaimCharactersChange = e => {
		this.setState(
			{
				claimCharacters: e.target.value
			},
			() => {
				this.props.socket.emit('updateGameSettings', {
					claimCharacters: this.state.claimCharacters
				});
			}
		);
	};

	handleClaimButtonsChange = e => {
		this.setState(
			{
				claimButtons: e.target.value
			},
			() => {
				this.props.socket.emit('updateGameSettings', {
					claimButtons: this.state.claimButtons
				});
			}
		);
	};

	handleKeyboardShortcutsChange = e => {
		this.setState(
			{
				keyboardShortcuts: e.target.value
			},
			() => {
				this.props.socket.emit('updateGameSettings', {
					keyboardShortcuts: this.state.keyboardShortcuts
				});
			}
		);
	};

	toggleGameSettings = value => {
		const obj = {};

		obj[value] = !this.state[value];
		this.props.socket.emit('updateGameSettings', obj);
		this.setState(obj);
	};

	sliderChange = event => {
		this.setState({ fontSize: event[0] });
	};

	sliderDrop = event => {
		this.props.socket.emit('updateGameSettings', {
			fontSize: this.state.fontSize
		});
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
				<div className="field">
					<div className="ui radio merriweather checkbox">
						<input
							type="radio"
							id="merriweather"
							onChange={() => {
								changeFontSubmit('merriweather');
							}}
							checked={this.state.fontChecked === 'merriweather'}
						/>
						<label
							htmlFor="merriweather"
							style={{
								fontSize: this.state.fontSize
							}}
						>
							The quick brown fascist jumped over the lazy liberal. (merriweather)
						</label>
					</div>
				</div>
				<div className="field">
					<div className="ui radio inter checkbox">
						<input
							type="radio"
							id="inter"
							onChange={() => {
								changeFontSubmit('inter');
							}}
							checked={this.state.fontChecked === 'inter'}
						/>
						<label
							htmlFor="inter"
							style={{
								fontSize: this.state.fontSize
							}}
						>
							The quick brown fascist jumped over the lazy liberal. (inter)
						</label>
					</div>
				</div>
			</div>
		);
	}

	renderPronouns() {
		const changePronounSubmit = pronouns => {
			this.setState({
				playerPronouns: pronouns
			});

			this.props.socket.emit('updateGameSettings', {
				playerPronouns: pronouns
			});
		};

		return (
			<div className="row pronoun-container">
				<h4 className="ui header">Pronouns</h4>
				<div className="ui list">
					<div className="item">
						<div className="ui radio checkbox">
							<input
								type="radio"
								id="none"
								onChange={() => {
									changePronounSubmit('');
								}}
								checked={this.state.playerPronouns === ''}
							/>
							<label
								htmlFor="none"
								style={{
									fontSize: this.state.fontSize
								}}
							>
								N/A (No pronouns will display)
							</label>
						</div>
					</div>
					<div className="item">
						<div className="ui radio checkbox">
							<input
								type="radio"
								id="male"
								onChange={() => {
									changePronounSubmit('he/him/his');
								}}
								checked={this.state.playerPronouns === 'he/him/his'}
							/>
							<label
								htmlFor="male"
								style={{
									fontSize: this.state.fontSize
								}}
							>
								he/him/his
							</label>
						</div>
					</div>
					<div className="item">
						<div className="ui radio checkbox">
							<input
								type="radio"
								id="female"
								onChange={() => {
									changePronounSubmit('she/her/hers');
								}}
								checked={this.state.playerPronouns === 'she/her/hers'}
							/>
							<label
								htmlFor="female"
								style={{
									fontSize: this.state.fontSize
								}}
							>
								she/her/hers
							</label>
						</div>
					</div>
					<div className="item">
						<div className="ui radio checkbox">
							<input
								type="radio"
								id="they"
								onChange={() => {
									changePronounSubmit('they/them/theirs');
								}}
								checked={this.state.playerPronouns === 'they/them/theirs'}
							/>
							<label
								htmlFor="they"
								style={{
									fontSize: this.state.fontSize
								}}
							>
								they/them/theirs
							</label>
						</div>
					</div>
					<div className="item">
						<div className="ui radio checkbox">
							<input
								type="radio"
								id="any"
								onChange={() => {
									changePronounSubmit('Any Pronouns');
								}}
								checked={this.state.playerPronouns === 'Any Pronouns'}
							/>
							<label
								htmlFor="any"
								style={{
									fontSize: this.state.fontSize
								}}
							>
								Any Pronouns
							</label>
						</div>
					</div>
					<div className="ui centered">
						<p>If you do not see your pronouns listed above, please contact a moderator to have them set manually.</p>
					</div>
				</div>
			</div>
		);
	}

	renderTheme() {
		const {
			primaryColor,
			secondaryColor,
			tertiaryColor,
			backgroundColor,
			textColor,
			primaryPickerVisible,
			secondaryPickerVisible,
			tertiaryPickerVisible,
			backgroundPickerVisible,
			textPickerVisible
		} = this.state;
		const { socket } = this.props;
		const docStyle = document.documentElement.style;
		const getHSLstring = color => `hsl(${Math.round(color.h)}, ${Math.round(color.s * 100)}%, ${Math.round(color.l * 100)}%)`;
		const renderPicker = name => (
			<div className="picker-container">
				<div
					className="picker-close-button"
					onClick={() => {
						this.setState({ [`${name}PickerVisible`]: false });
					}}
				>
					X
				</div>
				<SketchPicker
					disableAlpha
					color={this.state[`${name}Color`]}
					onChangeComplete={color => {
						const { hsl } = color;
						const newColor = getHSLstring(hsl);

						this.setState(
							{
								[`${name}Color`]: newColor
							},
							() => {
								const isBackgroundOrText = name === 'background' || name === 'text';

								if (isBackgroundOrText) {
									const newColorHSL2 = {
										h: hsl.h,
										s: hsl.s,
										l: hsl.l < 0.5 ? (hsl.l <= 0.93 ? hsl.l + 0.07 : 100) : hsl.l >= 0.07 ? hsl.l - 0.07 : 0
									};
									const newColorHSL3 = {
										h: hsl.h,
										s: hsl.s,
										l: hsl.l < 0.5 ? (hsl.l <= 0.86 ? hsl.l + 0.14 : 100) : hsl.l >= 0.14 ? hsl.l - 0.14 : 0
									};

									docStyle.setProperty(`--theme-${name}-1`, newColor);
									docStyle.setProperty(`--theme-${name}-2`, getHSLstring(newColorHSL2));
									docStyle.setProperty(`--theme-${name}-3`, getHSLstring(newColorHSL3));
								} else {
									docStyle.setProperty(`--theme-${name}`, newColor);
								}

								socket.emit('handleUpdatedTheme', {
									[`${name}Color`]: newColor
								});
							}
						);
					}}
				/>
			</div>
		);

		const getAltThemeColors = () => {
			const hue = parseInt(primaryColor.split(',')[0].split('hsl(')[1], 10);
			const saturation = parseInt(
				primaryColor
					.split(',')[1]
					.trim()
					.split('%')[0],
				10
			);
			const lightness = parseInt(
				primaryColor
					.split(',')[2]
					.trim()
					.split('%)')[0],
				10
			);

			const secondarySaturation = saturation >= 25 ? saturation - 25 : 0;
			const tertiaryHue = hue > 320 ? hue - 320 : hue + 40;

			return {
				secondaryColor: `hsl(${hue}, ${secondarySaturation}%, ${lightness}%)`,
				tertiaryColor: `hsl(${tertiaryHue}, ${saturation}%, ${lightness}%)`
			};
		};

		const setAltThemeColors = () => {
			this.setState(
				{
					secondaryColor: getAltThemeColors().secondaryColor,
					tertiaryColor: getAltThemeColors().tertiaryColor
				},
				() => {
					socket.emit('handleUpdatedTheme', {
						secondaryColor: getAltThemeColors().secondaryColor,
						tertiaryColor: getAltThemeColors().tertiaryColor
					});
					docStyle.setProperty('--theme-secondary', getAltThemeColors().secondaryColor);
					docStyle.setProperty('--theme-tertiary', getAltThemeColors().tertiaryColor);
				}
			);
		};

		const resetThemeColors = () => {
			this.setState(
				{
					primaryColor: 'hsl(225, 73%, 57%)',
					secondaryColor: 'hsl(225, 48%, 57%)',
					tertiaryColor: 'hsl(265, 73%, 57%)',
					backgroundColor: 'hsl(0, 0%, 0%)',
					textColor: 'hsl(0, 0%, 100%)'
				},
				() => {
					socket.emit('handleUpdatedTheme', {
						primaryColor: 'hsl(225, 73%, 57%)',
						secondaryColor: 'hsl(225, 48%, 57%)',
						tertiaryColor: 'hsl(265, 73%, 57%)',
						backgroundColor: 'hsl(0, 0%, 0%)',
						textColor: 'hsl(0, 0%, 100%)'
					});
					docStyle.setProperty('--theme-primary', 'hsl(225, 73%, 57%)');
					docStyle.setProperty('--theme-secondary', 'hsl(225, 48%, 57%)');
					docStyle.setProperty('--theme-tertiary', 'hsl(265, 73%, 57%)');
					docStyle.setProperty('--theme-background-1', 'hsl(0, 0%, 0%)');
					docStyle.setProperty('--theme-background-2', 'hsl(0, 0%, 7%)');
					docStyle.setProperty('--theme-background-3', 'hsl(0, 0%, 14%)');
					docStyle.setProperty('--theme-text-1', 'hsl(0, 0%, 100%)');
					docStyle.setProperty('--theme-text-2', 'hsl(0, 0%, 93%)');
					docStyle.setProperty('--theme-text-3', 'hsl(0, 0%, 86%)');
				}
			);
		};

		return (
			<>
				<div className="row centered themes-header">
					<h3 className="ui header">Color theme</h3>
				</div>
				<div className="row centered themes">
					<div className="two wide column">
						<h5 className="ui header">Primary</h5>
						<div
							className="color-box"
							onClick={() => {
								if (!primaryPickerVisible) {
									this.setState({
										primaryPickerVisible: true
									});
								}
							}}
							style={{ background: primaryColor }}
						></div>
						{primaryPickerVisible && renderPicker('primary')}
					</div>
					<div className="two wide column">
						<h5 className="ui header">Secondary</h5>
						<div
							className="color-box"
							onClick={() => {
								if (!secondaryPickerVisible) {
									this.setState({
										secondaryPickerVisible: true
									});
								}
							}}
							style={{ background: secondaryColor }}
						></div>
						{secondaryPickerVisible && renderPicker('secondary')}
					</div>
					<div className="two wide column">
						<h5 className="ui header">Tertiary</h5>
						<div
							className="color-box"
							onClick={() => {
								if (!tertiaryPickerVisible) {
									this.setState({
										tertiaryPickerVisible: true
									});
								}
							}}
							style={{ background: tertiaryColor }}
						></div>
						{tertiaryPickerVisible && renderPicker('tertiary')}
					</div>
					<div className="two wide column theme-buttons">
						{primaryColor &&
							secondaryColor &&
							tertiaryColor &&
							!(secondaryColor === getAltThemeColors().secondaryColor && tertiaryColor === getAltThemeColors().tertiaryColor) && (
								<button className="ui primary button" onClick={setAltThemeColors}>
									Compute 2nd and 3rd
								</button>
							)}
						{!(
							primaryColor === 'hsl(225, 73%, 57%)' &&
							secondaryColor === 'hsl(225, 48%, 57%)' &&
							tertiaryColor === 'hsl(265, 73%, 57%)' &&
							backgroundColor === 'hsl(0, 0%, 0%)' &&
							textColor === 'hsl(0, 0%, 100%)'
						) && (
							<button className="ui primary button" onClick={resetThemeColors}>
								Reset
							</button>
						)}
					</div>
					<div className="two wide column">
						<h5 className="ui header">Background</h5>
						<div
							className="color-box"
							onClick={() => {
								if (!backgroundPickerVisible) {
									this.setState({
										backgroundPickerVisible: true
									});
								}
							}}
							style={{ background: backgroundColor }}
						></div>
						{backgroundPickerVisible && renderPicker('background')}
					</div>
					<div className="two wide column">
						<h5 className="ui header">Text</h5>
						<div
							className="color-box"
							onClick={() => {
								if (!textPickerVisible) {
									this.setState({
										textPickerVisible: true
									});
								}
							}}
							style={{ background: textColor }}
						></div>
						{textPickerVisible && renderPicker('text')}
					</div>
				</div>
			</>
		);
	}

	render() {
		const onDrop = (files, rejectedFile) => {
			if (rejectedFile.length) {
				this.setState({
					cardbackUploadStatus: 'The file you selected is not an image.'
				});
				return;
			}

			this.setState({
				cardbackUploadStatus: 'Cropping...'
			});
			try {
				const img = new Image();
				img.onload = () => {
					this.setState({
						cropperImageType: files[0].type,
						cropperImage: img.src,
						cropperSwal: {
							show: true
						}
					});
				};
				img.src = URL.createObjectURL(files[0]);
			} catch (err) {
				this.setState({
					cardbackUploadStatus: 'The file you selected is not an image.'
				});
			}
		};

		const closeCropperSwal = () => {
			this.setState({
				cropperSwal: {},
				cardbackUploadStatus: ''
			});
		};

		const onCropperReady = cropper => {
			this.setState({
				cropper: cropper
			});
		};

		const cropCardback = () => {
			const data = this.state.cropper.getCroppedCanvas({ height: 95, width: 70 }).toDataURL(this.state.cropperImageType);
			if (data.length > 100 * 1024) {
				this.setState({
					cardbackUploadStatus: 'The file you selected is too big.  A maximum of 100kb is allowed.'
				});
				return;
			}
			this.setState({
				preview: data,
				cardbackUploadStatus: ''
			});
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

		const previewClearClick = event => {
			event.preventDefault();
			this.setState({ preview: '', cardbackUploadStatus: null });
		};

		const gameSettings = this.props.gameSettings || window.gameSettings;

		const ownProfileSubmit = event => {
			event.preventDefault();

			window.location.hash = `#/profile/${this.props.userInfo.userName}`;
		};

		return (
			<section className="settings">
				<a href="/game/#/">
					<i className="remove icon" />
				</a>
				<div className="ui header">
					<div className="content">
						Settings
						<div className="sub header">
							Account settings can be found{' '}
							<a href="/account" rel="noopener noreferrer">
								here.
							</a>
							<br />
							<span style={{ color: 'red' }}> Private-games-only (this action will log you out, 18 hour cooldown)</span>{' '}
							<div className="ui fitted toggle checkbox">
								<input type="checkbox" name="privateonly" checked={this.state.isPrivate} onChange={() => this.toggleGameSettings('isPrivate')} />
								<label />
							</div>
						</div>
						<button className="ui primary button" onClick={ownProfileSubmit}>
							View your profile
						</button>
					</div>
				</div>
				<div className="ui grid">
					<CollapsibleSegment title={'Game Settings'} style={{ width: '100%', padding: '7px' }}>
						<div className="ui grid">
							<div className="row">
								<div className="four wide column popups">
									<h4 className="ui header">Add timestamps to chats</h4>
									<div className="ui fitted toggle checkbox">
										<input
											type="checkbox"
											name="timestamps"
											checked={this.state.enableTimestamps}
											onChange={() => this.toggleGameSettings('enableTimestamps')}
										/>
										<label /> {/* N.B You need a blank label tag after input for the semantic checkboxes to display! */}
									</div>
								</div>
								<div className="four wide column popups">
									<h4 className="ui header">Policy claim representation</h4>
									<select onChange={this.handleClaimCharactersChange} value={this.state.claimCharacters}>
										<option value="short">Short (L/F)</option>
										<option value="full">Full (liberal/fascist)</option>
										<option value="legacy">Legacy (B/R)</option>
									</select>
								</div>
								<div className="four wide column popups">
									<h4 className="ui header">Claim Buttons</h4>
									<select onChange={this.handleClaimButtonsChange} value={this.state.claimButtons}>
										<option value="text">Legacy (Text)</option>
										<option value="cards">Cards</option>
									</select>
								</div>
								<div className="four wide column popups">
									<h4 className="ui header">Disable elo system</h4>
									<div className="ui fitted toggle checkbox">
										<input type="checkbox" name="disableElo" checked={this.state.disableElo} onChange={() => this.toggleGameSettings('disableElo')} />
										<label />
									</div>
								</div>
							</div>
							<div className="row">
								<div className="four wide column popups">
									<h4 className="ui header">Keyboard shortcuts</h4>
									<select onChange={this.handleKeyboardShortcutsChange} value={this.state.keyboardShortcuts}>
										<option value="disable">Disable keyboard shortcuts</option>
										<option value="2s">Shortcuts with 2s delay</option>
										<option value="0s">Shortcuts with no delay</option>
									</select>
								</div>
								<div className="four wide column popups">
									<h4 className="ui header">Disable confetti</h4>
									<div className="ui fitted toggle checkbox">
										<input type="checkbox" name="confetti" checked={this.state.disableConfetti} onChange={() => this.toggleGameSettings('disableConfetti')} />
										<label />
									</div>
								</div>
								<div className="four wide column popups">
									<h4 className="ui header">Disable kill confirmation</h4>
									<div className="ui fitted toggle checkbox">
										<input
											type="checkbox"
											name="disablekillconfirmation"
											checked={this.state.disableKillConfirmation}
											onChange={() => this.toggleGameSettings('disableKillConfirmation')}
										/>
										<label />
									</div>
								</div>
							</div>
							<div className="row">
								<div className="four wide column popups">
									<h4 className="ui header">Sound effect status</h4>
									<select onChange={this.handleSoundChange} value={this.state.soundSelected}>
										<option>Off</option>
										<option>pack1</option>
										<option>pack2</option>
									</select>
								</div>
							</div>
						</div>
					</CollapsibleSegment>
					<CollapsibleSegment title={'Player Settings'} style={{ width: '100%', padding: '7px' }}>
						<div className="ui grid">
							<div className="row">
								<div className="four wide column popups">
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
								</div>
								<div className="four wide column popups">
									<h4 className="ui header">Disable seasonal awards</h4>
									<div className="ui fitted toggle checkbox">
										<input type="checkbox" name="disablecrowns" checked={this.state.disableCrowns} onChange={() => this.toggleGameSettings('disableCrowns')} />
										<label />
									</div>
								</div>
								<div className="four wide column popups">
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
								</div>
							</div>
							<div className="row">
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
								</div>
							</div>
						</div>
					</CollapsibleSegment>
					<CollapsibleSegment title={'UI Settings'} style={{ width: '100%', padding: '7px' }}>
						<div className="ui grid">
							<div className="row">
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
								</div>
								<div className="four wide column popups">
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
								</div>
								<div className="four wide column popups">
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
								</div>
								<div className="four wide column popups">
									<h4 className="ui header">Truncated Chat Length</h4>
									<div className="ui fitted">
										<input
											style={{ width: '35%' }}
											type="text"
											name="truncatedSize"
											value={this.state.truncatedSize}
											onChange={e => {
												if (/^\d{1,}$/.test(e.target.value) || e.target.value === '') {
													if (e.target.value === '') {
														this.setState({ truncatedSize: e.target.value });
														return;
													}
													this.props.socket.emit('updateGameSettings', { truncatedSize: e.target.value > 0 ? e.target.value : 1 });
													this.setState({ truncatedSize: e.target.value > 0 ? e.target.value : 1 });
												}
											}}
										/>
										<label />
									</div>
								</div>
							</div>
							<div className="row">
								<div className="four wide column popups">
									<h4 className="ui header">UI full height in games</h4>
									<div className="ui fitted toggle checkbox">
										<input type="checkbox" name="fullheight" checked={this.state.fullheight} onChange={() => this.toggleGameSettings('fullheight')} />
										<label />
									</div>
								</div>
								<div className="four wide column popups">
									<h4 className="ui header">Safe For Work Mode</h4>
									<div className="ui fitted toggle checkbox">
										<input
											type="checkbox"
											name="fullheight"
											checked={this.state.safeForWork}
											onChange={() => {
												this.toggleGameSettings('safeForWork');
												location.reload();
											}}
										/>
										<label />
									</div>
								</div>
							</div>
						</div>
					</CollapsibleSegment>
					{window.staffRole && window.staffRole !== 'altmod' && window.staffRole !== 'trialmod' && (
						<CollapsibleSegment title={'Staff Settings'} style={{ width: '100%', padding: '7px' }}>
							<div className="ui grid">
								<div className="row">
									<div className="four wide column popups">
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
									</div>
									<div className="four wide column popups">
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
									</div>
									<div className="four wide column popups">
										<React.Fragment>
											<h4 className="ui header" style={{ color: '#05bba0' }}>
												Disable visible XP
											</h4>
											<div className="ui fitted toggle checkbox">
												<input
													type="checkbox"
													name="staffDisableVisibleXP"
													checked={this.state.staffDisableVisibleXP}
													onChange={() => this.toggleGameSettings('staffDisableVisibleXP')}
												/>
												<label />
											</div>
										</React.Fragment>
									</div>
									<div className="four wide column popups">
										{window.staffRole !== 'veteran' && (
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
								</div>
							</div>
						</CollapsibleSegment>
					)}
					<div className="row centered">
						<div className="four wide column popups" />
					</div>
					{this.renderTheme()}
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
														background: `url(../images/custom-cardbacks/${this.props.userInfo.userName}.${gameSettings.customCardback}?${gameSettings.customCardbackUid}) no-repeat`
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
								<div>
									<h5 className="ui header">Reset</h5>
									<button
										onClick={() => {
											Swal.fire({
												title: 'Are you sure?',
												text: 'This will reset your cardback to the default.',
												type: 'warning',
												showCancelButton: true,
												confirmButtonText: 'Yes, reset it!',
												cancelButtonText: 'No, cancel!',
												closeOnConfirm: false,
												closeOnCancel: false
											}).then(result => {
												if (result.value === true) {
													const defaultCardback =
														'data:image/png;base64,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';
													$.ajax({
														url: '/upload-cardback',
														method: 'POST',
														data: {
															image: defaultCardback
														}
													})
														.then(data => {
															this.setState({
																cardbackUploadStatus: data.message,
																isUploaded: data.message === 'Cardback did reset successfully.' ? defaultCardback : '',
																preview: ''
															});
														})
														.catch(err => {
															this.setState({
																cardbackUploadStatus: 'An unknown error occurred, refer to the console and show a dev.',
																isUploaded: '',
																preview: ''
															});
															console.log('Unknown cardback error', err);
														});
												}
											});
										}}
										className="ui button"
									>
										Reset
									</button>
								</div>
								<div className="ui basic modal cardbackinfo">
									<div className="header">Cardback info and terms of use</div>
									<p>Rainbow players only. Can only upload an image once per 30 second.</p>
									<p>Cardback dimensions are 70x95 pixels, images larger than that will be scaled down to fit.</p>
									<p>
										<strong>No NSFW images, nazi anything, or images from the site itself to be tricky.</strong>
									</p>
								</div>
								<SweetAlert2
									{...this.state.cropperSwal}
									onConfirm={cropCardback}
									didClose={closeCropperSwal}
									allowOutsideClick={false}
									allowEscapeKey={false}
									allowEnterKey={false}
								>
									<Cropper
										id="cb-cropper"
										src={this.state.cropperImage}
										viewMode={0}
										dragMode={'move'}
										cropBoxMovable={true}
										minCropBoxHeight={95}
										minCropBoxWidth={70}
										aspectRatio={70 / 95}
										onInitialized={onCropperReady}
									/>
								</SweetAlert2>
							</div>
							<div className="centered row cardback-message-container">{this.state.cardbackUploadStatus}</div>
						</div>
					</div>
					{this.renderPronouns()}
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
