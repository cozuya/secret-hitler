import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Popup } from 'semantic-ui-react';
import $ from 'jquery';
import classnames from 'classnames';
import { Link } from 'react-router-dom';

import { viewPatchNotes } from '../../actions/actions';

const mapStateToProps = ({ version }) => ({ version });

const mapDispatchToProps = dispatch => ({
	readPatchNotes: () => {
		dispatch(viewPatchNotes());
		fetch('/viewPatchNotes', {
			credentials: 'same-origin'
		});
		window.location.pathname = '/game/changelog';
	}
});

class Menu extends React.Component {
	componentDidMount() {
		/*eslint-disable */
		(() => {
			var TextEffect = {
				init: function(options, elem) {
					var _options = {};
					this.$elem = $(elem);
					this.oldText = this.$elem.html();
					if (typeof options === 'string') {
						_options.effect = options;
					} else {
						_options = options;
					}
					this.options = $.extend({}, $.fn.textEffect.options, _options);
					this[this.options.effect]();
				},
				setup: function(effectOption) {
					this.textArray = [];
					this.$elem.html('');
					for (var i = 0; i < this.oldText.length; i++) {
						this.textArray[i] = "<span class='text-effect' style='" + effectOption + "'>" + this.oldText.substr(i, 1) + '</span>';
						this.$elem.append(this.textArray[i]);
					}
				},
				random: function() {
					var effects = ['fade', 'jumble', 'slide', 'dropdown'];
					this[effects[Math.floor(Math.random() * effects.length)]]();
				},
				slide: function() {
					var startPosition = this.$elem.offset().left + this.$elem.width();
					this.setup('visibility: hidden; position: relative; left: ' + startPosition + 'px;');
					this.run('left', 0);
				},
				dropdown: function() {
					var offscreen = this.$elem.offset().top + this.$elem.height() * 1.1; // little extra padding
					this.setup('position: relative; bottom: ' + offscreen + 'px;');
					this.run('bottom', 0);
				},
				fade: function() {
					this.setup(this.$elem[0].style.opacity !== undefined ? 'opacity: 0;' : 'filter: alpha(opacity=0); display: inline-block;');
					this.run('opacity', this.$elem.css('opacity'));
				},
				jumble: function() {
					var self = this;
					var letterArray = [
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
					var i = 0;
					this.setup();
					var jumbleEffectInterval = setInterval(function() {
						if (self.jumbleInterval) {
							clearInterval(self.jumbleInterval);
						}
						self.runJumble(letterArray, i);
						self.$elem
							.children('span.text-effect')
							.eq(i)
							.html(self.oldText.substr(i, 1))
							.css('color', self.$elem.css('color'));
						if (i === self.oldText.length - 1) {
							clearInterval(jumbleEffectInterval);
							self.reset();
						} else {
							i++;
						}
					}, self.options.effectSpeed);
				},
				runJumble: function(letterArray, jumbleLength) {
					var self = this;
					this.jumbleInterval = setInterval(function() {
						for (var i = self.textArray.length - 1; i > jumbleLength; i--) {
							if (self.oldText.substr(i, 1) !== ' ') {
								self.$elem
									.children('span.text-effect')
									.eq(i)
									.html(letterArray[Math.floor(Math.random() * (letterArray.length - 1))])
									.css('color', self.options.jumbleColor);
							} else {
								self.$elem
									.children('span.text-effect')
									.eq(i)
									.html(' ');
							}
						}
					}, 70);
				},
				run: function(effect, oldEffect) {
					var self = this;
					var obj = {};
					var i = this.options.reverse ? this.textArray.length - 1 : 0;
					var $spans = self.$elem.children('span.text-effect');
					obj[effect] = oldEffect;
					var effectInterval = setInterval(function() {
						$spans
							.eq(i)
							.css('visibility', 'visible')
							.animate(obj, self.options.completionSpeed / self.textArray.length, function() {
								if (($(this).index() === self.textArray.length - 1 && !self.options.reverse) || (self.options.reverse && $(this).index() === 0)) {
									clearInterval(effectInterval);
									self.reset();
								}
							});
						if (self.options.reverse) {
							i--;
						} else {
							i++;
						}
					}, self.options.effectSpeed);
				},
				reset: function() {
					this.$elem.html(this.oldText);
				}
			};
			$.fn.textEffect = function(options) {
				return this.each(function() {
					var texteffect = Object.create(TextEffect);
					texteffect.init(options, this);
				});
			};
		})();
		/* eslint-enable */

		$('section.nav-menu > a').textEffect({
			effect: 'random',
			effectSpeed: 150,
			completionSpeed: Math.floor(Math.random() * 10000),
			jumbleColor: '#7f7f7f',
			reverse: false
		});
	}

	render() {
		const { version, gameInfo, userInfo } = this.props;
		const isGame = Boolean(Object.keys(gameInfo).length);

		return (
			<div className="menu-container" style={{ zIndex: 9999 }}>
				<section
					className={classnames('ui menu nav-menu', {
						game: isGame
					})}
				>
					<a href="/" target="_blank">
						SECRET HITLER.io
					</a>
					<div className="center-menu-links">
						<span>
							<a style={{ textDecoration: 'underline' }} target="_blank" href="/tou">
								Site Rules
							</a>{' '}
							|{' '}
							<a
								className={!isGame && version.lastSeen && version.current.number !== version.lastSeen ? 'patch-alert' : null}
								onClick={this.props.readPatchNotes}
							>
								{' '}
								{`v${version.current.number}`}{' '}
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
						{userInfo.userName ? (
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
										<Link to={'/game/settings'}>
											<i
												className={classnames('setting icon large', {
													disabled: gameInfo.gameState && gameInfo.gameState.isStarted && !gameInfo.gameState.isCompleted
												})}
											/>
										</Link>
									}
									content="Settings"
								/>
							</div>
						) : (
							<div className="ui buttons">
								<div className="ui button" id="signin">
									Log in
								</div>
								<div className="or" />
								<div className="ui button" id="signup">
									Sign up
								</div>
							</div>
						)}
						{userInfo.userName && (
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
	readPatchNotes: PropTypes.func,
	midSection: PropTypes.string,
	version: PropTypes.object
};

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Menu);
