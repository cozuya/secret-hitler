import { connect } from 'react-redux';
import { updateActiveStats, fetchReplay } from '../../actions/actions';
import Table from '../reusable/Table.jsx';
import React from 'react'; // eslint-disable-line no-unused-vars
import PropTypes from 'prop-types';

const mapStateToProps = ({ profile }) => ({ profile });
const mapDispatchToProps = dispatch => ({
	updateActiveStats: activeStat => dispatch(updateActiveStats(activeStat)),
	fetchReplay: gameId => dispatch(fetchReplay(gameId))
});

class ProfileWrapper extends React.Component {
	constructor() {
		super();

		this.state = {
			bioStatus: 'displayed',
			bioValue: '',
			blacklistClicked: false
		};
	}

	formatDateString(dateString) {
		const date = new Date(dateString);

		return [date.getMonth() + 1, date.getDate(), date.getFullYear()].join('-');
	}

	successRate(trials, outcomes) {
		return trials > 0 ? parseFloat((outcomes / trials * 100).toFixed(2)) + '%' : '---';
	}

	successRow(name, trials, outcomes) {
		return [name, trials, this.successRate(trials, outcomes)];
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

	Stats() {
		const { activeStat } = this.props.profile;
		const { updateActiveStats } = this.props;
		const table = (() => {
			switch (activeStat) {
				case 'MATCHES':
					return this.Matches();
				case 'ACTIONS':
					return this.Actions();
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
					<a className={`${toActive('MATCHES')} item`} onClick={updateActiveStats.bind(null, 'MATCHES')}>
						Matches
					</a>
					<a className={`${toActive('ACTIONS')} item`} onClick={updateActiveStats.bind(null, 'ACTIONS')}>
						Actions
					</a>
				</div>
				<div className="ui bottom attached segment">{table}</div>
			</div>
		);
	}

	RecentGames() {
		const { recentGames } = this.props.profile;
		const rows = recentGames.map(game => ({
			onClick: e => {
				window.location.hash = `/replay/${game._id}`;
			},
			cells: [game.loyalty === 'liberal' ? 'Liberal' : 'Fascist', game.playerSize, game.isWinner ? 'Win' : 'Loss', this.formatDateString(game.date)]
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

			const formatedBio = [];
			const words = text.split(' ');

			words.forEach(word => {
				if (/^https:\/\//i.test(word)) {
					formatedBio.push(
						<a key={word} href={word} title="External link" target="_blank" rel="nofollow noreferrer noopener">
							{word.split('https://')[1]}
						</a>,
						' '
					);
				} else if (/^http:\/\//i.test(word)) {
					formatedBio.push(
						<a key={word} href={word} title="External link" target="_blank" rel="nofollow noreferrer noopener">
							{word.split('http://')[1]}
						</a>,
						' '
					);
				} else {
					formatedBio.push(word, ' ');
				}
			});
			return formatedBio;
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
									value={this.state.bioValue}
									onChange={bioChange}
									onKeyDown={bioKeyDown}
								/>
							);
					}
				})()}
			</div>
		);
	}

	renderBlacklist() {
		const { profile } = this.props;
		const name = profile._id;
		const { gameSettings } = this.props.userInfo;

		const blackListClick = e => {
			e.preventDefault();

			this.setState(
				{
					blacklistClicked: true
				},
				() => {
					if (gameSettings.blacklist.includes(name)) {
						gameSettings.blacklist.splice(gameSettings.blacklist.indexOf(name), 1);
					} else {
						gameSettings.blacklist.push(name);
					}
					this.props.socket.emit('updateGameSettings', gameSettings);
				}
			);
		};

		return (
			<button className="ui primary button blacklist-button" onClick={blackListClick}>
				{gameSettings && gameSettings.blacklist.includes(name) ? 'Unblacklist player' : 'Blacklist player'}
			</button>
		);
	}

	Profile() {
		const { profile } = this.props;

		return (
			<div>
				{profile.customCardback && (
					<div
						className="profile-picture"
						style={{
							backgroundImage: `url(../images/custom-cardbacks/${profile._id}.${profile.customCardback}?${Math.random()
								.toString(36)
								.substring(2)})`
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
						{profile.lastConnectedIP !== 'no looking' && <p>Last connected IP: {profile.lastConnectedIP}</p>}
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
				<div className="content">Profile not found</div>
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
			</section>
		);
	}
}

ProfileWrapper.propTypes = {
	userInfo: PropTypes.object,
	socket: PropTypes.object
};

export default connect(mapStateToProps, mapDispatchToProps)(ProfileWrapper);
