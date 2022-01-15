import { connect } from 'react-redux';
import { updateActiveStats, fetchReplay } from '../../actions/actions';
import Table from '../reusable/Table.jsx';
import React from 'react'; // eslint-disable-line no-unused-vars
import PropTypes from 'prop-types';
import $ from 'jquery';
import cn from 'classnames';
import { PLAYERCOLORS } from '../../constants';
import Swal from 'sweetalert2';
import { Dropdown } from 'semantic-ui-react';

const mapStateToProps = ({ profile }) => ({ profile });
const mapDispatchToProps = dispatch => ({
	updateActiveStats: activeStat => dispatch(updateActiveStats(activeStat)),
	fetchReplay: gameId => dispatch(fetchReplay(gameId))
});

class ProfileWrapper extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			bioStatus: 'displayed',
			blacklistClicked: false,
			blacklistShown: false,
			openTime: Date.now(),
			badgeSort: 'badge'
		};
	}

	static getDerivedStateFromProps(nextProps, prevState) {
		const name = prevState && prevState.profileUser;
		const newName = nextProps && nextProps.profile && nextProps.profile._id;
		let updatedState = null;

		if (name !== newName) {
			updatedState = { ...updatedState, profileUser: newName, blacklistClicked: false };
		}
		return updatedState;
	}

	formatDateString(dateString) {
		const date = new Date(dateString);

		return [date.getDate(), date.getMonth() + 1, date.getFullYear()].join('-');
	}

	successRate(trials, outcomes) {
		return trials > 0 ? parseFloat(((outcomes / trials) * 100).toFixed(2)) + '%' : '---';
	}

	successRow(name, trials, outcomes) {
		return [name, trials, this.successRate(trials, outcomes)];
	}

	Elo() {
		return (
			<Table
				headers={['Type', 'Seasonal', 'Overall']}
				rows={[
					[
						'Elo',
						this.props.profile.staffDisableVisibleElo ? '---' : this.props.profile.eloSeason || 1600,
						this.props.profile.staffDisableVisibleElo ? '---' : this.props.profile.eloOverall || 1600
					],
					[
						'XP',
						this.props.profile.staffDisableVisibleElo ? '---' : this.props.profile.xpSeason || 1600,
						this.props.profile.staffDisableVisibleElo ? '---' : this.props.profile.xpOverall || 1600
					]
				]}
			/>
		);
	}

	Matches() {
		const { matches } = this.props.profile.stats;

		return (
			<div>
				<Table
					uiTable="top attached three column"
					headers={['All Matches', 'Matches', 'Winrate']}
					rows={[this.successRow('All Matches', matches.allMatches.events, matches.allMatches.successes)]}
				/>
				<Table
					uiTable="bottom attached three column"
					headers={['Loyalty', 'Matches', 'Winrate']}
					rows={[
						this.successRow('Liberal', matches.liberal.events, matches.liberal.successes),
						this.successRow('Fascist', matches.fascist.events, matches.fascist.successes)
					]}
				/>
			</div>
		);
	}

	Actions() {
		const { actions } = this.props.profile.stats;

		return (
			<Table
				headers={['Action', 'Instances', 'Success Rate']}
				rows={[
					this.successRow('Vote Accuracy', actions.voteAccuracy.events, actions.voteAccuracy.successes),
					this.successRow('Shot Accuracy', actions.shotAccuracy.events, actions.shotAccuracy.successes)
				]}
			/>
		);
	}

	Badges() {
		const { badges } = this.props.profile;
		const changeSort = sort => this.setState({ badgeSort: sort });
		const compare = (a, b) => (a > b ? 1 : -1);

		return (
			<div>
				<Dropdown
					selection
					placeholder={'Sort by:'}
					onChange={(a, { name, value }) => {
						changeSort(value);
						console.log(a, name, value);
					}}
					options={[
						{ key: 0, text: 'Badge', value: 'badge' },
						{ key: 1, text: 'Date earned', value: 'date' }
					]}
				></Dropdown>
				<br />
				{badges
					.sort((a, b) => (this.state.badgeSort === 'badge' ? compare(a.id, b.id) : compare(new Date(a.dateAwarded), new Date(b.dateAwarded))))
					.map(x => (
						<img src={`../images/badges/${x.id}.png`} alt={x.title} key={x.id} width={100} onClick={() => Swal.fire(x.title, x.text)} />
					))}
			</div>
		);
	}

	Stats() {
		// Elo | Matches | Actions | Badges
		const { activeStat } = this.props.profile;
		const { updateActiveStats } = this.props;
		const table = (() => {
			switch (activeStat) {
				case 'ELO':
					return this.Elo();
				case 'MATCHES':
					return this.Matches();
				case 'ACTIONS':
					return this.Actions();
				case 'BADGES':
					return this.Badges();
			}
		})();
		const toActive = stat => (activeStat === stat ? 'active' : '');

		return (
			<div>
				<div className="column-name">
					<h2 className="ui header">Stats</h2>
					<a target="_blank" href="/player-profiles">
						<i className="large help circle icon" />
					</a>
				</div>
				<div className="ui top attached menu">
					<a className={`${toActive('ELO')} item`} onClick={updateActiveStats.bind(null, 'ELO')}>
						Elo & XP
					</a>
					<a className={`${toActive('MATCHES')} item`} onClick={updateActiveStats.bind(null, 'MATCHES')}>
						Matches
					</a>
					<a className={`${toActive('ACTIONS')} item`} onClick={updateActiveStats.bind(null, 'ACTIONS')}>
						Actions
					</a>
					<a className={`${toActive('BADGES')} item`} onClick={updateActiveStats.bind(null, 'BADGES')}>
						Badges
					</a>
				</div>
				<div className="ui bottom attached segment">{table}</div>
				{this.props.profile.lastConnectedIP && (
					<div>
						<h2 className="ui header">AEM Info</h2>
						<Table headers={['Last Connected IP', 'Signup IP']} rows={[[this.props.profile.lastConnectedIP, this.props.profile.signupIP]]} />
					</div>
				)}
			</div>
		);
	}

	RecentGames() {
		const { recentGames } = this.props.profile;
		const rows = recentGames.map(game => ({
			onClick: e => {
				window.location.hash = `/replay/${game._id}`;
			},
			cells: [
				game.loyalty === 'liberal' ? 'Liberal' : 'Fascist',
				game.isRebalanced ? game.playerSize + 'R' : game.playerSize,
				game.isWinner ? 'Win' : 'Loss',
				this.formatDateString(game.date)
			]
		}));

		return (
			<div>
				<h2 className="ui header recent-games-table">Recent Games</h2>
				<Table uiTable={'selectable'} headers={['Loyalty', 'Size', 'Result', 'Date']} rows={rows} />
			</div>
		);
	}

	renderBio() {
		const { userInfo, profile } = this.props;
		const editClick = () => {
			this.setState({
				bioStatus: this.state.bioStatus === 'editing' ? 'displayed' : 'editing'
			});
		};
		const bioChange = e => {
			this.setState({ bioValue: `${e.target.value}` });
		};
		const bioKeyDown = e => {
			if (e.keyCode === 13) {
				this.props.socket.emit('updateBio', this.state.bioValue);
				this.setState({ bioStatus: 'displayed' });
			}
		};
		const processBio = () => {
			const text = this.state.bioValue || profile.bio;

			if (!text) {
				return 'Nothing here!';
			}

			const formattedBio = [];
			const words = text.split(' ');

			words.forEach((word, index) => {
				const validSiteURL = /http[s]?:\/\/(secrethitler\.io|localhost:8080)\/([a-zA-Z0-9#?=&\/\._-]*)/i;
				if (validSiteURL.test(word)) {
					const data = validSiteURL.exec(word);
					const replayURL = data[2].startsWith('game/#/replay/');

					formattedBio.push(
						<a
							key={index}
							href={replayURL ? '/game/' + data[2].substring(5) : '/' + data[2]}
							title={replayURL ? 'Link to a SH.io replay' : 'Link to something inside of SH.io'}
						>
							{replayURL ? data[2].substring(7) : data[2]}
						</a>
					);
				} else if (/^https:\/\//i.test(word)) {
					formattedBio.push(
						<a key={index} href={word} title="External link" target="_blank" rel="nofollow noreferrer noopener">
							{word.split('https://')[1]}
						</a>,
						' '
					);
				} else if (/^http:\/\//i.test(word)) {
					formattedBio.push(
						<a key={index} href={word} title="External link" target="_blank" rel="nofollow noreferrer noopener">
							{word.split('http://')[1]}
						</a>,
						' '
					);
				} else {
					formattedBio.push(word, ' ');
				}
			});
			return formattedBio;
		};

		return (
			<div>
				<h2 className="ui header bio">Bio {userInfo.userName && userInfo.userName === profile._id && <i onClick={editClick} className="edit icon" />}</h2>
				{(() => {
					switch (this.state.bioStatus) {
						case 'displayed':
							return <p>{processBio()}</p>;
						case 'editing':
							return (
								<textarea
									placeholder="Write something about yourself here"
									maxLength="500"
									autoFocus
									spellCheck="false"
									value={this.state.bioValue || profile.bio}
									onChange={bioChange}
									onKeyDown={bioKeyDown}
								/>
							);
					}
				})()}
			</div>
		);
	}

	blackListClick = e => {
		const { gameSettings } = this.props.userInfo;
		const { profile } = this.props;
		const name = profile._id;
		e.preventDefault();

		this.setState(
			{
				blacklistClicked: true
			},
			() => {
				if (gameSettings && gameSettings.blacklist.includes(name)) {
					gameSettings.blacklist.splice(gameSettings.blacklist.indexOf(name), 1);
				} else if (gameSettings) {
					if (!gameSettings.blacklist) {
						gameSettings.blacklist = [name];
					} else {
						gameSettings.blacklist.push(name);
					}
				}
				this.props.socket.emit('updateGameSettings', { blacklist: gameSettings.blacklist });
				this.props.socket.emit('sendUser', this.props.userInfo); // To force a new playerlist pull
			}
		);
	};

	renderBlacklist() {
		const { gameSettings } = this.props.userInfo;
		const { profile } = this.props;
		const name = profile._id;

		return (
			<button className="ui primary button blacklist-button" onClick={this.blackListClick}>
				{gameSettings && gameSettings.blacklist.includes(name) ? 'Unblacklist player' : 'Blacklist player'}
			</button>
		);
	}

	showBlacklist = () => {
		$(this.blacklistModal).modal('show');
	};

	Profile() {
		const { gameSettings, profile, userInfo, userList } = this.props;
		const user = userList.list ? userList.list.find(u => u.userName == profile._id) : null;
		// const w =
		// 	gameSettings && gameSettings.disableSeasonal
		// 		? this.state.userListFilter === 'all'
		// 			? 'wins'
		// 			: 'rainbowWins'
		// 		: this.state.userListFilter === 'all'
		// 		? 'winsSeason'
		// 		: 'rainbowWinsSeason';
		// const l =
		// 	gameSettings && gameSettings.disableSeasonal
		// 		? this.state.userListFilter === 'all'
		// 			? 'losses'
		// 			: 'rainbowLosses'
		// 		: this.state.userListFilter === 'all'
		// 		? 'lossesSeason'
		// 		: 'rainbowLossesSeason';
		let userClasses = 'profile-picture';
		let gamesUntilRainbow = null;
		if (user) {
			userClasses =
				(gameSettings && gameSettings.disableSeasonal ? user.isRainbowOverall : user.isRainbowSeason) || Boolean(user.staffRole) || user.isContributor
					? cn(
							PLAYERCOLORS(user, !(gameSettings && gameSettings.disableSeasonal), 'profile-picture', gameSettings && gameSettings.disableElo),
							{ blacklisted: gameSettings && gameSettings.blacklist.includes(user.userName) },
							{ unclickable: !this.props.isUserClickable },
							{ clickable: this.props.isUserClickable }
					  )
					: cn({ blacklisted: gameSettings && gameSettings.blacklist.includes(user.userName) }, 'profile-picture');
			const { wins = 0, losses = 0 } = user;
			if (wins + losses < 50) {
				gamesUntilRainbow = 50 - wins - losses;
			}
		}

		return (
			<div>
				{profile.customCardback && (
					<div
						className={userClasses}
						style={{
							backgroundImage: `url(../images/custom-cardbacks/${profile._id}.${profile.customCardback}?${this.state.openTime})`
						}}
					/>
				)}
				<div className="ui grid">
					<h1 className="ui header ten wide column">{profile._id}</h1>
					<div className="ui right aligned five wide column">
						<span>
							<strong>
								<em>Created: </em>
							</strong>
						</span>
						<span>{this.formatDateString(profile.created)}</span>
						{!isNaN(gamesUntilRainbow) && (
							<div>
								<span>
									<strong>
										<em>Games Until Rainbow: </em>
									</strong>
								</span>
								<span>{gamesUntilRainbow}</span>
							</div>
						)}
						{userInfo.userName === profile._id && (
							<a style={{ display: 'block', color: 'yellow', textDecoration: 'underline', cursor: 'pointer' }} onClick={this.showBlacklist}>
								Your blacklist
							</a>
						)}
					</div>
				</div>
				{this.renderBio()}
				{this.props.userInfo.userName && this.props.userInfo.userName !== profile._id && !this.state.blacklistClicked && this.renderBlacklist()}
				<div className="ui two column grid">
					<div className="column">{this.Stats()}</div>
					<div className="column">{this.RecentGames()}</div>
				</div>
			</div>
		);
	}

	Loading() {
		return (
			<div className="ui active dimmer">
				<div className="ui huge text loader">Loading</div>
			</div>
		);
	}

	NotFound() {
		return (
			<h1 className="not-found ui icon center aligned header">
				<i className="settings icon" />
				<div className="content">No profile</div>
			</h1>
		);
	}

	render() {
		const { profile } = this.props;

		const children = (() => {
			switch (profile.status) {
				case 'INITIAL':
				case 'LOADING':
					return this.Loading();
				case 'NOT_FOUND':
					return this.NotFound();
				case 'READY':
					return this.Profile();
			}
		})();

		return (
			<section id="profile" className="ui segment">
				<a href="#/">
					<i className="remove icon" />
				</a>
				{children}
				<div
					className="ui basic small modal blacklistmodal"
					ref={c => {
						this.blacklistModal = c;
					}}
				>
					<div className="ui header">Your blacklist</div>
					{this.props.userInfo.gameSettings &&
						this.props.userInfo.gameSettings.blacklist.map(playerName => (
							<div key={playerName} className={`blacklist-${playerName}`}>
								<i
									onClick={() => {
										const { gameSettings } = this.props.userInfo;

										gameSettings.blacklist.splice(gameSettings.blacklist.indexOf(playerName), 1);
										this.props.socket.emit('updateGameSettings', { blacklist: gameSettings.blacklist });
										setTimeout(() => {
											this.forceUpdate();
										}, 500);
									}}
									className="large close icon"
									style={{ cursor: 'pointer' }}
								/>
								{playerName}
							</div>
						))}
				</div>
			</section>
		);
	}
}

ProfileWrapper.defaultProps = {
	userInfo: {},
	userList: { list: [] },
	socket: {}
};

ProfileWrapper.propTypes = {
	userInfo: PropTypes.object,
	userList: PropTypes.object,
	socket: PropTypes.object,
	profile: PropTypes.object,
	updateActiveStats: PropTypes.func,
	gameSettings: PropTypes.object,
	isUserClickable: PropTypes.bool
};

export default connect(mapStateToProps, mapDispatchToProps)(ProfileWrapper);
