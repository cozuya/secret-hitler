import React from 'react';
import $ from 'jquery';
import { Range } from 'rc-slider';
import Checkbox from 'semantic-ui-checkbox';
import blacklistedWords from '../../../../iso/blacklistwords';
import PropTypes from 'prop-types';
import { renderFlagDropdown } from '../utils.jsx';

$.fn.checkbox = Checkbox;

export default class Creategame extends React.Component {
	state = {
		gameName: '',
		sliderValues: [5, 10],
		experiencedmode: true,
		disablechat: false,
		disablegamechat: false,
		disableobserver: false,
		privateShowing: false,
		containsBadWord: false,
		rainbowgame: false,
		checkedSliderValues: [false, false, true, false, false, false],
		checkedRebalanceValues: [true, false, true],
		privateonlygame: false,
		isTourny: false,
		casualgame: false,
		blindMode: false,
		timedMode: false,
		isVerifiedOnly: false,
		timedSliderValue: [120],
		customGameSliderValue: [7],
		eloSliderValue: [1600],
		isEloLimited: false,
		customGameSettings: {
			enabled: false,
			// Valid powers: investigate, deckpeek, election, bullet; null for no power
			powers: [null, null, null, null, null], // last "power" is always a fas victory
			hitlerZone: 3, // 1-5
			vetoZone: 5, // 1-5, must be larger than fas track state
			fascistCount: 1, // 1-3, does not include hit
			hitKnowsFas: false,
			deckState: { lib: 6, fas: 11 }, // includes tracks cards; 6 deck + 1 track = 5 in deck
			trackState: { lib: 0, fas: 0 }
		}
	};

	componentDidUpdate(prevProps, prevState) {
		const self = this;
		const { customGameSettings } = this.state;

		if (customGameSettings.enabled) {
			$(this.hitseesfas).checkbox({
				onChecked() {
					self.state.customGameSettings.hitKnowsFas = true;
					self.state.customGameSettings.enabled = true;
					self.setState({ casualgame: true });
				},
				onUnchecked() {
					self.state.customGameSettings.hitKnowsFas = false;
					self.state.customGameSettings.enabled = true;
					self.setState({ casualgame: true });
				}
			});

			$(this.power1).dropdown({
				onChange(val) {
					self.state.customGameSettings.powers[0] = val;
					self.state.customGameSettings.enabled = true;
					self.setState({ casualgame: true });
				}
			});

			$(this.power2).dropdown({
				onChange(val) {
					self.state.customGameSettings.powers[1] = val;
					self.state.customGameSettings.enabled = true;
					self.setState({ casualgame: true });
				}
			});

			$(this.power3).dropdown({
				onChange(val) {
					self.state.customGameSettings.powers[2] = val;
					self.state.customGameSettings.enabled = true;
					self.setState({ casualgame: true });
				}
			});

			$(this.power4).dropdown({
				onChange(val) {
					self.state.customGameSettings.powers[3] = val;
					self.state.customGameSettings.enabled = true;
					self.setState({ casualgame: true });
				}
			});

			$(this.power5).dropdown({
				onChange(val) {
					self.state.customGameSettings.powers[4] = val;
					self.state.customGameSettings.enabled = true;
					self.setState({ casualgame: true });
				}
			});
		}
	}

	componentDidMount() {
		const self = this;

		if (this._select) {
			$(this._select).dropdown();
		}

		$(this.verified).checkbox({
			onChecked() {
				self.setState({ isVerifiedOnly: true });
			},
			onUnchecked() {
				self.setState({ isVerifiedOnly: false });
			}
		});

		$(this.experiencedmode).checkbox({
			onChecked() {
				self.setState({ experiencedmode: true });
			},
			onUnchecked() {
				self.setState({ experiencedmode: false });
			}
		});

		$(this.disablechat).checkbox({
			onChecked() {
				self.setState({ disablechat: true });
			},
			onUnchecked() {
				self.setState({ disablechat: false });
			}
		});

		$(this.elolimited).checkbox({
			onChecked() {
				self.setState({ isEloLimited: true });
			},
			onUnchecked() {
				self.setState({ isEloLimited: false });
			}
		});

		$(this.disablegamechat).checkbox({
			onChecked() {
				self.setState({ disablegamechat: true });
			},
			onUnchecked() {
				self.setState({ disablegamechat: false });
			}
		});

		$(this.privategame).checkbox({
			onChecked() {
				self.setState({ privateShowing: true });
			},
			onUnchecked() {
				self.setState({ privateShowing: false });
			}
		});

		$(this.rainbowgame).checkbox({
			onChecked() {
				self.setState({ rainbowgame: true });
			},
			onUnchecked() {
				self.setState({ rainbowgame: false });
			}
		});

		$(this.tournyconfirm).checkbox({
			onChecked() {
				self.setState({ isTourny: true, sliderValues: [8] });
			},
			onUnchecked() {
				self.setState({ isTourny: false, sliderValues: [5, 10] });
			}
		});

		$(this.blindmode).checkbox({
			onChecked() {
				self.setState({ blindMode: true });
			},
			onUnchecked() {
				self.setState({ blindMode: false });
			}
		});

		$(this.rebalance69p).checkbox({
			onChecked() {
				self.setState({ rebalance69p: true });
			},
			onUnchecked() {
				self.setState({ rebalance69p: false });
			}
		});

		$(this.privateonlygame).checkbox({
			onChecked() {
				self.setState({ privateonlygame: true });
			},
			onUnchecked() {
				self.setState({ privateonlygame: false });
			}
		});

		$(this.disableobserver).checkbox({
			onChecked() {
				self.setState({ disableobserver: true });
			},
			onUnchecked() {
				self.setState({ disableobserver: false });
			}
		});

		$(this.casualgame).checkbox({
			onChecked() {
				self.setState({ casualgame: true });
			},
			onUnchecked() {
				if ((self.state.timedMode && self.state.timedSliderValue[0] < 30) || self.state.customGameSettings.enabled) self.setState({ casualgame: true });
				else self.setState({ casualgame: false });
			}
		});

		$(this.timed).checkbox({
			onChecked() {
				self.setState({ timedMode: true });
			},
			onUnchecked() {
				self.setState({ timedMode: false });
			}
		});

		$(this.customgame).checkbox({
			onChecked() {
				self.state.customGameSettings.enabled = true;
				self.setState({ casualgame: true });
			},
			onUnchecked() {
				self.state.customGameSettings.enabled = false;
				self.setState({});
			}
		});
	}

	powerPicker(slot) {
		const name = () => {
			if (slot == 0) return 'First Power';
			if (slot == 1) return 'Second Power';
			if (slot == 2) return 'Third Power';
			if (slot == 3) return 'Fourth Power';
			return 'Fifth Power';
		};
		return (
			<div ref={select => (this[`power${slot + 1}`] = select)} className={`ui search selection dropdown power${slot + 1}val`} style={{ minWidth: '11em' }}>
				<h4 className="ui header">{name()}</h4>
				<input type="hidden" name={`power${slot + 1}val`} />
				<i className="dropdown icon" />
				<div className="default text">No Power</div>
				<div className="menu">
					<div className="item" data-value="null">
						No Power
					</div>
					<div className="item" data-value="investigate">
						Investigate
					</div>
					<div className="item" data-value="deckpeek">
						Deck Peek
					</div>
					<div className="item" data-value="election">
						Special Election
					</div>
					<div className="item" data-value="bullet">
						Bullet
					</div>
					<div className="item" data-value="reverseinv">
						Show Loyalty
					</div>
					<div className="item" data-value="peekdrop">
						Peek & Drop
					</div>
				</div>
			</div>
		);
	}

	sliderNumFas = val => {
		const { customGameSettings } = this.state;

		customGameSettings.fascistCount = val[0];
		customGameSettings.enabled = true;
		this.setState({ casualgame: true, customGameSettings });
	};

	sliderHitlerZone = val => {
		const { customGameSettings } = this.state;
		customGameSettings.hitlerZone = val[0];
		customGameSettings.enabled = true;
		this.setState({ casualgame: true, customGameSettings });
	};

	sliderVetoZone = val => {
		const { customGameSettings } = this.state;
		customGameSettings.vetoZone = val[0];
		customGameSettings.enabled = true;
		this.setState({ casualgame: true, customGameSettings });
	};

	sliderDeckLib = val => {
		const { customGameSettings } = this.state;
		customGameSettings.deckState.lib = val[0];
		customGameSettings.enabled = true;
		this.setState({ casualgame: true, customGameSettings });
	};

	sliderDeckFas = val => {
		const { customGameSettings } = this.state;
		customGameSettings.deckState.fas = val[0];
		customGameSettings.enabled = true;
		this.setState({ casualgame: true, customGameSettings });
	};

	sliderTrackLib = val => {
		const { customGameSettings } = this.state;
		customGameSettings.trackState.lib = val[0];
		customGameSettings.enabled = true;
		this.setState({ casualgame: true, customGameSettings });
	};

	sliderTrackFas = val => {
		const { customGameSettings } = this.state;
		customGameSettings.trackState.fas = val[0];
		customGameSettings.enabled = true;
		this.setState({ casualgame: true, customGameSettings });
	};

	sliderChange = sliderValues => {
		const { checkedSliderValues } = this.state;

		this.setState({
			sliderValues,
			checkedSliderValues: new Array(6)
				.fill(true)
				.map(
					(el, index) =>
						(index + 5 >= sliderValues[0] && index + 5 <= sliderValues[1] && checkedSliderValues[index]) ||
						index + 5 === sliderValues[0] ||
						index + 5 === sliderValues[1]
				)
		});
	};

	customGameSliderChange = sliderValues => {
		this.setState({
			customGameSliderValue: sliderValues
		});
	};

	createNewGame = () => {
		const $creategame = $('section.creategame');
		const { userInfo } = this.props;
		const { customGameSettings, customGameSliderValue } = this.state;

		if (userInfo.gameSettings.isPrivate && !this.state.privateShowing) {
			return;
		}

		let containsBadWord = false;

		blacklistedWords.forEach(word => {
			if (new RegExp(word, 'i').test($creategame.find('div.gamename input').val())) {
				containsBadWord = true;
			}
		});

		if (containsBadWord) {
			this.setState({ containsBadWord: true });
		} else if (userInfo.gameSettings && userInfo.gameSettings.unbanTime && new Date(userInfo.gameSettings.unbanTime) > new Date()) {
			window.alert('Sorry, this service is currently unavailable.');
		} else {
			const excludedPlayerCount = this.state.checkedSliderValues.map((el, index) => (el ? null : index + 5)).filter(el => el);
			const data = {
				gameName: $creategame.find('div.gamename input').val() || 'New Game',
				flag: $creategame.find('div.flag input').val() || 'none',
				minPlayersCount: customGameSettings.enabled ? customGameSliderValue[0] : this.state.sliderValues[0],
				excludedPlayerCount,
				maxPlayersCount: customGameSettings.enabled ? customGameSliderValue[0] : this.state.isTourny ? undefined : this.state.sliderValues[1],
				experiencedMode: this.state.experiencedmode,
				disableChat: this.state.disablechat,
				disableObserver: this.state.disableobserver && !this.state.isTourny,
				isTourny: this.state.isTourny,
				isVerifiedOnly: userInfo.verified ? this.state.isVerifiedOnly : false,
				disableGamechat: this.state.disablegamechat,
				rainbowgame: this.state.rainbowgame,
				blindMode: this.state.blindMode,
				timedMode: this.state.timedMode ? this.state.timedSliderValue[0] : false,
				casualGame: this.state.casualgame,
				rebalance6p: this.state.checkedRebalanceValues[0],
				rebalance7p: this.state.checkedRebalanceValues[1],
				rebalance9p2f: this.state.checkedRebalanceValues[2],
				eloSliderValue: this.state.isEloLimited ? this.state.eloSliderValue[0] : null,
				privatePassword: this.state.privateShowing ? $(this.privategamepassword).val() : false,
				customGameSettings: this.state.customGameSettings.enabled ? this.state.customGameSettings : undefined
			};

			if (this.state.isTourny) {
				game.general.tournyInfo = {
					round: 0,
					queuedPlayers: [
						{
							userName: userInfo.userName,
							customCardback: userInfo.gameSettings.customCardback,
							customCardbackUid: userInfo.gameSettings.customCardbackUid,
							tournyWins: userInfo.gameSettings.tournyWins,
							connected: true,
							cardStatus: {
								cardDisplayed: false,
								isFlipped: false,
								cardFront: 'secretrole',
								cardBack: {}
							}
						}
					]
				};
			}

			this.props.socket.emit('addNewGame', data);
		}
	};

	renderPlayerSlider() {
		const { isTourny, customGameSettings } = this.state;
		const sliderCheckboxClick = index => {
			const newSliderValues = this.state.checkedSliderValues.map((el, i) => (i === index ? !el : el));
			const includedPlayerCounts = newSliderValues.map((el, i) => (el ? i + 5 : null)).filter(el => el !== null);
			const minPlayers = Math.min(...includedPlayerCounts);
			const maxPlayers = Math.max(...includedPlayerCounts);

			this.setState({
				checkedSliderValues: newSliderValues,
				sliderValues: [minPlayers, maxPlayers]
			});
		};

		return (
			<div className="eight wide column centered slider">
				<h4 className="ui header">Number of players</h4>
				{isTourny ? (
					<Range
						className="tourny-slider"
						onChange={this.sliderChange}
						min={1}
						max={3}
						defaultValue={[0]}
						value={this.state.sliderValues}
						marks={{ 1: '14', 2: '16', 3: '18' }}
					/>
				) : customGameSettings.enabled ? (
					<Range
						onChange={this.customGameSliderChange}
						min={5}
						max={10}
						defaultValue={[7]}
						value={this.state.customGameSliderValue}
						marks={{ 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10' }}
					/>
				) : (
					<Range
						onChange={this.sliderChange}
						min={5}
						max={10}
						defaultValue={[5, 10]}
						value={this.state.sliderValues}
						marks={{ 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10' }}
					/>
				)}
				{!isTourny && !customGameSettings.enabled && (
					<div className="checkbox-container">
						{new Array(6).fill(true).map((el, index) => (
							<label key={index}>
								<input
									type="checkbox"
									checked={this.state.checkedSliderValues[index]}
									disabled={this.state.sliderValues[0] === this.state.sliderValues[1] ? (index + 5 === this.state.sliderValues[0] ? true : false) : false}
									onChange={() => {
										sliderCheckboxClick(index);
									}}
								/>
							</label>
						))}
					</div>
				)}
			</div>
		);
	}

	renderRebalanceCheckboxes() {
		const rebalancedInputClick = index => {
			const { checkedRebalanceValues } = this.state;

			checkedRebalanceValues[index] = !checkedRebalanceValues[index];

			this.setState(checkedRebalanceValues);
		};

		return (
			<div className={this.state.isTourny ? 'rebalance-container isTourny' : 'rebalance-container'}>
				<span title="When enabled, 6p games have a fascist policy already enacted, and 7p and 9p games start with one less fascist policy in the deck.">
					<i className="info circle icon" />
					Rebalance:
				</span>

				{new Array(3).fill(true).map((el, index) => (
					<label key={index} className={`rebalance-${index}`}>
						<input
							type="checkbox"
							checked={this.state.checkedRebalanceValues[index]}
							disabled={(() => {
								const firstSlider = this.state.sliderValues[0];
								const secondSlider = this.state.sliderValues[1];

								if (index === 0) {
									return firstSlider > 6 || secondSlider < 6;
								}

								if (index === 1) {
									return firstSlider > 7 || secondSlider < 7;
								}

								return firstSlider > 9 || secondSlider < 9;
							})()}
							onChange={() => {
								rebalancedInputClick(index);
							}}
						/>
					</label>
				))}
			</div>
		);
	}

	timedSliderChange = timedSliderValue => {
		if (timedSliderValue < 30) {
			this.state.casualgame = true;
		}

		this.setState({ timedSliderValue });
	};

	eloSliderChange = eloSliderValue => {
		this.setState({ eloSliderValue });
	};

	renderEloSlider() {
		const origMarks = { 1600: '1600', 1650: '', 1700: '1700', 1750: '', 1800: '1800', 1850: '', 1900: '1900', 1950: '', 2000: '2000' };
		const { userInfo, userList } = this.props;
		if (userInfo.gameSettings && userInfo.gameSettings.disableElo) return null;
		let player = null;
		if (userList.list) player = userList.list.find(p => p.userName === userInfo.userName);
		const isSeason = (userInfo.gameSettings && !userInfo.gameSettings.disableSeasonal) || false;
		const playerElo = (player && Math.min(2000, player.eloSeason)) || 2000;
		const playerEloNonseason = (player && Math.min(2000, player.eloOverall)) || 2000;
		const max = Math.max(playerElo, playerEloNonseason);
		const marks = Object.keys(origMarks)
			.filter(k => origMarks[k] <= max)
			.reduce((obj, key) => {
				obj[key] = origMarks[key];
				return obj;
			}, {});

		if ((isSeason && playerElo > 1600) || (playerEloNonseason && playerEloNonseason > 1600)) {
			return (
				<div className="sixteen wide column" style={{ marginTop: '-30px' }}>
					{this.state.isEloLimited && (
						<div>
							<h4 className="ui header">Minimum elo to sit in this game</h4>
							<Range onChange={this.eloSliderChange} min={1600} max={max} defaultValue={[1600]} value={this.state.eloSliderValue} marks={marks} />
						</div>
					)}
					<div className="four wide column elorow" style={{ margin: '-50 auto 0' }}>
						<i className="big arrows alternate horizontal icon" />
						<h4 className="ui header">Elo limited game</h4>
						<div
							className="ui fitted toggle checkbox"
							ref={c => {
								this.elolimited = c;
							}}
						>
							<input type="checkbox" name="elolimited" defaultChecked={false} />
						</div>
					</div>
				</div>
			);
		}
	}

	renderDeck() {
		const { customGameSettings } = this.state;
		const numLib = customGameSettings.deckState.lib - customGameSettings.trackState.lib;
		const numFas = customGameSettings.deckState.fas - customGameSettings.trackState.fas;
		const rowWidth = Math.ceil((numLib + numFas) / 3);
		const data = _.range(0, numLib)
			.map((val, i) => {
				return <div key={`L${i}`} className="deckcard" style={{ backgroundImage: "url('../images/cards/liberalp-l.png')" }} />;
			})
			.concat(
				_.range(0, numFas).map((val, i) => {
					return <div key={`F${i}`} className="deckcard" style={{ backgroundImage: "url('../images/cards/fascistp-l.png')" }} />;
				})
			);
		const thirds = [];
		data.forEach((elem, idx) => {
			if (thirds[Math.floor(idx / rowWidth)] == null) thirds[Math.floor(idx / rowWidth)] = [];
			thirds[Math.floor(idx / rowWidth)][idx % rowWidth] = elem;
		});
		if ((numLib + numFas) % 3 == 1) {
			// Causes two rows to be one short, instead of one row being two short.
			thirds[2][rowWidth - 2] = thirds[1][rowWidth - 1];
			delete thirds[1][rowWidth - 1];
		}
		return thirds.map((val, i) => {
			return (
				<div key={i} className="column" style={{ width: '4em', marginBottom: '-2.5rem', display: 'flex', width: 'auto' }}>
					{val}
				</div>
			);
		});
	}

	renderFasTrack() {
		const { customGameSettings } = this.state;
		const offX = 94;
		const offY = 6;
		const powers = customGameSettings.powers.map(p => {
			if (p == null || p == '' || p == 'null') return 'None';
			if (p == 'investigate') return 'Inv';
			if (p == 'deckpeek') return 'Peek';
			if (p == 'election') return 'Elect';
			if (p == 'bullet') return 'Gun';
			if (p == 'reverseinv') return 'ReverseInv';
			if (p == 'peekdrop') return 'PeekDrop';
			return null;
		});
		const numFas = customGameSettings.fascistCount;
		const hzStart = customGameSettings.hitlerZone;
		const vzPoint = customGameSettings.vetoZone;
		const hitKnowsFas = customGameSettings.hitKnowsFas;
		const getHZ = pos => {
			if (pos < hzStart) return 'Off';
			if (pos > hzStart) return 'On';
			return 'Start';
		};
		return (
			<div
				style={{
					backgroundSize: 'contain',
					backgroundRepeat: 'no-repeat',
					top: 0,
					left: 0,
					height: '220px',
					width: '650px',
					margin: 'auto',
					backgroundImage: "url('../images/customtracks/fasTrack.png')"
				}}
			>
				<span
					style={{
						width: '92px',
						height: '120px',
						left: `${offX + 137}px`,
						top: `${offY + 58}px`,
						position: 'absolute',
						backgroundImage: `url(../images/customtracks/fasTrackHZ${getHZ(1)}.png)`
					}}
				/>
				<span
					style={{
						width: '92px',
						height: '120px',
						left: `${offX + 229}px`,
						top: `${offY + 58}px`,
						position: 'absolute',
						backgroundImage: `url(../images/customtracks/fasTrackHZ${getHZ(2)}.png)`
					}}
				/>
				<span
					style={{
						width: '92px',
						height: '120px',
						left: `${offX + 321}px`,
						top: `${offY + 58}px`,
						position: 'absolute',
						backgroundImage: `url(../images/customtracks/fasTrackHZ${getHZ(3)}.png)`
					}}
				/>
				<span
					style={{
						width: '92px',
						height: '120px',
						left: `${offX + 413}px`,
						top: `${offY + 58}px`,
						position: 'absolute',
						backgroundImage: `url(../images/customtracks/fasTrackHZ${getHZ(4)}.png)`
					}}
				/>
				<span
					style={{
						width: '92px',
						height: '120px',
						left: `${offX + 505}px`,
						top: `${offY + 58}px`,
						position: 'absolute',
						backgroundImage: `url(../images/customtracks/fasTrackHZ${getHZ(5)}.png)`
					}}
				/>

				<span
					className="custom-fastrack-powerslot"
					style={{
						left: `${offX + 58}px`,
						top: `${offY + 58}px`,
						backgroundImage: `url(../images/customtracks/fasPower${powers[0]}${hzStart <= 0 ? 'Light' : ''}.png)`
					}}
				>
					{vzPoint == 1 && <span className={'custom-fastrack-powerslot ' + (hzStart <= 0 ? 'custom-fastrack-vetozone-light' : 'custom-fastrack-vetozone')} />}
				</span>
				<span
					className="custom-fastrack-powerslot"
					style={{
						left: `${offX + 150}px`,
						top: `${offY + 58}px`,
						backgroundImage: `url(../images/customtracks/fasPower${powers[1]}${hzStart <= 1 ? 'Light' : ''}.png)`
					}}
				>
					{vzPoint == 2 && <span className={'custom-fastrack-powerslot ' + (hzStart <= 1 ? 'custom-fastrack-vetozone-light' : 'custom-fastrack-vetozone')} />}
				</span>
				<span
					className="custom-fastrack-powerslot"
					style={{
						left: `${offX + 242}px`,
						top: `${offY + 58}px`,
						backgroundImage: `url(../images/customtracks/fasPower${powers[2]}${hzStart <= 2 ? 'Light' : ''}.png)`
					}}
				>
					{vzPoint == 3 && <span className={'custom-fastrack-powerslot ' + (hzStart <= 2 ? 'custom-fastrack-vetozone-light' : 'custom-fastrack-vetozone')} />}
				</span>
				<span
					className="custom-fastrack-powerslot"
					style={{
						left: `${offX + 334}px`,
						top: `${offY + 58}px`,
						backgroundImage: `url(../images/customtracks/fasPower${powers[3]}${hzStart <= 3 ? 'Light' : ''}.png)`
					}}
				>
					{vzPoint == 4 && <span className={'custom-fastrack-powerslot ' + (hzStart <= 3 ? 'custom-fastrack-vetozone-light' : 'custom-fastrack-vetozone')} />}
				</span>
				<span
					className="custom-fastrack-powerslot"
					style={{
						left: `${offX + 426}px`,
						top: `${offY + 58}px`,
						backgroundImage: `url(../images/customtracks/fasPower${powers[4]}${hzStart <= 4 ? 'Light' : ''}.png)`
					}}
				>
					{vzPoint == 5 && <span className={'custom-fastrack-powerslot ' + (hzStart <= 4 ? 'custom-fastrack-vetozone-light' : 'custom-fastrack-vetozone')} />}
				</span>
				<span
					className="custom-fastrack-powerslot"
					style={{ left: `${offX + 518}px`, top: `${offY + 58}px`, backgroundImage: 'url(../images/customtracks/fasPowerEndGame.png)' }}
				/>
				<span
					style={{
						width: '268px',
						height: '15px',
						left: `${offX + 336}px`,
						top: `${offY + 60}px`,
						position: 'absolute',
						backgroundImage: 'url(../images/customtracks/fasTrackHZText.png)'
					}}
				/>
				<span
					style={{
						width: '227px',
						height: '11px',
						left: `${offX + 220}px`,
						top: `${offY + 186}px`,
						position: 'absolute',
						backgroundImage: `url(../images/customtracks/fasTrack${numFas}fas.png)`
					}}
				/>
				<span
					style={{
						width: '227px',
						height: '11px',
						left: `${offX + 220}px`,
						top: `${offY + 196}px`,
						position: 'absolute',
						backgroundImage: `url(../images/customtracks/fasTrack${numFas > 1 ? 'Multi' : 'Single'}${hitKnowsFas ? 'Known' : 'Unknown'}.png)`
					}}
				/>
			</div>
		);
	}

	renderCustomGames() {
		const { hitKnowsFas } = this.state.customGameSettings;

		const renderFas = () => {
			return _.range(0, this.state.customGameSettings.fascistCount).map((val, i) => (
				<div
					key={i}
					className="rolecard"
					style={{ backgroundImage: hitKnowsFas ? `url('../images/cards/fascist${val}.png')` : "url('../images/cards/secretrole.png')" }}
				/>
			));
		};

		const renderLib = () => {
			return _.range(0, this.state.customGameSliderValue - this.state.customGameSettings.fascistCount - 1).map((val, i) => (
				<div
					key={i}
					className="rolecard"
					style={{ backgroundImage: hitKnowsFas ? `url('../images/cards/liberal${val % 6}.png')` : "url('../images/cards/secretrole.png')" }}
				/>
			));
		};

		return (
			<React.Fragment>
				<div className="row">
					<div className="wide column" style={{ width: '20%' }}>
						{this.powerPicker(0)}
					</div>
					<div className="wide column" style={{ width: '20%' }}>
						{this.powerPicker(1)}
					</div>
					<div className="wide column" style={{ width: '20%' }}>
						{this.powerPicker(2)}
					</div>
					<div className="wide column" style={{ width: '20%' }}>
						{this.powerPicker(3)}
					</div>
					<div className="wide column" style={{ width: '20%' }}>
						{this.powerPicker(4)}
					</div>
				</div>
				<div className="row">
					<div className="seven wide column">
						<div>
							<h4 className="ui header">Hitler Zone</h4>
							<Range
								min={1}
								max={5}
								defaultValue={[3]}
								onChange={this.sliderHitlerZone}
								value={[this.state.customGameSettings.hitlerZone]}
								marks={{ 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }}
							/>
						</div>
					</div>
					<div className="two wide column" />
					<div className="seven wide column">
						<div>
							<h4 className="ui header">Veto Zone</h4>
							<Range
								min={1}
								max={5}
								defaultValue={[5]}
								onChange={this.sliderVetoZone}
								value={[this.state.customGameSettings.vetoZone]}
								marks={{ 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }}
							/>
						</div>
					</div>
				</div>
				<div className="row">{this.renderFasTrack()}</div>
				<div className="eight wide column ui grid" style={{ height: 'fit-content' }}>
					<div className="row">
						<div className="eight wide column">
							<div>
								<h4 className="ui header">Number of fascists</h4>
								<Range
									min={1}
									max={3}
									defaultValue={[2]}
									onChange={this.sliderNumFas}
									value={[this.state.customGameSettings.fascistCount]}
									marks={{ 1: '1', 2: '2', 3: '3' }}
								/>
							</div>
						</div>
						<div className="eight wide column">
							<h4 className="ui header">Hitler sees fascists</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.hitseesfas = c;
								}}
							>
								<input type="checkbox" name="hitseesfas" defaultChecked={false} />
							</div>
						</div>
					</div>
					<div className="row">
						<div style={{ display: 'flex', width: '100%', marginBottom: '6px' }}>
							<div className="rolecard" style={{ backgroundImage: "url('../images/cards/hitler0.png')" }} />
							{renderFas()}
						</div>
						<div style={{ display: 'flex', width: '100%' }}>{renderLib()}</div>
					</div>
				</div>
				<div className="eight wide column ui grid" style={{ marginTop: '-1rem', marginLeft: '3rem', marginBottom: '3rem' }}>
					<div className="row">
						<div className="eight wide column">
							<h4 className="ui header">Liberal policies</h4>
							<Range
								min={5}
								max={8}
								defaultValue={[6]}
								onChange={this.sliderDeckLib}
								value={[this.state.customGameSettings.deckState.lib]}
								marks={{ 5: '5', 6: '6', 7: '7', 8: '8' }}
							/>
						</div>
						<div className="eight wide column">
							<h4 className="ui header">Fascist policies</h4>
							<Range
								min={10}
								max={19}
								defaultValue={[12]}
								onChange={this.sliderDeckFas}
								value={[this.state.customGameSettings.deckState.fas]}
								marks={{ 10: '10', 11: '', 12: '', 13: '13', 14: '', 15: '', 16: '16', 17: '', 18: '', 19: '19' }}
							/>
						</div>
					</div>
					<div className="row">
						<div className="eight wide column">
							<h4 className="ui header">Starting lib policies</h4>
							<Range
								min={0}
								max={2}
								defaultValue={[0]}
								onChange={this.sliderTrackLib}
								value={[this.state.customGameSettings.trackState.lib]}
								marks={{ 0: '0', 1: '1', 2: '2' }}
							/>
						</div>
						<div className="eight wide column">
							<h4 className="ui header">Starting fas policies</h4>
							<Range
								min={0}
								max={2}
								defaultValue={[0]}
								onChange={this.sliderTrackFas}
								value={[this.state.customGameSettings.trackState.fas]}
								marks={{ 0: '0', 1: '1', 2: '2' }}
							/>
						</div>
					</div>
					<div className="row">{this.renderDeck()}</div>
				</div>
			</React.Fragment>
		);
	}

	getErrors() {
		const errs = [];

		const { userInfo, userList } = this.props;
		if (userList && userList.list) {
			// Can happen when refreshing.
			const player = userList.list.find(p => p.userName === userInfo.userName);
			if (!player) errs.push('Not logged in, please refresh.');
			else if (this.state.isEloLimited) {
				const playerElo = player.eloSeason;
				const playerEloNonseason = player.eloOverall;
				if (this.state.eloSliderValue[0] > playerEloNonseason) errs.push(`Elo slider set too high, your overall elo is ${playerEloNonseason}.`);
				else if (this.state.eloSliderValue[0] > playerElo) errs.push(`Elo slider set too high, your seasonal elo is ${playerElo}.`);
			}
		}
		if (this.state.customGameSettings.enabled) {
			if (this.state.customGameSettings.fascistCount + 1 >= this.state.customGameSliderValue / 2) {
				errs.push('There must be a liberal majority when the game starts.');
			}
			if (this.state.customGameSettings.vetoZone <= this.state.customGameSettings.trackState.fas) {
				errs.push('Veto Zone cannot be active when the game starts.');
			}
		}
		if (errs.length) return errs;
		return null;
	}

	renderErrors() {
		const errs = this.getErrors();
		if (errs) {
			return (
				<div className="sixteen wide column">
					{errs.map((e, i) => (
						<h4 key={i} className="ui header" style={{ color: 'red' }}>
							{e}
						</h4>
					))}
				</div>
			);
		}
	}

	render() {
		let createClass = 'ui button primary';
		if (this.getErrors() != null) {
			createClass += ' disabled';
		}

		return (
			<section className="creategame">
				<a href="#/">
					<i className="remove icon" />
				</a>
				<div className="ui header">
					<div className="content">Create a new game</div>
				</div>
				<div className="ui grid centered footer">
					<div onClick={this.createNewGame} className={createClass}>
						Create game
					</div>
				</div>
				<div className="ui grid">
					<div className="row">
						<div className="four wide column">
							<h4 className="ui header">Flag:</h4>
							<div ref={select => (this._select = select)} className="ui search selection dropdown flag">
								{renderFlagDropdown()}
							</div>
						</div>
						<div className="five wide column gamename">
							<h4 className="ui header">Game name:</h4>
							<div className="ui input">
								<input
									maxLength="20"
									placeholder="New Game"
									onKeyPress={e => {
										const { LEGALCHARACTERS } = require('../../constants');
										if (!LEGALCHARACTERS(e.key)) e.preventDefault();
									}}
								/>
							</div>
							{this.state.containsBadWord && <p className="contains-bad-word">This game name has a banned word or word fragment.</p>}
						</div>
						<div className="three wide column privategame">
							<h4 className="ui header">Private game</h4>
							<i className="big yellow lock icon" />
							<div
								className="ui fitted toggle checkbox private"
								ref={c => {
									this.privategame = c;
								}}
							>
								<input type="checkbox" name="privategame" defaultChecked={false} />
							</div>
						</div>
						{this.state.privateShowing && (
							<div className="four wide column ui input">
								<input
									className="password-input"
									maxLength="20"
									placeholder="Password"
									autoFocus
									ref={c => {
										this.privategamepassword = c;
									}}
								/>
							</div>
						)}
					</div>
					<div className="row slider">{this.renderPlayerSlider()}</div>
					<div className="row rebalance">{!this.state.customGameSettings.enabled && this.renderRebalanceCheckboxes()}</div>

					{/* <div className="row tourny-row">
						<div className="sixteen wide column tourny-container">
							<h4 className="ui header">Tournament mode</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.tournyconfirm = c;
								}}
							>
								<input type="checkbox" name="tournyconfirm" defaultChecked={false} />
							</div>
						</div>
					</div> */}
					{this.state.timedMode && (
						<div className="row timedmode-slider">
							<div className="sixteen wide column">
								<Range
									onChange={this.timedSliderChange}
									defaultValue={[120]}
									value={this.state.timedSliderValue}
									min={2}
									max={600}
									marks={{ 2: '2 seconds', 30: '', 60: '', 90: '', 120: '2 minutes', 180: '', 240: '', 300: '5 minutes', 600: '10 minutes' }}
								/>
							</div>
						</div>
					)}
					<div className="row timedmode-check">
						<div className="sixteen wide column">
							{this.state.timedMode && (
								<span className="timed-slider-value">
									{(() => {
										const timeInSeconds = this.state.timedSliderValue[0];

										return `${Math.floor(timeInSeconds / 60)}: ${timeInSeconds % 60 < 10 ? `0${timeInSeconds % 60}` : timeInSeconds % 60}`;
									})()}
								</span>
							)}
							<span
								title="May glitch out - use with caution"
								style={{
									color: 'red',
									position: 'absolute',
									left: '-130px',
									top: '40px'
								}}
							>
								<i className="warning icon" style={{ color: 'red' }} />
								Caution: <br />
								May glitch out
								<br />
								Use with caution
							</span>
							<i className="big hourglass half icon" />
							<h4 className="ui header">
								Timed mode - if a player does not make an action after a certain amount of time, that action is completed for them randomly.
							</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.timed = c;
								}}
							>
								<input type="checkbox" name="timedmode" defaultChecked={false} />
							</div>
						</div>
					</div>
					{this.props.userInfo.verified && (
						<div className="row verified-row">
							<div className="sixteen wide column">
								<i className="big thumbs up icon" style={{ color: 'tan !important' }} />
								<h4 className="ui header" style={{ color: 'tan' }}>
									Verified - only verified players can play in this game.
								</h4>
								<div
									className="ui fitted toggle checkbox"
									ref={c => {
										this.verified = c;
									}}
								>
									<input type="checkbox" name="verified" defaultChecked={false} />
								</div>
							</div>
						</div>
					)}
					{this.renderEloSlider()}
					<div className="row sliderrow">
						<div className="four wide column disablechat">
							<i className="big unmute icon" />
							<h4 className="ui header">Disable player chat - use this for voice-only games</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.disablechat = c;
								}}
							>
								<input type="checkbox" name="disablechat" defaultChecked={false} />
							</div>
						</div>
						<div className="four wide column disablegamechat">
							<i className="big game icon" />
							<h4 className="ui header">Disable game chats - you're on your own to remember what happened over the course of the game</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.disablegamechat = c;
								}}
							>
								<input type="checkbox" name="disablegamechat" defaultChecked={false} />
							</div>
						</div>
						<div className="four wide column experiencedmode">
							<i className="big fast forward icon" />
							<h4 className="ui header">Speed mode - most animations and pauses greatly reduced and fewer gamechats</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.experiencedmode = c;
								}}
							>
								<input type="checkbox" name="experiencedmode" defaultChecked={true} />
							</div>
						</div>
						{(() => {
							let user, isRainbow;

							if (this.props.userList.list) {
								user = this.props.userList.list.find(user => user.userName === this.props.userInfo.userName);
							}
							if (user) {
								isRainbow = user.wins + user.losses > 49;
							}
							if (isRainbow) {
								return (
									<div className="four wide column experiencedmode">
										<img src="../images/rainbow.png" />
										<h4 className="ui header">Rainbow game - only fellow 50+ game veterans can be seated in this game</h4>
										<div
											className="ui fitted toggle checkbox"
											ref={c => {
												this.rainbowgame = c;
											}}
										>
											<input type="checkbox" name="rainbowgame" defaultChecked={true} />
										</div>
									</div>
								);
							}
						})()}
					</div>
					<div className="row">
						<div className="four wide column">
							<i className="big hide icon" />
							<h4 className="ui header">Blind mode - player's names are replaced with random animal names, anonymizing them.</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.blindmode = c;
								}}
							>
								<input type="checkbox" name="blindmode" defaultChecked={false} />
							</div>
						</div>
						{!this.state.isTourny && (
							<div className="four wide column">
								<i className="big talk icon" />
								<h4 className="ui header">Disable observer chat</h4>
								<div
									className="ui fitted toggle checkbox"
									ref={c => {
										this.disableobserver = c;
									}}
								>
									<input type="checkbox" name="disableobserver" defaultChecked={false} />
								</div>
							</div>
						)}
						<div className="four wide column">
							<i className="big handshake icon" />
							<h4 className="ui header">Casual game - this game will not count towards your wins and losses</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.casualgame = c;
								}}
							>
								<input type="checkbox" name="casualgame" defaultChecked={this.state.casualgame} />
							</div>
						</div>
						{this.props.userInfo.gameSettings && this.props.userInfo.gameSettings.isPrivate && (
							<div className="four wide column privateonlygame">
								<h4 className="ui header">Private only game - only other anonymous players can be seated.</h4>
								<div
									className="ui fitted toggle checkbox"
									ref={c => {
										this.privateonlygame = c;
									}}
								>
									<input type="checkbox" name="privateonlygame" defaultChecked={false} />
								</div>
							</div>
						)}
					</div>
					<div className="row">
						<div className="sixteen wide column">
							<i className="big setting icon" />
							<h4 className="ui header">Custom Game - Use a custom fascist track.</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.customgame = c;
								}}
							>
								<input type="checkbox" name="customgame" defaultChecked={false} />
							</div>
						</div>
					</div>
					{this.state.customGameSettings.enabled && this.renderCustomGames()}
					{this.renderErrors()}
				</div>
				<div className="ui grid centered footer">
					<div onClick={this.createNewGame} className={createClass}>
						Create game
					</div>
				</div>
			</section>
		);
	}
}

Creategame.propTypes = {
	socket: PropTypes.object,
	userInfo: PropTypes.object,
	userList: PropTypes.object
};
