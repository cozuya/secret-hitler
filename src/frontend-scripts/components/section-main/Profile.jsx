import { connect } from 'react-redux';
import {
	updateActiveStats,
	updateMidsection,
	fetchReplay
} from '../../actions/actions';
import Table from '../reusable/Table.jsx';
import React from 'react'; // eslint-disable-line no-unused-vars

const mapStateToProps = ({ profile }) => ({ profile }),
	mapDispatchToProps = dispatch => ({
		updateActiveStats: activeStat => dispatch(updateActiveStats(activeStat)),
		fetchReplay: gameId => dispatch(fetchReplay(gameId)),
		exit: () => dispatch(updateMidsection('default'))
	}),
	formatDateString = dateString => {
		const date = new Date(dateString);

		return [date.getMonth() + 1, date.getDate(), date.getFullYear()].join('-');
	},
	successRate = (trials, outcomes) =>
		trials > 0 ? parseFloat((outcomes / trials * 100).toFixed(2)) + '%' : '---',
	successRow = (name, trials, outcomes) => [
		name,
		trials,
		successRate(trials, outcomes)
	],
	Matches = ({ matches }) =>
		<div>
			<Table
				uiTable="top attached three column"
				headers={['All Matches', 'Matches', 'Winrate']}
				rows={[
					successRow(
						'All Matches',
						matches.allMatches.events,
						matches.allMatches.successes
					)
				]}
			/>
			<Table
				uiTable="bottom attached three column"
				headers={['Loyalty', 'Matches', 'Winrate']}
				rows={[
					successRow(
						'Liberal',
						matches.liberal.events,
						matches.liberal.successes
					),
					successRow(
						'Fascist',
						matches.fascist.events,
						matches.fascist.successes
					)
				]}
			/>
		</div>,
	Actions = ({ actions }) =>
		<Table
			headers={['Action', 'Instances', 'Success Rate']}
			rows={[
				successRow(
					'Vote Accuracy',
					actions.voteAccuracy.events,
					actions.voteAccuracy.successes
				),
				successRow(
					'Shot Accuracy',
					actions.shotAccuracy.events,
					actions.shotAccuracy.successes
				)
			]}
		/>,
	Stats = ({ stats, activeStat, updateActiveStats }) => {
		const table = (() => {
				switch (activeStat) {
					case 'MATCHES':
						return <Matches matches={stats.matches} />;
					case 'ACTIONS':
						return <Actions actions={stats.actions} />;
				}
			})(),
			toActive = stat => (activeStat === stat ? 'active' : '');

		return (
			<div>
				<div className="column-name">
					<h2 className="ui header">Stats</h2>
					<a target="_blank" href="/player-profiles">
						<i className="large help circle icon" />
					</a>
				</div>
				<div className="ui top attached menu">
					<a
						className={`${toActive('MATCHES')} item`}
						onClick={updateActiveStats.bind(null, 'MATCHES')}
					>
						Matches
					</a>
					<a
						className={`${toActive('ACTIONS')} item`}
						onClick={updateActiveStats.bind(null, 'ACTIONS')}
					>
						Actions
					</a>
				</div>
				<div className="ui bottom attached segment">
					{table}
				</div>
			</div>
		);
	},
	RecentGames = ({ recentGames, fetchReplay }) => {
		const rows = recentGames.map(game => ({
			onClick: fetchReplay.bind(null, game._id),
			cells: [
				game.loyalty === 'liberal' ? 'Liberal' : 'Fascist',
				game.playerSize,
				game.isWinner ? 'Win' : 'Loss',
				formatDateString(game.date)
			]
		}));

		return (
			<div>
				<h2 className="ui header">Recent Games</h2>
				<Table
					uiTable={'selectable'}
					headers={['Loyalty', 'Size', 'Result', 'Date']}
					rows={rows}
				/>
			</div>
		);
	},
	Profile = ({ profile, fetchReplay, updateActiveStats }) =>
		<div>
			<div className="ui grid">
				<h1 className="ui header ten wide column">
					{profile._id}
				</h1>
				<div className="ui right aligned five wide column">
					<span>
						<strong>
							<em>Created: </em>
						</strong>
					</span>
					<span>
						{formatDateString(profile.created)}
					</span>
				</div>
			</div>
			<div className="ui two column grid">
				<div className="column">
					<Stats
						stats={profile.stats}
						activeStat={profile.activeStat}
						updateActiveStats={updateActiveStats}
					/>
				</div>
				<div className="column">
					<RecentGames
						fetchReplay={fetchReplay}
						recentGames={profile.recentGames}
					/>
				</div>
			</div>
		</div>,
	Loading = () =>
		<div className="ui active dimmer">
			<div className="ui huge text loader">Loading</div>
		</div>,
	NotFound = () =>
		<h1 className="not-found ui icon center aligned header">
			<i className="settings icon" />
			<div className="content">Profile not found</div>
		</h1>,
	ProfileWrapper = ({ profile, fetchReplay, updateActiveStats, exit }) => {
		const children = (() => {
			switch (profile.status) {
				case 'INITIAL':
				case 'LOADING':
					return <Loading />;
				case 'NOT_FOUND':
					return <NotFound />;
				case 'READY':
					return (
						<Profile
							profile={profile}
							fetchReplay={fetchReplay}
							updateActiveStats={updateActiveStats}
						/>
					);
			}
		})();

		return (
			<section id="profile" className="ui segment">
				<i className="remove icon" onClick={exit} />
				{children}
			</section>
		);
	};

export default connect(mapStateToProps, mapDispatchToProps)(ProfileWrapper);
