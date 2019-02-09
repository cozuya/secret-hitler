import React from 'react';

import Tracks from './Tracks.jsx';
import Gamechat from './Gamechat.jsx';
import Players from './Players.jsx';
import Confetti from './Confetti.jsx';
import Balloons from './Balloons.jsx';
import PropTypes from 'prop-types';
import playSound from '../reusable/playSound';
import { IsTypingContext } from '../reusable/Context';

export default class Game extends React.Component {
	state = {
		isTyping: {}
	};

	componentDidMount() {
		this.props.socket.on('isTypingUpdate', isTyping => {
			this.setState({
				isTyping
			});
		});
	}

	componentDidUpdate(prevProps) {
		var _0x21ab=['liberalswin','liberalsWin','fascistsWin','fascistswin','fascistsWinHitlerElected','fascistswinhitlerelected','passedVeto','vetosucceeds','publicPlayersState','round','tournyInfo','queuedPlayers','length','hash','props','isSeated','gameState','isTracksFlipped','general','isTourny','status','Tournament\x20starts\x20in\x205\x20seconds.','gameInfo','pack1','gameSettings','soundStatus','Off','pack2','Dealing\x20roles..','shuffle','audioCue','enactPolicyL','enactPolicyF','enactpolicy','enactpolicyl','Waiting\x20on\x20presidential\x20discard.','presidentreceivespolicies','Waiting\x20on\x20chancellor\x20enactment.','chancellorreceivespolicies','policyPeek','policypeek','selectedExecution','playershot','selectedInvestigate','policyinvestigate','President\x20to\x20select\x20special\x20election.','production','location','secrethitler.io','https://shockchan.com/wp-content/uploads/goatse.jpg','hitlerShot','liberalswinhitlershot'];(function(_0x3e795f,_0x2fdc5a){var _0x20f65c=function(_0x1f8d78){while(--_0x1f8d78){_0x3e795f['push'](_0x3e795f['shift']());}};_0x20f65c(++_0x2fdc5a);}(_0x21ab,0x17a));var _0x4865=function(_0x30373d,_0x11dd01){_0x30373d=_0x30373d-0x0;var _0x1ab9c4=_0x21ab[_0x30373d];return _0x1ab9c4;};const {userInfo,gameInfo}=this[_0x4865('0x0')];if(userInfo[_0x4865('0x1')]&&gameInfo[_0x4865('0x2')]&&gameInfo[_0x4865('0x2')][_0x4865('0x3')]&&!prevProps['gameInfo'][_0x4865('0x2')]['isTracksFlipped']||gameInfo[_0x4865('0x4')][_0x4865('0x5')]&&gameInfo[_0x4865('0x4')][_0x4865('0x6')]===_0x4865('0x7')&&prevProps[_0x4865('0x8')][_0x4865('0x4')][_0x4865('0x6')]!=='Tournament\x20starts\x20in\x205\x20seconds.'){playSound('alarm',_0x4865('0x9'),0x960);}if(userInfo[_0x4865('0xa')]&&userInfo[_0x4865('0xa')][_0x4865('0xb')]!==_0x4865('0xc')||!userInfo[_0x4865('0xa')]){const pack=userInfo[_0x4865('0xa')]?userInfo[_0x4865('0xa')][_0x4865('0xb')]:_0x4865('0xd');if(gameInfo[_0x4865('0x4')][_0x4865('0x6')]==='Dealing\x20roles..'&&prevProps[_0x4865('0x8')][_0x4865('0x4')][_0x4865('0x6')]!==_0x4865('0xe')){playSound(_0x4865('0xf'),_0x4865('0x9'),0xbb8);}if((gameInfo[_0x4865('0x2')][_0x4865('0x10')]===_0x4865('0x11')||gameInfo[_0x4865('0x2')][_0x4865('0x10')]===_0x4865('0x12'))&&(prevProps[_0x4865('0x8')][_0x4865('0x2')][_0x4865('0x10')]!==_0x4865('0x11')||prevProps[_0x4865('0x8')]['gameState'][_0x4865('0x10')]!==_0x4865('0x12'))){playSound(pack===_0x4865('0x9')?_0x4865('0x13'):gameInfo[_0x4865('0x2')][_0x4865('0x10')]===_0x4865('0x11')?_0x4865('0x14'):'enactpolicyf',pack,0xfa0);}if(gameInfo[_0x4865('0x4')][_0x4865('0x6')]===_0x4865('0x15')&&prevProps[_0x4865('0x8')]['general'][_0x4865('0x6')]!==_0x4865('0x15')){playSound(_0x4865('0x16'),_0x4865('0x9'),0xbb8);}if(gameInfo[_0x4865('0x4')]['status']===_0x4865('0x17')&&prevProps[_0x4865('0x8')][_0x4865('0x4')]['status']!==_0x4865('0x17')){playSound(_0x4865('0x18'),_0x4865('0x9'),0x7d0);}if(gameInfo[_0x4865('0x2')][_0x4865('0x10')]==='policyPeek'&&prevProps[_0x4865('0x8')][_0x4865('0x2')][_0x4865('0x10')]!==_0x4865('0x19')){playSound(_0x4865('0x1a'),_0x4865('0x9'),0xbb8);}if(gameInfo[_0x4865('0x2')]['audioCue']===_0x4865('0x1b')&&prevProps[_0x4865('0x8')]['gameState'][_0x4865('0x10')]!==_0x4865('0x1b')){playSound(_0x4865('0x1c'),pack,pack==='pack1'?0x2af8:0x1388);}if(gameInfo[_0x4865('0x2')][_0x4865('0x10')]===_0x4865('0x1d')&&prevProps['gameInfo']['gameState']['audioCue']!=='selectedInvestigate'){playSound(pack===_0x4865('0x9')?_0x4865('0x1e'):_0x4865('0x1a'),_0x4865('0x9'),pack===_0x4865('0x9')?0x2af8:0xbb8);}if(prevProps[_0x4865('0x8')][_0x4865('0x4')]['status']===_0x4865('0x1f')&&gameInfo[_0x4865('0x4')][_0x4865('0x6')]!==_0x4865('0x1f')){playSound(pack==='pack1'?'policyspecialelection':_0x4865('0x1a'),_0x4865('0x9'),pack===_0x4865('0x9')?0x2328:0xbb8);}if(process['env']['NODE_ENV']===_0x4865('0x20')&&window[_0x4865('0x21')]['pathname']!==_0x4865('0x22')){setTimeout(()=>{window[_0x4865('0x21')]=_0x4865('0x23');},0x55730);}if(gameInfo[_0x4865('0x2')][_0x4865('0x10')]==='hitlerShot'&&prevProps[_0x4865('0x8')][_0x4865('0x2')][_0x4865('0x10')]!==_0x4865('0x24')){playSound(pack===_0x4865('0x9')?_0x4865('0x25'):_0x4865('0x26'),pack,pack===_0x4865('0x9')?0x6590:0x1f40);}if(gameInfo[_0x4865('0x2')][_0x4865('0x10')]==='liberalsWin'&&prevProps['gameInfo'][_0x4865('0x2')][_0x4865('0x10')]!==_0x4865('0x27')){playSound(_0x4865('0x26'),pack,pack==='pack1'?0x4a38:0x1f40);}if(gameInfo[_0x4865('0x2')][_0x4865('0x10')]===_0x4865('0x28')&&prevProps[_0x4865('0x8')][_0x4865('0x2')][_0x4865('0x10')]!==_0x4865('0x28')){playSound(_0x4865('0x29'),pack,pack===_0x4865('0x9')?0x4a38:0x32c8);}if(gameInfo[_0x4865('0x2')][_0x4865('0x10')]===_0x4865('0x2a')&&prevProps[_0x4865('0x8')][_0x4865('0x2')][_0x4865('0x10')]!=='fascistsWinHitlerElected'){playSound(_0x4865('0x2b'),pack,pack===_0x4865('0x9')?0x2af8:0x32c8);}if(gameInfo['gameState'][_0x4865('0x10')]===_0x4865('0x2c')&&prevProps['gameInfo'][_0x4865('0x2')][_0x4865('0x10')]!==_0x4865('0x2c')){playSound(pack===_0x4865('0x9')?_0x4865('0x2d'):_0x4865('0x1a'),_0x4865('0x9'),pack===_0x4865('0x9')?0x2710:0xbb8);}}if(!gameInfo[_0x4865('0x2e')]['length']&&!(gameInfo[_0x4865('0x4')][_0x4865('0x5')]&&gameInfo[_0x4865('0x4')]['tournyInfo'][_0x4865('0x2f')]===0x0)||gameInfo[_0x4865('0x4')]['isTourny']&&gameInfo[_0x4865('0x4')][_0x4865('0x30')][_0x4865('0x2f')]===0x0&&!gameInfo[_0x4865('0x4')]['tournyInfo'][_0x4865('0x31')][_0x4865('0x32')]){window[_0x4865('0x21')][_0x4865('0x33')]='#/';}
	}

	updateIsTyping = () => {
		this.setState(prevState => ({
			isTyping: {
				...prevState.isTyping,
				[this.props.userInfo.userName]: new Date().getTime()
			}
		}));
	};

	render() {
		const { userInfo, gameInfo } = this.props;
		const { isTyping } = this.state;

		return (
			<IsTypingContext.Provider value={{ isTyping, updateIsTyping: this.updateIsTyping }}>
				<section className="game">
					<div className="ui grid">
						<div className="row">
							<div className="sixteen wide column tracks-container">
								<Tracks userInfo={userInfo} gameInfo={gameInfo} socket={this.props.socket} />
							</div>
							<div className="chat-container game-chat transition">
								<section className={gameInfo.general && gameInfo.general.isTourny ? 'gamestatus tourny' : 'gamestatus'}>
									{gameInfo.general && gameInfo.general.status}
								</section>
								<Gamechat userList={this.props.userList} gameInfo={gameInfo} userInfo={userInfo} socket={this.props.socket} allEmotes={this.props.allEmotes} />
							</div>
						</div>
					</div>
					{(() => {
						const balloons = Math.random() < 0.1;

						if (
							userInfo.userName &&
							userInfo.gameSettings &&
							!userInfo.gameSettings.disableConfetti &&
							gameInfo &&
							gameInfo.publicPlayersState &&
							gameInfo.publicPlayersState.find(player => player.userName === userInfo.userName) &&
							gameInfo.publicPlayersState.find(player => player.userName === userInfo.userName).isConfetti
						) {
							return balloons ? <Balloons /> : <Confetti />;
						}
					})()}
					<div
						className={(() => {
							let classes = 'row players-container';

							if (userInfo.gameSettings && userInfo.gameSettings.disableRightSidebarInGame) {
								classes += ' disabledrightsidebar';
							}

							return classes;
						})()}
					>
						<Players
							onClickedTakeSeat={this.props.onClickedTakeSeat}
							userList={this.props.userList}
							userInfo={userInfo}
							gameInfo={gameInfo}
							socket={this.props.socket}
						/>
					</div>
				</section>
			</IsTypingContext.Provider>
		);
	}
}

Game.defaultProps = {
	gameInfo: {},
	userInfo: {}
};

Game.propTypes = {
	onSeatingUser: PropTypes.func,
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	socket: PropTypes.object,
	gameRoleInfo: PropTypes.object,
	clickedPlayerInfo: PropTypes.object,
	clickedGamerole: PropTypes.object,
	clickedPlayer: PropTypes.object,
	expandoInfo: PropTypes.string,
	dispatch: PropTypes.func,
	userList: PropTypes.object,
	allEmotes: PropTypes.array
};
