import React from 'react';
import $ from 'jquery';
import { Range } from 'rc-slider';
import Checkbox from 'semantic-ui-checkbox';
import blacklistedWords from '../../../../iso/blacklistwords';
import PropTypes from 'prop-types';

$.fn.checkbox = Checkbox;

export default class Creategame extends React.Component {
	constructor() {
		super();
		this.createNewGame = this.createNewGame.bind(this);
		this.sliderChange = this.sliderChange.bind(this);
		this.state = {
			sliderValues: [5, 10],
			experiencedmode: false,
			disablechat: false,
			disablegamechat: false,
			privateShowing: false,
			containsBadWord: false,
			rainbowgame: false,
			rebalance69p: true,
			checkedSliderValues: new Array(6).fill(true),
			isTourny: false
		};
	}

	componentDidMount() {
		const self = this;

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
				self.setState({ isTourny: true });
			},
			onUnchecked() {
				self.setState({ isTourny: false });
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
	}

	sliderChange(sliderValues) {
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
	}

	createNewGame() {
		const $creategame = $('section.creategame'),
			{ userInfo } = this.props;

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
			const uid = Math.random()
				.toString(36)
				.substring(2);

			this.props.socket.emit('addNewGame', {
				gameState: {
					previousElectedGovernment: [],
					undrawnPolicyCount: 17,
					discardedPolicyCount: 0,
					presidentIndex: -1
				},
				chats: [],
				general: {
					enabledPlayerCounts: this.state.checkedSliderValues.filter(el => el).map((el, i) => i + 5),
					whitelistedPlayers: [],
					uid,
					name: $creategame.find('div.gamename input').val() || 'New Game',
					minPlayersCount: this.state.sliderValues[0],
					excludedPlayerCount: this.state.checkedSliderValues.map((el, index) => (el ? null : index + 5)).filter(el => el),
					maxPlayersCount: this.state.sliderValues[1],
					status: `Waiting for ${this.state.sliderValues[0] - 1} more players..`,
					experiencedMode: this.state.experiencedmode,
					disableChat: this.state.disablechat,
					disableGamechat: this.state.disablegamechat,
					rainbowgame: this.state.rainbowgame,
					rebalance69p: this.state.rebalance69p,
					private: this.state.privateShowing ? $(this.privategamepassword).val() : false,
					electionCount: 0
				},
				publicPlayersState: [
					{
						userName: userInfo.userName,
						customCardback: userInfo.gameSettings.customCardback,
						customCardbackUid: userInfo.gameSettings.customCardbackUid,
						connected: true,
						cardStatus: {
							cardDisplayed: false,
							isFlipped: false,
							cardFront: 'secretrole',
							cardBack: {}
						}
					}
				],
				playersState: [],
				cardFlingerState: [],
				trackState: {
					liberalPolicyCount: 0,
					fascistPolicyCount: 0,
					electionTrackerCount: 0,
					enactedPolicies: []
				}
			});
		}
	}

	render() {
		const sliderCheckboxClick = index => {
			if (!this.state.sliderValues.includes(index + 5)) {
				this.setState({
					checkedSliderValues: this.state.checkedSliderValues.map((el, i) => (i === index ? !el : el))
				});
			}
		};

		return (
			<section className="creategame">
				<a href="#/">
					<i className="remove icon" />
				</a>
				<div className="ui header">
					<div className="content">Create a new game</div>
				</div>
				<div className="ui grid">
					<div className="row">
						<div className="four wide column gamename">
							<h4 className="ui header">
								Game name<small>(optional)</small>
							</h4>
							<div className="ui input">
								<input maxLength="20" placeholder="New Game" />
							</div>
							{this.state.containsBadWord && <p className="contains-bad-word">This game name has a banned word or word fragment.</p>}
						</div>
						<div className="eight wide column slider">
							<h4 className="ui header">Number of players</h4>
							<Range onChange={this.sliderChange} min={5} max={10} defaultValue={[5, 10]} marks={{ 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10' }} />
							<div className="checkbox-container">
								{new Array(6).fill(true).map((el, index) => (
									<label key={index}>
										<input
											type="checkbox"
											checked={this.state.checkedSliderValues[index]}
											disabled={index + 5 <= this.state.sliderValues[0] || index + 5 >= this.state.sliderValues[1]}
											onChange={() => {
												sliderCheckboxClick(index);
											}}
										/>
									</label>
								))}
							</div>
						</div>
						<div className="four wide column privategame">
							<h4 className="ui header">Private game</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.privategame = c;
								}}
							>
								<input type="checkbox" name="privategame" defaultChecked={false} />
							</div>
							{(() => {
								if (this.state.privateShowing) {
									return (
										<div className="ui input">
											<input
												maxLength="20"
												placeholder="Password"
												ref={c => {
													this.privategamepassword = c;
												}}
											/>
										</div>
									);
								}
							})()}
						</div>
					</div>
					<div className="row sliderrow">
						<div className="four wide column experiencedmode">
							<h4 className="ui header">Speed mode - most animations and pauses greatly reduced and fewer gamechats</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.experiencedmode = c;
								}}
							>
								<input type="checkbox" name="experiencedmode" defaultChecked={false} />
							</div>
						</div>
						<div className="four wide column disablechat">
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
							<h4 className="ui header">Rainbow game - only 50+ game veterans can be seated in this game</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.rainbowgame = c;
								}}
							>
								<input type="checkbox" name="rainbowgame" defaultChecked={false} />
							</div>
						</div>
					</div>
					<div className="row tournyrow" />
				</div>
				<div className="row">
					<div className="four wide column rebalance69p">
						<h4 className="ui header">Rebalance 6 & 9 player games - they have a policy card enacted on start.</h4>
						<div
							className="ui fitted toggle checkbox"
							ref={c => {
								this.rebalance69p = c;
							}}
						>
							<input type="checkbox" name="rebalance69p" defaultChecked={true} />
						</div>
					</div>
				</div>
				<div className="ui grid footer">
					<div onClick={this.createNewGame} className="ui button primary" style={{ marginLeft: '15px' }}>
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
