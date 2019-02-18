/* eslint-disable spaced-comment */
import React from 'react'; // eslint-disable-line no-unused-vars
import { connect } from 'react-redux';
import toGameInfo from '../../../replay/toGameInfo';
import toDescription from '../../../replay/toDescription';
import classnames from 'classnames';
import { Map, List } from 'immutable';
import { some, none, fromNullable } from 'option';
import Tracks from '../Tracks.jsx';
import Players from '../Players.jsx';
import Gamechat from '../Gamechat.jsx';
import ReplayOverlay from './ReplayOverlay.jsx';
import ReplayControls from './ReplayControls.jsx';
import TrackPieces from './TrackPieces.jsx';
import socket from '../../../socket';
import PropTypes from 'prop-types';

const mapStateToProps = ({ replay, userInfo }) => ({
	replay,
	isSmall: userInfo.gameSettings && userInfo.gameSettings.enableRightSidebarInGame
});

const mapDispatchToProps = dispatch => ({
	to: position => dispatch({ type: 'REPLAY_TO', position }),
	exit: () => dispatch({ type: 'CLOSE_REPLAY' })
});

const buildPlayback = (replay, to) => {
	const { ticks, position } = replay;
	const snapshot = ticks.get(position);
	const { turnNum, phase } = snapshot;

	/***********
	 * HELPERS *
	 ***********/

	// (turnNum: Int, [phases: List[String] | phase: String]) => Int
	const findTickPos = (turnNum, _phases) => {
		const phases = List.isList(_phases) ? _phases : List([_phases]);

		const i = ticks.findLastIndex(t => t.turnNum === turnNum && phases.includes(t.phase));

		return i > -1 ? some(i) : none;
	};

	const bindTo = position => to.bind(null, position);

	/***********
	 * EXPORTS *
	 ***********/

	const hasNext = position < ticks.size - 1;
	const hasPrev = position > 0;

	const toBeginning = bindTo(0);
	const toEnd = bindTo(ticks.size - 1);

	const nextTick = bindTo(position + 1);
	const prevTick = bindTo(position - 1);

	const { nextPhase, prevPhase } = (() => {
		const toTurnWithPhaseElseFallback = (targetTurn, end) => {
			const fallbacks = Map({
				presidentLegislation: List(['topDeck', 'election']),
				chancellorLegislation: List(['topDeck', 'election']),
				topDeck: List(['presidentLegislation', 'election']),
				veto: List(['presidentLegislation', 'election']),
				policyEnaction: List(['election']),
				investigation: List(['policyEnaction', 'election']),
				policyPeek: List(['policyEnaction', 'election']),
				specialElection: List(['policyEnaction', 'election']),
				execution: List(['policyEnaction', 'election'])
			});

			const ideal = findTickPos(targetTurn, phase).map(pos => bindTo(pos));

			const fallback = () =>
				bindTo(
					fromNullable(fallbacks.get(phase))
						.flatMap(fallbackPhases => findTickPos(targetTurn, fallbackPhases))
						.valueOrElse(end)
				);

			return ideal.valueOrElse(fallback);
		};

		return {
			nextPhase: toTurnWithPhaseElseFallback(turnNum + 1, ticks.size - 1),
			prevPhase: toTurnWithPhaseElseFallback(turnNum - 1, 0)
		};
	})();

	const { hasLegislation, hasAction, toElection, toLegislation, toAction } = (() => {
		const rotate = (cycles, fallback) => {
			return findTickPos(turnNum, fromNullable(cycles.get(phase)).valueOrElse(fallback));
		};

		const electionPos = rotate(
			Map({
				candidacy: 'nomination',
				nomination: 'election',
				election: 'candidacy'
			}),
			'candidacy'
		);

		const legislationPos = rotate(
			Map({
				presidentLegislation: List(['chancellorLegislation']),
				chancellorLegislation: List(['veto', 'policyEnaction']),
				topDeck: List(['policyEnaction']),
				veto: List(['policyEnaction', 'topDeck', 'presidentLegislation']),
				policyEnaction: List(['presidentLegislation', 'topDeck'])
			}),
			List(['presidentLegislation', 'topDeck'])
		);

		const actionPos = findTickPos(turnNum, List(['investigation', 'policyPeek', 'specialElection', 'execution']));

		return {
			hasLegislation: legislationPos.isSome(),
			hasAction: actionPos.isSome(),
			toElection: bindTo(electionPos.valueOrElse(position)),
			toLegislation: bindTo(legislationPos.valueOrElse(position)),
			toAction: bindTo(actionPos.valueOrElse(position))
		};
	})();

	const toTurn = targetTurn => to(findTickPos(targetTurn, 'candidacy').valueOrElse(position));

	return {
		hasNext,
		hasPrev,
		toBeginning,
		toEnd,
		nextTick,
		prevTick,
		nextPhase,
		prevPhase,
		hasLegislation,
		hasAction,
		toElection,
		toLegislation,
		toAction,
		toTurn
	};
};

const Replay = ({ replay, isSmall, to, replayChats, allEmotes }) => {
	const { ticks, position, game } = replay;
	const snapshot = ticks.get(position);
	const playback = buildPlayback(replay, to);
	const gameInfo = toGameInfo(snapshot);
	gameInfo.customGameSettings = game.summary.customGameSettings;
	if (gameInfo.customGameSettings && gameInfo.customGameSettings.enabled) {
		if (gameInfo.customGameSettings.powers._tail) gameInfo.customGameSettings.powers = gameInfo.customGameSettings.powers._tail.array;
	}
	const userInfo = { username: '' };
	const { phase } = snapshot;
	const description = toDescription(snapshot, game);

	gameInfo.general.uid = game.id;

	return (
		<section className={classnames({ small: false /*isSmall*/, big: true /*!isSmall*/ }, 'game')}>
			<div className="ui grid">
				<div className="row">
					<div className="left-side sixteen wide column">
						<ReplayOverlay key="replayoverlay" snapshot={snapshot} />
						<TrackPieces key="trackpieces" phase={snapshot.phase} track={snapshot.track} electionTracker={snapshot.electionTracker} />
						<Tracks gameInfo={gameInfo} userInfo={userInfo} />
					</div>
					<div className="right-side">
						{replayChats.length ? (
							<Gamechat
								isReplay={true}
								userInfo={{}}
								userList={{}}
								gameInfo={{
									chats: replayChats
								}}
								allEmotes={allEmotes}
							/>
						) : (
							<ReplayControls turnsSize={ticks.last().turnNum + 1} turnNum={snapshot.turnNum} phase={phase} description={description} playback={playback} />
						)}
					</div>
				</div>
			</div>
			<div className="row players-container">
				<Players userList={{}} onClickedTakeSeat={null} userInfo={userInfo} gameInfo={gameInfo} isReplay socket={socket} />
			</div>
		</section>
	);
};

class ReplayWrapper extends React.Component {
	constructor() {
		super();

		this.state = {
			chatsShown: false,
			replayChats: []
		};
	}

	componentDidMount() {
		socket.on('replayGameChats', replayChats => {
			this.setState({
				replayChats
			});
		});
	}

	componentWillUnmount() {
		socket.off('replayGameChats');
	}

	render() {
		const toExit = () => {
			window.location.hash = '#/';
			this.props.exit();
		};
		const toggleChats = () => {
			if (!this.state.replayChats.length) {
				socket.emit('getReplayGameChats', this.props.replay.game.id);
			}
			this.setState({
				chatsShown: !this.state.chatsShown
			});
		};

		const children = (() => {
			switch (this.props.replay.status) {
				case 'INITIAL':
				case 'LOADING':
					return (
						<div className="ui active dimmer">
							<div className="ui huge text loader">Loading</div>
						</div>
					);
				case 'NOT_FOUND':
					return (
						<h1 className="not-found ui icon center aligned header">
							<i className="settings icon" />
							<div className="content">Replay not found</div>
						</h1>
					);
				case 'READY':
					return (
						<Replay
							replay={this.props.replay}
							isSmall={this.props.isSmall}
							to={this.props.to}
							replayChats={this.state.chatsShown && this.state.replayChats.length ? this.state.replayChats : []}
							allEmotes={this.props.allEmotes}
						/>
					);
			}
		})();

		return (
			<section id="replay" className="ui segment">
				<button className="displaychats ui inverted blue button" onClick={toggleChats}>
					{this.state.chatsShown ? 'Hide chats' : 'Show chats'}
				</button>
				<button className="exit ui inverted red button" onClick={toExit}>
					<i className="sign out icon" />
					Exit Replay
				</button>
				{children}
			</section>
		);
	}
}

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ReplayWrapper);

Replay.propTypes = {
	allEmotes: PropTypes.array
};
