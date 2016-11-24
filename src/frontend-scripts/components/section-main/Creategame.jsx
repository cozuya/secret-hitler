import React from 'react';
import $ from 'jquery';
import Slider from 'rc-slider';
import Checkbox from 'semantic-ui-checkbox';

$.fn.checkbox = Checkbox;

export default class Creategame extends React.Component {
	constructor() {
		super();
		this.leaveCreateGame = this.leaveCreateGame.bind(this);
		this.createNewGame = this.createNewGame.bind(this);
		this.sliderChange = this.sliderChange.bind(this);
		this.state = {
			sliderValues: [5, 10],
			experiencedmode: false,
			disablechat: false,
			disablegamechat: false
		};
	}

	componentDidMount() {
		const self = this;

		$(this.experiencedmode).checkbox({
			onChecked() {
				self.setState({experiencedmode: true});
			},
			onUnchecked() {
				self.setState({experiencedmode: false});
			}
		});

		$(this.disablechat).checkbox({
			onChecked() {
				self.setState({disablechat: true});
			},
			onUnchecked() {
				self.setState({disablechat: false});
			}
		});

		$(this.disablegamechat).checkbox({
			onChecked() {
				self.setState({disablegamechat: true});
			},
			onUnchecked() {
				self.setState({disablegamechat: false});
			}
		});
	}

	sliderChange(event) {
		this.setState({sliderValues: event});
	}

	leaveCreateGame() {
		this.props.onLeaveCreateGame('default');
	}

	createNewGame() {
		const $creategame = $('section.creategame');

		this.props.onCreateGameSubmit({
			gameState: {
				previousElectedGovernment: [],
				undrawnPolicyCount: 17,
				discardedPolicyCount: 0,
				presidentIndex: -1
			},
			chats: [],
			general: {
				uid: Math.random().toString(36).substring(6),
				name: $creategame.find('div.gamename input').val() || 'New Game',
				minPlayersCount: this.state.sliderValues[0],
				maxPlayersCount: this.state.sliderValues[1],
				status: `Waiting for ${this.state.sliderValues[0] - 1} more players..`,
				experiencedMode: this.state.experiencedmode,
				disableChat: this.state.disablechat,
				disableGamechat: this.state.disablegamechat,
				private: false,
				electionCount: 0
			},
			publicPlayersState: [{
				userName: this.props.userInfo.userName,
				connected: true,
				cardStatus: {
					cardDisplayed: false,
					isFlipped: false,
					cardFront: 'secretrole',
					cardBack: {}
				}
			}],
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

	render() {
		return (
			<section className="creategame">
				<i className="remove icon" onClick={this.leaveCreateGame} />
				<div className="ui header">
					<div className="content">
						Create a new game
					</div>
				</div>
				<div className="ui grid">
					<div className="row">
						<div className="four wide column gamename">
							<h4 className="ui header">Game name<small>(optional)</small></h4>
							<div className="ui input">
								<input maxLength="20" placeholder="New Game" />
							</div>
						</div>
						<div className="eight wide column slider">
							<h4 className="ui header">Number of players</h4>
							<Slider onChange={this.sliderChange} min={5} max={10} range defaultValue={[5, 10]} marks={{5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10'}} />
						</div>
						<div className="four wide column privategame">
							<h4 className="ui header">Private game</h4>
							<h5 className="ui header">Coming soon!</h5>
							<div className="ui checkbox disabled" />
						</div>
					</div>
					<div className="row sliderrow">
						<div className="four wide column experiencedmode">
							<h4 className="ui header">Experienced mode - most animations and pauses greatly reduced and fewer gamechats</h4>
							<div className="ui fitted toggle checkbox" ref={c => {
								this.experiencedmode = c;
							}}>
								<input type="checkbox" name="experiencedmode" defaultChecked={false} />
							</div>
						</div>
						<div className="four wide column disablechat">
							<h4 className="ui header">Disable player chat - use this for voice-only games</h4>
							<div className="ui fitted toggle checkbox" ref={c => {
								this.disablechat = c;
							}}>
								<input type="checkbox" name="disablechat" defaultChecked={false} />
							</div>
						</div>
						<div className="four wide column disablegamechat">
							<h4 className="ui header">Disable game chats - you're on your own to remember what happened over the course of the game</h4>
							<div className="ui fitted toggle checkbox" ref={c => {
								this.disablegamechat = c;
							}}>
								<input type="checkbox" name="disablegamechat" defaultChecked={false} />
							</div>
						</div>
					</div>
				</div>
				<div className="ui grid footer">
					<div onClick={this.createNewGame} className="ui button primary" style={{'marginLeft': '15px'}}>
							Create game
					</div>
				</div>
			</section>
		);
	}
}

Creategame.propTypes = {
	onCreateGameSubmit: React.PropTypes.func,
	onLeaveCreateGame: React.PropTypes.func,
	userInfo: React.PropTypes.object
};