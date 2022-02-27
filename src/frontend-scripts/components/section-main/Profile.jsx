import { connect } from 'react-redux';
import { fetchReplay } from '../../actions/actions';
import Table from '../reusable/Table.jsx';
import React from 'react'; // eslint-disable-line no-unused-vars
import PropTypes from 'prop-types';
import $ from 'jquery';
import cn from 'classnames';
import { PLAYERCOLORS } from '../../constants';
import Swal from 'sweetalert2';
import { Dropdown } from 'semantic-ui-react';
import moment from 'moment';
import CollapsibleSegment from '../reusable/CollapsibleSegment.jsx';

const mapStateToProps = ({ profile }) => ({ profile });
const mapDispatchToProps = dispatch => ({
	// updateActiveStats: activeStat => dispatch(updateActiveStats(activeStat)),
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
			badgeSort: 'badge',
			profileSearchValue: ''
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

		return [date.getMonth() + 1, date.getDate(), date.getFullYear()].join('-');
	}

	successRate(trials, outcomes) {
		return trials > 0 ? parseFloat(((outcomes / trials) * 100).toFixed(2)) + '%' : '---';
	}

	successRow(name, trials, outcomes) {
		return [name, trials, this.successRate(trials, outcomes)];
	}

	successRowMatches(name, libGames, libWins, fasGames, fasWins) {
		return [name, libGames + fasGames, this.successRate(libGames, libWins), this.successRate(fasGames, fasWins)];
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
						this.props.profile.staffDisableVisibleXP ? '---' : this.props.profile.xpSeason || 0,
						this.props.profile.staffDisableVisibleXP ? '---' : this.props.profile.xpOverall || 0
					]
				]}
			/>
		);
	}

	Matches() {
		const { matches } = this.props.profile.stats;

		return (
			<div style={{ marginLeft: '10px' }}>
				<CollapsibleSegment title={'Standard Matches'} defaultExpanded={true}>
					<Table
						uiTable="top attached four column"
						headers={['Match Type', 'Matches', 'Liberal Winrate', 'Fascist Winrate']}
						rows={[
							this.successRowMatches(
								'Standard Matches',
								matches.rainbowMatches.liberal.events + matches.greyMatches.liberal.events + matches.practiceMatches.liberal.events,
								matches.rainbowMatches.liberal.successes + matches.greyMatches.liberal.successes + matches.practiceMatches.liberal.successes,
								matches.rainbowMatches.fascist.events + matches.greyMatches.fascist.events + matches.practiceMatches.fascist.events,
								matches.rainbowMatches.fascist.successes + matches.greyMatches.fascist.successes + matches.practiceMatches.fascist.successes
							)
						]}
					/>
				</CollapsibleSegment>
				<CollapsibleSegment title={'Ranked Matches'}>
					<Table
						uiTable="top attached four column"
						headers={['Match Type', 'Matches', 'Liberal Winrate', 'Fascist Winrate']}
						rows={[
							this.successRowMatches(
								'All Ranked Matches',
								matches.rainbowMatches.liberal.events + matches.greyMatches.liberal.events,
								matches.rainbowMatches.liberal.successes + matches.greyMatches.liberal.successes,
								matches.rainbowMatches.fascist.events + matches.greyMatches.fascist.events,
								matches.rainbowMatches.fascist.successes + matches.greyMatches.fascist.successes
							),
							this.successRowMatches(
								'Rainbow Matches',
								matches.rainbowMatches.liberal.events,
								matches.rainbowMatches.liberal.successes,
								matches.rainbowMatches.fascist.events,
								matches.rainbowMatches.fascist.successes
							),
							this.successRowMatches(
								'Non-Rainbow Matches',
								matches.greyMatches.liberal.events,
								matches.greyMatches.liberal.successes,
								matches.greyMatches.fascist.events,
								matches.greyMatches.fascist.successes
							)
						]}
					/>
				</CollapsibleSegment>
				{Object.entries({
					practiceMatches: 'Practice Matches',
					silentMatches: 'Silent Matches'
					// casualMatches: 'Casual Matches',
					// customMatches: 'Custom Matches',
					// emoteMatches: 'Emote Matches'
				}).map(([k, v]) => (
					<CollapsibleSegment title={v} key={k}>
						<Table
							uiTable="top attached four column"
							headers={['Match Type', 'Matches', 'Liberal Winrate', 'Fascist Winrate']}
							rows={[
								this.successRowMatches(v, matches[k].liberal.events, matches[k].liberal.successes, matches[k].fascist.events, matches[k].fascist.successes)
							]}
						/>
					</CollapsibleSegment>
				))}
				{['5', '6', '7', '8', '9', '10'].map(n => (
					<CollapsibleSegment title={`${n} Player Matches`} key={n}>
						<Table
							uiTable="top attached four column"
							headers={['Match Type', 'Matches', 'Liberal Winrate', 'Fascist Winrate']}
							rows={[
								this.successRowMatches(
									`Ranked ${n}p`,
									matches.greyMatches[n].liberal.events + matches.rainbowMatches[n].liberal.events,
									matches.greyMatches[n].liberal.successes + matches.rainbowMatches[n].liberal.successes,
									matches.greyMatches[n].fascist.events + matches.rainbowMatches[n].fascist.events,
									matches.greyMatches[n].fascist.successes + matches.rainbowMatches[n].fascist.successes
								),
								this.successRowMatches(
									`Rainbow ${n}p`,
									matches.rainbowMatches[n].liberal.events,
									matches.rainbowMatches[n].liberal.successes,
									matches.rainbowMatches[n].fascist.events,
									matches.rainbowMatches[n].fascist.successes
								),
								this.successRowMatches(
									`Non-Rainbow ${n}p`,
									matches.greyMatches[n].liberal.events,
									matches.greyMatches[n].liberal.successes,
									matches.greyMatches[n].fascist.events,
									matches.greyMatches[n].fascist.successes
								)
							]}
						/>
					</CollapsibleSegment>
				))}
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
					}}
					options={[
						{ key: 0, text: 'Badge', value: 'badge' },
						{ key: 1, text: 'Date earned', value: 'date' }
					]}
					style={{ right: '0', left: 'auto', position: 'absolute' }}
				/>
				<br />
				<br />
				{badges
					.sort((a, b) => (this.state.badgeSort === 'badge' ? compare(a.id, b.id) : compare(new Date(a.dateAwarded), new Date(b.dateAwarded))))
					.map(x => (
						<>
							<img
								style={{ padding: '2px', display: 'inline', cursor: 'pointer' }}
								src={`../images/badges/${x.id.startsWith('eloReset') ? 'eloReset' : x.id}.png`}
								alt={x.title}
								key={x.id}
								height={50}
								onClick={() =>
									Swal.fire({
										title: x.title,
										text: `${x.text || ''} Earned: ${moment(x.dateAwarded).format('MM/DD/YYYY HH:mm')}.`,
										imageUrl: `../images/badges/${x.id.startsWith('eloReset') ? 'eloReset' : x.id}.png`,
										imageWidth: 100
									})
								}
							/>
							{x.id.startsWith('eloReset') ? (
								<p style={{ position: 'relative', top: '50%', transform: 'translateY(-100%)', display: 'inline-block' }}>{x.id.substring(8)}</p>
							) : null}
						</>
					))}
			</div>
		);
	}

	Stats() {
		// Elo | Matches | Actions | Badges
		return (
			<div>
				<div className="column-name">
					<h2 className="ui header">Stats</h2>
					<a target="_blank" href="/player-profiles">
						<i className="large help circle icon" />
					</a>
				</div>
				<CollapsibleSegment title={'Elo & XP'} defaultExpanded={true}>
					{this.Elo()}
				</CollapsibleSegment>
				<CollapsibleSegment title={'Matches'}>{this.Matches()}</CollapsibleSegment>
				<CollapsibleSegment title={'Actions'}>{this.Actions()}</CollapsibleSegment>
				<CollapsibleSegment
					title={'Badges'}
					titleClass={
						this.props.userInfo &&
						this.props.profile._id === this.props.userInfo.userName &&
						this.props.userInfo.gameSettings &&
						this.props.userInfo.gameSettings.hasUnseenBadge
							? 'newbadge'
							: ''
					}
					defaultExpanded={true}
				>
					{this.Badges()}
				</CollapsibleSegment>
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
				<CollapsibleSegment title={'Recent Games'} titleClass={'recent-games-table'} defaultExpanded={true}>
					<Table uiTable={'selectable'} headers={['Loyalty', 'Size', 'Result', 'Date']} rows={rows} />
				</CollapsibleSegment>
				{this.props.profile.lastConnectedIP && (
					<div>
						<CollapsibleSegment title={'AEM Info'} defaultExpanded={true}>
							<Table headers={['Last Connected IP / Signup IP']} rows={[[this.props.profile.lastConnectedIP], [this.props.profile.signupIP]]} />
						</CollapsibleSegment>
					</div>
				)}
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

	profileSearchSubmit = e => {
		e.preventDefault();

		window.location.hash = `#/profile/${this.state.profileSearchValue}`;
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
		}

		const userAdminRole =
			this.props.profile.staffRole === 'admin' || this.props.profile.staffRole === 'editor' || this.props.profile.staffRole === 'moderator'
				? this.props.profile.staffRole
				: null;

		const staffRolePrefixes = { admin: '(A) 📛', editor: '(E) 🔰', moderator: '(M) 🌀' };

		let prefix = '';
		if (userAdminRole) {
			prefix = staffRolePrefixes[userAdminRole];
		}

		const routeToGame = gameId => {
			window.location = `#/table/${gameId}`;
		};

		const fetchReplay = gameId => {
			window.location = `#/replay/${gameId}`;
		};

		const renderStatus = () => {
			const status = user ? user.status : null;

			if (!status || status.type === 'none') {
				return null;
			} else {
				const iconClasses = cn(
					'status',
					{ clickable: true },
					{ search: status.type === 'observing' },
					{ fav: status.type === 'playing' },
					{ rainbow: status.type === 'rainbow' },
					{ record: status.type === 'replay' },
					{ private: status.type === 'private' },
					'icon'
				);
				const title = {
					playing: 'This player is playing in a standard game.',
					observing: 'This player is observing a game.',
					rainbow: 'This player is playing in a experienced-player-only game.',
					replay: 'This player is watching a replay.',
					private: 'This player is playing in a private game.'
				};
				const onClick = {
					playing: routeToGame,
					observing: routeToGame,
					rainbow: routeToGame,
					replay: fetchReplay,
					private: routeToGame
				};

				return <i title={title[status.type]} className={iconClasses} onClick={onClick[status.type].bind(this, status.gameId)} />;
			}
		};

		const handleSearchProfileChange = e => {
			this.setState({ profileSearchValue: e.currentTarget.value });
		};

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
					<h1 className={`ui header ten wide column profile ${userClasses.replace('profile-picture', '')}`} style={{ paddingLeft: 0 }}>
						{renderStatus()}
						{prefix}
						{profile._id}
					</h1>
					<div className="ui right aligned six wide column">
						<span>
							<strong>
								<em>Created: </em>
							</strong>
						</span>
						<span>{profile.created}</span>
						<br />
						<span>
							<strong>
								<em>Last online: </em>
							</strong>
						</span>
						<span>{profile.lastConnected}</span>
						{userInfo.userName === profile._id && (
							<a style={{ display: 'block', color: 'yellow', textDecoration: 'underline', cursor: 'pointer' }} onClick={this.showBlacklist}>
								Your blacklist
							</a>
						)}
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
