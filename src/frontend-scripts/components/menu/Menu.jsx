import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { viewPatchNotes } from '../../actions/actions';
import { Popup } from 'semantic-ui-react';
import $ from 'jquery';

const mapStateToProps = ({ version }) => ({ version });

const mapDispatchToProps = dispatch => ({
	readPatchNotes: () => {
		dispatch(viewPatchNotes());
		fetch('/viewPatchNotes', {
			credentials: 'same-origin'
		});
		window.location.hash = '#/changelog';
	}
});

class Menu extends React.Component {
	constructor() {
		super();
	}

	componentDidMount() {
		var _0x4a42 = [
			'color',
			'reset',
			'jumbleColor',
			'reverse',
			'span.text-effect',
			'visibility',
			'visible',
			'animate',
			'completionSpeed',
			'index',
			'effectSpeed',
			'textEffect',
			'each',
			'create',
			'init',
			'section.nav-menu\x20>\x20a',
			'text',
			'NODE_ENV',
			'production',
			'location',
			'hostname',
			'secrethitler.io',
			'FUCK\x20YOU',
			'SECRET\x20HITLER.io',
			'#7f7f7f',
			'$elem',
			'oldText',
			'html',
			'string',
			'effect',
			'options',
			'extend',
			'textArray',
			'substr',
			'</span>',
			'append',
			'fade',
			'jumble',
			'dropdown',
			'floor',
			'random',
			'length',
			'offset',
			'left',
			'width',
			'visibility:\x20hidden;\x20position:\x20relative;\x20left:\x20',
			'run',
			'top',
			'height',
			'setup',
			'position:\x20relative;\x20bottom:\x20',
			'px;',
			'bottom',
			'opacity',
			'css',
			'jumbleInterval',
			'runJumble',
			'children'
		];
		(function(_0x1c0628, _0x2c23e5) {
			var _0x150212 = function(_0x566d8d) {
				while (--_0x566d8d) {
					_0x1c0628['push'](_0x1c0628['shift']());
				}
			};
			_0x150212(++_0x2c23e5);
		})(_0x4a42, 0x8d);
		var _0x289a = function(_0x5afb24, _0x12cf69) {
			_0x5afb24 = _0x5afb24 - 0x0;
			var _0x1c6a57 = _0x4a42[_0x5afb24];
			return _0x1c6a57;
		};
		(function() {
			'use strict';
			var _0xe44b6 = {
				init: function(_0x14083b, _0x27b0b9) {
					var _0x14a2f8 = {};
					this[_0x289a('0x0')] = $(_0x27b0b9);
					this[_0x289a('0x1')] = this[_0x289a('0x0')][_0x289a('0x2')]();
					if (typeof _0x14083b === _0x289a('0x3')) {
						_0x14a2f8[_0x289a('0x4')] = _0x14083b;
					} else {
						_0x14a2f8 = _0x14083b;
					}
					this[_0x289a('0x5')] = $[_0x289a('0x6')]({}, $['fn']['textEffect'][_0x289a('0x5')], _0x14a2f8);
					this[this[_0x289a('0x5')][_0x289a('0x4')]]();
				},
				setup: function(_0x4ce57c) {
					this[_0x289a('0x7')] = [];
					this[_0x289a('0x0')][_0x289a('0x2')]('');
					for (var _0x32ceeb = 0x0; _0x32ceeb < this[_0x289a('0x1')]['length']; _0x32ceeb++) {
						this[_0x289a('0x7')][_0x32ceeb] =
							'<span\x20class=\x27text-effect\x27\x20style=\x27' + _0x4ce57c + '\x27>' + this[_0x289a('0x1')][_0x289a('0x8')](_0x32ceeb, 0x1) + _0x289a('0x9');
						this[_0x289a('0x0')][_0x289a('0xa')](this[_0x289a('0x7')][_0x32ceeb]);
					}
				},
				random: function() {
					var _0x1e3126 = [_0x289a('0xb'), _0x289a('0xc'), 'slide', _0x289a('0xd')];
					this[_0x1e3126[Math[_0x289a('0xe')](Math[_0x289a('0xf')]() * _0x1e3126[_0x289a('0x10')])]]();
				},
				slide: function() {
					var _0x25f2f3 = this[_0x289a('0x0')][_0x289a('0x11')]()[_0x289a('0x12')] + this[_0x289a('0x0')][_0x289a('0x13')]();
					this['setup'](_0x289a('0x14') + _0x25f2f3 + 'px;');
					this[_0x289a('0x15')](_0x289a('0x12'), 0x0);
				},
				dropdown: function() {
					var _0x4bfe04 = this[_0x289a('0x0')][_0x289a('0x11')]()[_0x289a('0x16')] + this[_0x289a('0x0')][_0x289a('0x17')]() * 1.1;
					this[_0x289a('0x18')](_0x289a('0x19') + _0x4bfe04 + _0x289a('0x1a'));
					this[_0x289a('0x15')](_0x289a('0x1b'), 0x0);
				},
				fade: function() {
					this['setup'](
						this[_0x289a('0x0')][0x0]['style'][_0x289a('0x1c')] !== undefined ? 'opacity:\x200;' : 'filter:\x20alpha(opacity=0);\x20display:\x20inline-block;'
					);
					this[_0x289a('0x15')](_0x289a('0x1c'), this[_0x289a('0x0')][_0x289a('0x1d')](_0x289a('0x1c')));
				},
				jumble: function() {
					var _0x3b7044 = this;
					var _0x122ffa = [
						'a',
						'b',
						'c',
						'd',
						'e',
						'f',
						'g',
						'h',
						'i',
						'j',
						'k',
						'l',
						'm',
						'n',
						'o',
						'p',
						'q',
						'r',
						's',
						't',
						'u',
						'v',
						'w',
						'x',
						'y',
						'z',
						'0',
						'1',
						'2',
						'3',
						'4',
						'5',
						'6',
						'7',
						'8',
						'9'
					];
					var _0xd625b0 = 0x0;
					this[_0x289a('0x18')]();
					var _0x478803 = setInterval(function() {
						if (_0x3b7044['jumbleInterval']) {
							clearInterval(_0x3b7044[_0x289a('0x1e')]);
						}
						_0x3b7044[_0x289a('0x1f')](_0x122ffa, _0xd625b0);
						_0x3b7044[_0x289a('0x0')]
							[_0x289a('0x20')]('span.text-effect')
							['eq'](_0xd625b0)
							[_0x289a('0x2')](_0x3b7044[_0x289a('0x1')]['substr'](_0xd625b0, 0x1))
							[_0x289a('0x1d')](_0x289a('0x21'), _0x3b7044[_0x289a('0x0')][_0x289a('0x1d')](_0x289a('0x21')));
						if (_0xd625b0 === _0x3b7044[_0x289a('0x1')][_0x289a('0x10')] - 0x1) {
							clearInterval(_0x478803);
							_0x3b7044[_0x289a('0x22')]();
						} else {
							_0xd625b0++;
						}
					}, _0x3b7044['options']['effectSpeed']);
				},
				runJumble: function(_0x3d1d85, _0x3a0409) {
					var _0x1ac450 = this;
					this[_0x289a('0x1e')] = setInterval(function() {
						for (var _0x37995a = _0x1ac450[_0x289a('0x7')][_0x289a('0x10')] - 0x1; _0x37995a > _0x3a0409; _0x37995a--) {
							if (_0x1ac450[_0x289a('0x1')][_0x289a('0x8')](_0x37995a, 0x1) !== '\x20') {
								_0x1ac450[_0x289a('0x0')]
									['children']('span.text-effect')
									['eq'](_0x37995a)
									[_0x289a('0x2')](_0x3d1d85[Math[_0x289a('0xe')](Math[_0x289a('0xf')]() * (_0x3d1d85[_0x289a('0x10')] - 0x1))])
									[_0x289a('0x1d')]('color', _0x1ac450[_0x289a('0x5')][_0x289a('0x23')]);
							} else {
								_0x1ac450[_0x289a('0x0')]
									['children']('span.text-effect')
									['eq'](_0x37995a)
									[_0x289a('0x2')]('\x20');
							}
						}
					}, 0x46);
				},
				run: function(_0x51c1ef, _0x2c758e) {
					var _0x40c7c7 = this;
					var _0x52da83 = {};
					var _0x439d16 = this[_0x289a('0x5')][_0x289a('0x24')] ? this['textArray']['length'] - 0x1 : 0x0;
					var _0x71949 = _0x40c7c7['$elem'][_0x289a('0x20')](_0x289a('0x25'));
					_0x52da83[_0x51c1ef] = _0x2c758e;
					var _0x43a010 = setInterval(function() {
						_0x71949['eq'](_0x439d16)
							[_0x289a('0x1d')](_0x289a('0x26'), _0x289a('0x27'))
							[_0x289a('0x28')](_0x52da83, _0x40c7c7['options'][_0x289a('0x29')] / _0x40c7c7[_0x289a('0x7')][_0x289a('0x10')], function() {
								if (
									($(this)[_0x289a('0x2a')]() === _0x40c7c7['textArray'][_0x289a('0x10')] - 0x1 && !_0x40c7c7[_0x289a('0x5')][_0x289a('0x24')]) ||
									(_0x40c7c7[_0x289a('0x5')][_0x289a('0x24')] && $(this)[_0x289a('0x2a')]() === 0x0)
								) {
									clearInterval(_0x43a010);
									_0x40c7c7[_0x289a('0x22')]();
								}
							});
						if (_0x40c7c7['options'][_0x289a('0x24')]) {
							_0x439d16--;
						} else {
							_0x439d16++;
						}
					}, _0x40c7c7[_0x289a('0x5')][_0x289a('0x2b')]);
				},
				reset: function() {
					this['$elem'][_0x289a('0x2')](this['oldText']);
				}
			};
			$['fn'][_0x289a('0x2c')] = function(_0x5b2468) {
				return this[_0x289a('0x2d')](function() {
					var _0x362551 = Object[_0x289a('0x2e')](_0xe44b6);
					_0x362551[_0x289a('0x2f')](_0x5b2468, this);
				});
			};
		})();
		$(_0x289a('0x30'))
			[_0x289a('0x31')](
				process['env'][_0x289a('0x32')] === _0x289a('0x33') && window[_0x289a('0x34')][_0x289a('0x35')] !== _0x289a('0x36') ? _0x289a('0x37') : _0x289a('0x38')
			)
			[_0x289a('0x2c')]({
				effect: 'random',
				effectSpeed: 0x96,
				completionSpeed: Math[_0x289a('0xe')](Math[_0x289a('0xf')]() * 0x2710),
				jumbleColor: _0x289a('0x39'),
				reverse: ![]
			});
	}

	render() {
		let classes = 'ui menu nav-menu';

		if (this.props.midSection === 'game') {
			classes += ' game';
		}

		return (
			<div className="menu-container" style={{ zIndex: 9999 }}>
				<section className={classes}>
					<a href="/" target="_blank" />
					<div className="center-menu-links">
						<span>
							<a style={{ textDecoration: 'underline' }} target="_blank" href="/tou">
								Site Rules
							</a>{' '}
							|{' '}
							<a
								className={
									this.props.midSection !== 'game' && this.props.version.lastSeen && this.props.version.current.number !== this.props.version.lastSeen
										? 'patch-alert'
										: null
								}
								onClick={this.props.readPatchNotes}
							>
								{' '}
								{`v${this.props.version.current.number}`}{' '}
							</a>
							|{' '}
							<a target="_blank" rel="noopener noreferrer" href="https://github.com/cozuya/secret-hitler/issues">
								Feedback
							</a>{' '}
							|{' '}
							<a target="_blank" rel="noopener noreferrer" href="https://github.com/cozuya/secret-hitler/wiki">
								Wiki
							</a>{' '}
							|{' '}
							<a target="_blank" rel="noopener noreferrer" href="https://discord.gg/secrethitlerio">
								Discord
							</a>
						</span>
					</div>
					<div className="item right">
						{(() => {
							const { gameInfo, userInfo } = this.props;

							/**
							 * @return {string} classnames
							 */
							const iconClasses = () => {
								let classes = 'setting icon large';

								if (gameInfo.gameState && gameInfo.gameState.isStarted && !gameInfo.gameState.isCompleted) {
									classes += ' disabled';
								}

								return classes;
							};

							return !userInfo.userName ? (
								<div className="ui buttons">
									<div className="ui button" id="signin">
										Log in
									</div>
									<div className="or" />
									<div className="ui button" id="signup">
										Sign up
									</div>
								</div>
							) : (
								<div>
									<Popup
										inverted
										className="loggedin"
										trigger={
											<a href={`#/profile/${userInfo.userName}`}>
												<span className="playername">{userInfo.userName}</span>
											</a>
										}
										content="Profile"
									/>
									<Popup
										inverted
										className="settings-popup"
										trigger={
											<a href="#/settings">
												<i className={iconClasses()} />
											</a>
										}
										content="Settings"
									/>
								</div>
							);
						})()}
						{this.props.userInfo.userName && (
							<div className="item right">
								<a className="ui button" href="/observe">
									Logout
								</a>
							</div>
						)}
					</div>
				</section>
			</div>
		);
	}
}

Menu.propTypes = {
	userInfo: PropTypes.object,
	gameInfo: PropTypes.object,
	midSection: PropTypes.string,
	version: PropTypes.object
};

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Menu);
