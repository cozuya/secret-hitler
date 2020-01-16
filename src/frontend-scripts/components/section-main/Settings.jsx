import React from 'react';
import $ from 'jquery';
import { Range } from 'rc-slider';
import Modal from 'semantic-ui-modal';
import Checkbox from 'semantic-ui-checkbox';
import Dropzone from 'react-dropzone';
import PropTypes from 'prop-types';
import { SketchPicker } from 'react-color';

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
		staffIncognito: '',
		fullheight: false,
		truncatedSize: 250,
		safeForWork: false,
		primaryColor: 'hsl(225, 73%, 57%)',
		secondaryColor: 'hsl(225, 48%, 57%)',
		tertiaryColor: 'hsl(265, 73%, 57%)',
		backgroundColor: 'hsl(0, 0%, 0%)',
		textColor: 'hsl(0, 0%, 100%)',
		primaryPickerVisible: false,
		secondaryPickerVisible: false,
		tertiaryPickerVisible: false,
		backgroundPickerVisible: false,
		textPickerVisible: false
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
			staffIncognito: gameSettings.staffIncognito || false,
			truncatedSize: gameSettings.truncatedSize || 250,
			safeForWork: gameSettings.safeForWork,
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
										l: hsl.l > 0.5 ? (hsl.l <= 0.93 ? hsl.l + 0.07 : 100) : hsl.l >= 0.07 ? hsl.l - 0.07 : 0
									};
									const newColorHSL3 = {
										h: hsl.h,
										s: hsl.s,
										l: hsl.l > 0.5 ? (hsl.l <= 0.86 ? hsl.l + 0.14 : 100) : hsl.l >= 0.14 ? hsl.l - 0.14 : 0
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

		const previewClearClick = event => {
			event.preventDefault();
			this.setState({ preview: '', cardbackUploadStatus: null });
		};

		const handleSearchProfileChange = e => {
			this.setState({ profileSearchValue: e.currentTarget.value });
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
							{window.staffRole && window.staffRole !== 'altmod' && window.staffRole !== 'trialmod' && window.staffRole !== 'veteran' && (
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
								<option>pack1</option>
								<option>pack2</option>
							</select>
							<h4 className="ui header">UI full height in games</h4>
							<div className="ui fitted toggle checkbox">
								<input type="checkbox" name="fullheight" checked={this.state.fullheight} onChange={() => this.toggleGameSettings('fullheight')} />
								<label />
							</div>
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
