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
		this.eloSliderChange = this.eloSliderChange.bind(this);
		this.timedSliderChange = this.timedSliderChange.bind(this);

		this.state = {
			gameName: '',
			sliderValues: [5, 10],
			experiencedmode: true,
			disablechat: false,
			disablegamechat: false,
			disableobserver: false,
			privateShowing: false,
			containsBadWord: false,
			rainbowgame: false,
			checkedSliderValues: new Array(6).fill(true),
			checkedRebalanceValues: new Array(3).fill(true),
			privateonlygame: false,
			isTourny: false,
			casualgame: false,
			blindMode: false,
			timedMode: false,
			isVerifiedOnly: false,
			timedSliderValue: [120],
			eloSliderValue: [1675],
			isEloLimited: false,
			customGameSettings: {
				enabled: false,
				powers: [false, 'investigate', 'election', 'bullet', 'bullet'], // last "power" is always a fas victory
				hitlerZone: 3,
				vetoZone: 5,
				fascistCount: 2, // does not include hit
				hitlerCanSeeFascists: true,
				deckState: { lib: 6, fas: 11 }, // does not include track cards, which will be added server-side to make the deck shuffle code work
				trackState: { lib: 0, fas: 0 }
			}
		};
	}

	componentDidMount() {
		const self = this;

		$(this._select).dropdown();

		$(this.verified).checkbox({
			onChecked() {
				self.setState({ isVerifiedOnly: true });
			},
			onUnchecked() {
				self.setState({ isVerifiedOnly: false });
			}
		});

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

		$(this.elolimited).checkbox({
			onChecked() {
				self.setState({ isEloLimited: true });
			},
			onUnchecked() {
				self.setState({ isEloLimited: false });
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
				self.setState({ isTourny: true, sliderValues: [8] });
			},
			onUnchecked() {
				self.setState({ isTourny: false, sliderValues: [5, 10] });
			}
		});

		$(this.blindmode).checkbox({
			onChecked() {
				self.setState({ blindMode: true });
			},
			onUnchecked() {
				self.setState({ blindMode: false });
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

		$(this.privateonlygame).checkbox({
			onChecked() {
				self.setState({ privateonlygame: true });
			},
			onUnchecked() {
				self.setState({ privateonlygame: false });
			}
		});

		$(this.disableobserver).checkbox({
			onChecked() {
				self.setState({ disableobserver: true });
			},
			onUnchecked() {
				self.setState({ disableobserver: false });
			}
		});

		$(this.casualgame).checkbox({
			onChecked() {
				self.setState({ casualgame: true });
			},
			onUnchecked() {
				if (!(self.state.casualgame && self.state.timedSliderValue[0] < 29)) {
					self.setState({ casualgame: false });
				}
			}
		});

		$(this.timed).checkbox({
			onChecked() {
				self.setState({ timedMode: true });
			},
			onUnchecked() {
				self.setState({ timedMode: false });
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
		const $creategame = $('section.creategame');
		const { userInfo } = this.props;

		if (userInfo.gameSettings.isPrivate && !this.state.privateShowing) {
			return;
		}

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
			const excludedPlayerCount = this.state.checkedSliderValues.map((el, index) => (el ? null : index + 5)).filter(el => el);
			const data = {
				gameName: $creategame.find('div.gamename input').val() || 'New Game',
				flag: $creategame.find('div.flag input').val() || 'none',
				minPlayersCount: this.state.sliderValues[0],
				excludedPlayerCount,
				maxPlayersCount: this.state.isTourny ? undefined : this.state.sliderValues[1],
				experiencedMode: this.state.experiencedmode,
				disableChat: this.state.disablechat,
				disableObserver: this.state.disableobserver && !this.state.isTourny,
				isTourny: this.state.isTourny,
				isVerifiedOnly: userInfo.verified ? this.state.isVerifiedOnly : false,
				disableGamechat: this.state.disablegamechat,
				rainbowgame: this.state.rainbowgame,
				blindMode: this.state.blindMode,
				timedMode: this.state.timedMode ? this.state.timedSliderValue[0] : false,
				casualGame: this.state.casualgame,
				rebalance6p: this.state.checkedRebalanceValues[0],
				rebalance7p: this.state.checkedRebalanceValues[1],
				rebalance9p2f: this.state.checkedRebalanceValues[2],
				eloSliderValue: this.state.isEloLimited ? this.state.eloSliderValue[0] : null,
				privatePassword: this.state.privateShowing ? $(this.privategamepassword).val() : false,
				customGameSettings: this.state.customGameSettings.enabled ? this.state.customGameSettings : undefined
			};

			if (this.state.isTourny) {
				game.general.tournyInfo = {
					round: 0,
					queuedPlayers: [
						{
							userName: userInfo.userName,
							customCardback: userInfo.gameSettings.customCardback,
							customCardbackUid: userInfo.gameSettings.customCardbackUid,
							tournyWins: userInfo.gameSettings.tournyWins,
							connected: true,
							cardStatus: {
								cardDisplayed: false,
								isFlipped: false,
								cardFront: 'secretrole',
								cardBack: {}
							}
						}
					]
				};
			}

			this.props.socket.emit('addNewGame', data);
		}
	}

	renderFlagDropdown() {
		return (
			<div ref={select => (this._select = select)} className="ui search selection dropdown flag">
				<input type="hidden" name="flag" />
				<i className="dropdown icon" />
				<div className="default text">None</div>
				<div className="menu">
					<div className="item" data-value="none">
						None
					</div>

					<div className="item" data-value="us">
						<i className="us flag" />United States
					</div>
					<div className="item" data-value="ca">
						<i className="ca flag" />Canada
					</div>
					<div className="item" data-value="de">
						<i className="de flag" />Germany
					</div>
					<div className="item" data-value="gb">
						<i className="gb flag" />United Kingdom
					</div>
					<div className="item" data-value="au">
						<i className="au flag" />Australia
					</div>
					<div className="item" data-value="af">
						<i className="af flag" />Afghanistan
					</div>
					<div className="item" data-value="ax">
						<i className="ax flag" />Aland Islands
					</div>
					<div className="item" data-value="al">
						<i className="al flag" />Albania
					</div>
					<div className="item" data-value="dz">
						<i className="dz flag" />Algeria
					</div>
					<div className="item" data-value="as">
						<i className="as flag" />American Samoa
					</div>
					<div className="item" data-value="ad">
						<i className="ad flag" />Andorra
					</div>
					<div className="item" data-value="ao">
						<i className="ao flag" />Angola
					</div>
					<div className="item" data-value="ai">
						<i className="ai flag" />Anguilla
					</div>
					<div className="item" data-value="ag">
						<i className="ag flag" />Antigua
					</div>
					<div className="item" data-value="ar">
						<i className="ar flag" />Argentina
					</div>
					<div className="item" data-value="am">
						<i className="am flag" />Armenia
					</div>
					<div className="item" data-value="aw">
						<i className="aw flag" />Aruba
					</div>

					<div className="item" data-value="at">
						<i className="at flag" />Austria
					</div>
					<div className="item" data-value="az">
						<i className="az flag" />Azerbaijan
					</div>
					<div className="item" data-value="bs">
						<i className="bs flag" />Bahamas
					</div>
					<div className="item" data-value="bh">
						<i className="bh flag" />Bahrain
					</div>
					<div className="item" data-value="bd">
						<i className="bd flag" />Bangladesh
					</div>
					<div className="item" data-value="bb">
						<i className="bb flag" />Barbados
					</div>
					<div className="item" data-value="by">
						<i className="by flag" />Belarus
					</div>
					<div className="item" data-value="be">
						<i className="be flag" />Belgium
					</div>
					<div className="item" data-value="bz">
						<i className="bz flag" />Belize
					</div>
					<div className="item" data-value="bj">
						<i className="bj flag" />Benin
					</div>
					<div className="item" data-value="bm">
						<i className="bm flag" />Bermuda
					</div>
					<div className="item" data-value="bt">
						<i className="bt flag" />Bhutan
					</div>
					<div className="item" data-value="bo">
						<i className="bo flag" />Bolivia
					</div>
					<div className="item" data-value="ba">
						<i className="ba flag" />Bosnia
					</div>
					<div className="item" data-value="bw">
						<i className="bw flag" />Botswana
					</div>
					<div className="item" data-value="bv">
						<i className="bv flag" />Bouvet Island
					</div>
					<div className="item" data-value="br">
						<i className="br flag" />Brazil
					</div>
					<div className="item" data-value="vg">
						<i className="vg flag" />British Virgin Islands
					</div>
					<div className="item" data-value="bn">
						<i className="bn flag" />Brunei
					</div>
					<div className="item" data-value="bg">
						<i className="bg flag" />Bulgaria
					</div>
					<div className="item" data-value="bf">
						<i className="bf flag" />Burkina Faso
					</div>
					<div className="item" data-value="mm">
						<i className="mm flag" />Burma
					</div>
					<div className="item" data-value="bi">
						<i className="bi flag" />Burundi
					</div>
					<div className="item" data-value="tc">
						<i className="tc flag" />Caicos Islands
					</div>
					<div className="item" data-value="kh">
						<i className="kh flag" />Cambodia
					</div>
					<div className="item" data-value="cm">
						<i className="cm flag" />Cameroon
					</div>
					<div className="item" data-value="cn">
						<i className="cn flag" />China
					</div>

					<div className="item" data-value="cv">
						<i className="cv flag" />Cape Verde
					</div>
					<div className="item" data-value="ky">
						<i className="ky flag" />Cayman Islands
					</div>
					<div className="item" data-value="cf">
						<i className="cf flag" />Central African Republic
					</div>
					<div className="item" data-value="td">
						<i className="td flag" />Chad
					</div>
					<div className="item" data-value="cl">
						<i className="cl flag" />Chile
					</div>

					<div className="item" data-value="cx">
						<i className="cx flag" />Christmas Island
					</div>
					<div className="item" data-value="cc">
						<i className="cc flag" />Cocos Islands
					</div>
					<div className="item" data-value="co">
						<i className="co flag" />Colombia
					</div>
					<div className="item" data-value="km">
						<i className="km flag" />Comoros
					</div>
					<div className="item" data-value="cg">
						<i className="cg flag" />Congo Brazzaville
					</div>
					<div className="item" data-value="cd">
						<i className="cd flag" />Congo
					</div>
					<div className="item" data-value="ck">
						<i className="ck flag" />Cook Islands
					</div>
					<div className="item" data-value="cr">
						<i className="cr flag" />Costa Rica
					</div>
					<div className="item" data-value="ci">
						<i className="ci flag" />Cote Divoire
					</div>
					<div className="item" data-value="hr">
						<i className="hr flag" />Croatia
					</div>
					<div className="item" data-value="cu">
						<i className="cu flag" />Cuba
					</div>
					<div className="item" data-value="cy">
						<i className="cy flag" />Cyprus
					</div>
					<div className="item" data-value="cz">
						<i className="cz flag" />Czech Republic
					</div>
					<div className="item" data-value="dk">
						<i className="dk flag" />Denmark
					</div>
					<div className="item" data-value="dj">
						<i className="dj flag" />Djibouti
					</div>
					<div className="item" data-value="dm">
						<i className="dm flag" />Dominica
					</div>
					<div className="item" data-value="do">
						<i className="do flag" />Dominican Republic
					</div>
					<div className="item" data-value="ec">
						<i className="ec flag" />Ecuador
					</div>
					<div className="item" data-value="eg">
						<i className="eg flag" />Egypt
					</div>
					<div className="item" data-value="sv">
						<i className="sv flag" />El Salvador
					</div>
					<div className="item" data-value="gq">
						<i className="gq flag" />Equatorial Guinea
					</div>
					<div className="item" data-value="er">
						<i className="er flag" />Eritrea
					</div>
					<div className="item" data-value="ee">
						<i className="ee flag" />Estonia
					</div>
					<div className="item" data-value="et">
						<i className="et flag" />Ethiopia
					</div>
					<div className="item" data-value="eu">
						<i className="eu flag" />European Union
					</div>
					<div className="item" data-value="fk">
						<i className="fk flag" />Falkland Islands
					</div>
					<div className="item" data-value="fo">
						<i className="fo flag" />Faroe Islands
					</div>
					<div className="item" data-value="fj">
						<i className="fj flag" />Fiji
					</div>
					<div className="item" data-value="fi">
						<i className="fi flag" />Finland
					</div>
					<div className="item" data-value="fr">
						<i className="fr flag" />France
					</div>
					<div className="item" data-value="gf">
						<i className="gf flag" />French Guiana
					</div>
					<div className="item" data-value="pf">
						<i className="pf flag" />French Polynesia
					</div>
					<div className="item" data-value="tf">
						<i className="tf flag" />French Territories
					</div>
					<div className="item" data-value="ga">
						<i className="ga flag" />Gabon
					</div>
					<div className="item" data-value="gm">
						<i className="gm flag" />Gambia
					</div>
					<div className="item" data-value="ge">
						<i className="ge flag" />Georgia
					</div>

					<div className="item" data-value="gh">
						<i className="gh flag" />Ghana
					</div>
					<div className="item" data-value="gi">
						<i className="gi flag" />Gibraltar
					</div>
					<div className="item" data-value="gr">
						<i className="gr flag" />Greece
					</div>
					<div className="item" data-value="gl">
						<i className="gl flag" />Greenland
					</div>
					<div className="item" data-value="gd">
						<i className="gd flag" />Grenada
					</div>
					<div className="item" data-value="gp">
						<i className="gp flag" />Guadeloupe
					</div>
					<div className="item" data-value="gu">
						<i className="gu flag" />Guam
					</div>
					<div className="item" data-value="gt">
						<i className="gt flag" />Guatemala
					</div>
					<div className="item" data-value="gw">
						<i className="gw flag" />Guinea-Bissau
					</div>
					<div className="item" data-value="gn">
						<i className="gn flag" />Guinea
					</div>
					<div className="item" data-value="gy">
						<i className="gy flag" />Guyana
					</div>
					<div className="item" data-value="ht">
						<i className="ht flag" />Haiti
					</div>
					<div className="item" data-value="hm">
						<i className="hm flag" />Heard Island
					</div>
					<div className="item" data-value="hn">
						<i className="hn flag" />Honduras
					</div>
					<div className="item" data-value="hk">
						<i className="hk flag" />Hong Kong
					</div>
					<div className="item" data-value="hu">
						<i className="hu flag" />Hungary
					</div>
					<div className="item" data-value="is">
						<i className="is flag" />Iceland
					</div>
					<div className="item" data-value="in">
						<i className="in flag" />India
					</div>
					<div className="item" data-value="io">
						<i className="io flag" />Indian Ocean Territory
					</div>
					<div className="item" data-value="id">
						<i className="id flag" />Indonesia
					</div>
					<div className="item" data-value="ir">
						<i className="ir flag" />Iran
					</div>
					<div className="item" data-value="iq">
						<i className="iq flag" />Iraq
					</div>
					<div className="item" data-value="ie">
						<i className="ie flag" />Ireland
					</div>
					<div className="item" data-value="il">
						<i className="il flag" />Israel
					</div>
					<div className="item" data-value="it">
						<i className="it flag" />Italy
					</div>
					<div className="item" data-value="jm">
						<i className="jm flag" />Jamaica
					</div>
					<div className="item" data-value="jp">
						<i className="jp flag" />Japan
					</div>
					<div className="item" data-value="jo">
						<i className="jo flag" />Jordan
					</div>
					<div className="item" data-value="kz">
						<i className="kz flag" />Kazakhstan
					</div>
					<div className="item" data-value="ke">
						<i className="ke flag" />Kenya
					</div>
					<div className="item" data-value="ki">
						<i className="ki flag" />Kiribati
					</div>
					<div className="item" data-value="kw">
						<i className="kw flag" />Kuwait
					</div>
					<div className="item" data-value="kg">
						<i className="kg flag" />Kyrgyzstan
					</div>
					<div className="item" data-value="la">
						<i className="la flag" />Laos
					</div>
					<div className="item" data-value="lv">
						<i className="lv flag" />Latvia
					</div>
					<div className="item" data-value="lb">
						<i className="lb flag" />Lebanon
					</div>
					<div className="item" data-value="ls">
						<i className="ls flag" />Lesotho
					</div>
					<div className="item" data-value="lr">
						<i className="lr flag" />Liberia
					</div>
					<div className="item" data-value="ly">
						<i className="ly flag" />Libya
					</div>
					<div className="item" data-value="li">
						<i className="li flag" />Liechtenstein
					</div>
					<div className="item" data-value="lt">
						<i className="lt flag" />Lithuania
					</div>
					<div className="item" data-value="lu">
						<i className="lu flag" />Luxembourg
					</div>
					<div className="item" data-value="mo">
						<i className="mo flag" />Macau
					</div>
					<div className="item" data-value="mk">
						<i className="mk flag" />Macedonia
					</div>
					<div className="item" data-value="mg">
						<i className="mg flag" />Madagascar
					</div>
					<div className="item" data-value="mw">
						<i className="mw flag" />Malawi
					</div>
					<div className="item" data-value="my">
						<i className="my flag" />Malaysia
					</div>
					<div className="item" data-value="mv">
						<i className="mv flag" />Maldives
					</div>
					<div className="item" data-value="ml">
						<i className="ml flag" />Mali
					</div>
					<div className="item" data-value="mt">
						<i className="mt flag" />Malta
					</div>
					<div className="item" data-value="mh">
						<i className="mh flag" />Marshall Islands
					</div>
					<div className="item" data-value="mq">
						<i className="mq flag" />Martinique
					</div>
					<div className="item" data-value="mr">
						<i className="mr flag" />Mauritania
					</div>
					<div className="item" data-value="mu">
						<i className="mu flag" />Mauritius
					</div>
					<div className="item" data-value="yt">
						<i className="yt flag" />Mayotte
					</div>
					<div className="item" data-value="mx">
						<i className="mx flag" />Mexico
					</div>
					<div className="item" data-value="fm">
						<i className="fm flag" />Micronesia
					</div>
					<div className="item" data-value="md">
						<i className="md flag" />Moldova
					</div>
					<div className="item" data-value="mc">
						<i className="mc flag" />Monaco
					</div>
					<div className="item" data-value="mn">
						<i className="mn flag" />Mongolia
					</div>
					<div className="item" data-value="me">
						<i className="me flag" />Montenegro
					</div>
					<div className="item" data-value="ms">
						<i className="ms flag" />Montserrat
					</div>
					<div className="item" data-value="ma">
						<i className="ma flag" />Morocco
					</div>
					<div className="item" data-value="mz">
						<i className="mz flag" />Mozambique
					</div>
					<div className="item" data-value="na">
						<i className="na flag" />Namibia
					</div>
					<div className="item" data-value="nr">
						<i className="nr flag" />Nauru
					</div>
					<div className="item" data-value="np">
						<i className="np flag" />Nepal
					</div>
					<div className="item" data-value="an">
						<i className="an flag" />Netherlands Antilles
					</div>
					<div className="item" data-value="nl">
						<i className="nl flag" />Netherlands
					</div>
					<div className="item" data-value="nc">
						<i className="nc flag" />New Caledonia
					</div>
					<div className="item" data-value="pg">
						<i className="pg flag" />New Guinea
					</div>
					<div className="item" data-value="nz">
						<i className="nz flag" />New Zealand
					</div>
					<div className="item" data-value="ni">
						<i className="ni flag" />Nicaragua
					</div>
					<div className="item" data-value="ne">
						<i className="ne flag" />Niger
					</div>
					<div className="item" data-value="ng">
						<i className="ng flag" />Nigeria
					</div>
					<div className="item" data-value="nu">
						<i className="nu flag" />Niue
					</div>
					<div className="item" data-value="nf">
						<i className="nf flag" />Norfolk Island
					</div>
					<div className="item" data-value="kp">
						<i className="kp flag" />North Korea
					</div>
					<div className="item" data-value="mp">
						<i className="mp flag" />Northern Mariana Islands
					</div>
					<div className="item" data-value="no">
						<i className="no flag" />Norway
					</div>
					<div className="item" data-value="om">
						<i className="om flag" />Oman
					</div>
					<div className="item" data-value="pk">
						<i className="pk flag" />Pakistan
					</div>
					<div className="item" data-value="pw">
						<i className="pw flag" />Palau
					</div>
					<div className="item" data-value="ps">
						<i className="ps flag" />Palestine
					</div>
					<div className="item" data-value="pa">
						<i className="pa flag" />Panama
					</div>
					<div className="item" data-value="py">
						<i className="py flag" />Paraguay
					</div>
					<div className="item" data-value="pe">
						<i className="pe flag" />Peru
					</div>
					<div className="item" data-value="ph">
						<i className="ph flag" />Philippines
					</div>
					<div className="item" data-value="pn">
						<i className="pn flag" />Pitcairn Islands
					</div>
					<div className="item" data-value="pl">
						<i className="pl flag" />Poland
					</div>
					<div className="item" data-value="pt">
						<i className="pt flag" />Portugal
					</div>
					<div className="item" data-value="pr">
						<i className="pr flag" />Puerto Rico
					</div>
					<div className="item" data-value="qa">
						<i className="qa flag" />Qatar
					</div>
					<div className="item" data-value="re">
						<i className="re flag" />Reunion
					</div>
					<div className="item" data-value="ro">
						<i className="ro flag" />Romania
					</div>
					<div className="item" data-value="ru">
						<i className="ru flag" />Russia
					</div>
					<div className="item" data-value="rw">
						<i className="rw flag" />Rwanda
					</div>
					<div className="item" data-value="sh">
						<i className="sh flag" />Saint Helena
					</div>
					<div className="item" data-value="kn">
						<i className="kn flag" />Saint Kitts and Nevis
					</div>
					<div className="item" data-value="lc">
						<i className="lc flag" />Saint Lucia
					</div>
					<div className="item" data-value="pm">
						<i className="pm flag" />Saint Pierre
					</div>
					<div className="item" data-value="vc">
						<i className="vc flag" />Saint Vincent
					</div>
					<div className="item" data-value="ws">
						<i className="ws flag" />Samoa
					</div>
					<div className="item" data-value="sm">
						<i className="sm flag" />San Marino
					</div>
					<div className="item" data-value="gs">
						<i className="gs flag" />Sandwich Islands
					</div>
					<div className="item" data-value="st">
						<i className="st flag" />Sao Tome
					</div>
					<div className="item" data-value="sa">
						<i className="sa flag" />Saudi Arabia
					</div>
					<div className="item" data-value="gb sct">
						<i className="gb sct flag" />Scotland
					</div>
					<div className="item" data-value="sn">
						<i className="sn flag" />Senegal
					</div>
					<div className="item" data-value="cs">
						<i className="cs flag" />Serbia
					</div>
					<div className="item" data-value="rs">
						<i className="rs flag" />Serbia
					</div>
					<div className="item" data-value="sc">
						<i className="sc flag" />Seychelles
					</div>
					<div className="item" data-value="sl">
						<i className="sl flag" />Sierra Leone
					</div>
					<div className="item" data-value="sg">
						<i className="sg flag" />Singapore
					</div>
					<div className="item" data-value="sk">
						<i className="sk flag" />Slovakia
					</div>
					<div className="item" data-value="si">
						<i className="si flag" />Slovenia
					</div>
					<div className="item" data-value="sb">
						<i className="sb flag" />Solomon Islands
					</div>
					<div className="item" data-value="so">
						<i className="so flag" />Somalia
					</div>
					<div className="item" data-value="za">
						<i className="za flag" />South Africa
					</div>
					<div className="item" data-value="kr">
						<i className="kr flag" />South Korea
					</div>
					<div className="item" data-value="es">
						<i className="es flag" />Spain
					</div>
					<div className="item" data-value="lk">
						<i className="lk flag" />Sri Lanka
					</div>
					<div className="item" data-value="sd">
						<i className="sd flag" />Sudan
					</div>
					<div className="item" data-value="sr">
						<i className="sr flag" />Suriname
					</div>
					<div className="item" data-value="sj">
						<i className="sj flag" />Svalbard
					</div>
					<div className="item" data-value="sz">
						<i className="sz flag" />Swaziland
					</div>
					<div className="item" data-value="se">
						<i className="se flag" />Sweden
					</div>
					<div className="item" data-value="ch">
						<i className="ch flag" />Switzerland
					</div>
					<div className="item" data-value="sy">
						<i className="sy flag" />Syria
					</div>
					<div className="item" data-value="tw">
						<i className="tw flag" />Taiwan
					</div>
					<div className="item" data-value="tj">
						<i className="tj flag" />Tajikistan
					</div>
					<div className="item" data-value="tz">
						<i className="tz flag" />Tanzania
					</div>
					<div className="item" data-value="th">
						<i className="th flag" />Thailand
					</div>
					<div className="item" data-value="tl">
						<i className="tl flag" />Timorleste
					</div>
					<div className="item" data-value="tg">
						<i className="tg flag" />Togo
					</div>
					<div className="item" data-value="tk">
						<i className="tk flag" />Tokelau
					</div>
					<div className="item" data-value="to">
						<i className="to flag" />Tonga
					</div>
					<div className="item" data-value="tt">
						<i className="tt flag" />Trinidad
					</div>
					<div className="item" data-value="tn">
						<i className="tn flag" />Tunisia
					</div>
					<div className="item" data-value="tr">
						<i className="tr flag" />Turkey
					</div>
					<div className="item" data-value="tm">
						<i className="tm flag" />Turkmenistan
					</div>
					<div className="item" data-value="tv">
						<i className="tv flag" />Tuvalu
					</div>
					<div className="item" data-value="ug">
						<i className="ug flag" />Uganda
					</div>
					<div className="item" data-value="ua">
						<i className="ua flag" />Ukraine
					</div>
					<div className="item" data-value="ae">
						<i className="ae flag" />United Arab Emirates
					</div>

					<div className="item" data-value="uy">
						<i className="uy flag" />Uruguay
					</div>
					<div className="item" data-value="um">
						<i className="um flag" />Us Minor Islands
					</div>
					<div className="item" data-value="vi">
						<i className="vi flag" />Us Virgin Islands
					</div>
					<div className="item" data-value="uz">
						<i className="uz flag" />Uzbekistan
					</div>
					<div className="item" data-value="vu">
						<i className="vu flag" />Vanuatu
					</div>
					<div className="item" data-value="va">
						<i className="va flag" />Vatican City
					</div>
					<div className="item" data-value="ve">
						<i className="ve flag" />Venezuela
					</div>
					<div className="item" data-value="vn">
						<i className="vn flag" />Vietnam
					</div>
					<div className="item" data-value="gb wls">
						<i className="gb wls flag" />Wales
					</div>
					<div className="item" data-value="wf">
						<i className="wf flag" />Wallis and Futuna
					</div>
					<div className="item" data-value="eh">
						<i className="eh flag" />Western Sahara
					</div>
					<div className="item" data-value="ye">
						<i className="ye flag" />Yemen
					</div>
					<div className="item" data-value="zm">
						<i className="zm flag" />Zambia
					</div>
					<div className="item" data-value="zw">
						<i className="zw flag" />Zimbabwe
					</div>
				</div>
			</div>
		);
	}

	renderPlayerSlider() {
		const sliderCheckboxClick = index => {
			const newSliderValues = this.state.checkedSliderValues.map((el, i) => (i === index ? !el : el));
			const includedPlayerCounts = newSliderValues.map((el, i) => (el ? i + 5 : null)).filter(el => el !== null);
			const minPlayers = Math.min(...includedPlayerCounts);
			const maxPlayers = Math.max(...includedPlayerCounts);

			this.setState({
				checkedSliderValues: newSliderValues,
				sliderValues: [minPlayers, maxPlayers]
			});
		};

		return (
			<div className="eight wide column centered slider">
				<h4 className="ui header">Number of players</h4>
				{this.state.isTourny ? (
					<Range
						className="tourny-slider"
						onChange={this.sliderChange}
						min={1}
						max={3}
						defaultValue={[0]}
						value={this.state.sliderValues}
						marks={{ 1: '14', 2: '16', 3: '18' }}
					/>
				) : (
					<Range
						onChange={this.sliderChange}
						min={5}
						max={10}
						defaultValue={[5, 10]}
						value={this.state.sliderValues}
						marks={{ 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10' }}
					/>
				)}
				{!this.state.isTourny && (
					<div className="checkbox-container">
						{new Array(6).fill(true).map((el, index) => (
							<label key={index}>
								<input
									type="checkbox"
									checked={this.state.checkedSliderValues[index]}
									disabled={this.state.sliderValues[0] === this.state.sliderValues[1] ? (index + 5 === this.state.sliderValues[0] ? true : false) : false}
									onChange={() => {
										sliderCheckboxClick(index);
									}}
								/>
							</label>
						))}
					</div>
				)}
			</div>
		);
	}

	renderRebalanceCheckboxes() {
		const rebalancedInputClick = index => {
			const { checkedRebalanceValues } = this.state;

			checkedRebalanceValues[index] = !checkedRebalanceValues[index];

			this.setState(checkedRebalanceValues);
		};

		return (
			<div className={this.state.isTourny ? 'rebalance-container isTourny' : 'rebalance-container'}>
				<span title="When enabled, 6p games have a fascist policy already enacted, and 7p and 9p games start with one less fascist policy in the deck.">
					<i className="info circle icon" />Rebalance:
				</span>

				{new Array(3).fill(true).map((el, index) => (
					<label key={index} className={`rebalance-${index}`}>
						<input
							type="checkbox"
							checked={this.state.checkedRebalanceValues[index]}
							disabled={(() => {
								const firstSlider = this.state.sliderValues[0];
								const secondSlider = this.state.sliderValues[1];

								if (index === 0) {
									return firstSlider > 6 || secondSlider < 6;
								}

								if (index === 1) {
									return firstSlider > 7 || secondSlider < 7;
								}

								return firstSlider > 9 || secondSlider < 9;
							})()}
							onChange={() => {
								rebalancedInputClick(index);
							}}
						/>
					</label>
				))}
			</div>
		);
	}

	timedSliderChange(timedSliderValue) {
		if (timedSliderValue < 30 && !this.state.casualgame) {
			$(this.casualgame).click();
		}
		this.setState({ timedSliderValue });
	}

	eloSliderChange(eloSliderValue) {
		this.setState({ eloSliderValue });
	}

	renderEloSlider() {
		const { userInfo, userList } = this.props;
		if (!userList.list.length) {
			return null;
		}
		const player = userList.list.find(p => p.userName === userInfo.userName);
		const isSeason = !userInfo.gameSettings.disableSeasonal;
		const playerElo = player.eloSeason;
		const playerEloNonseason = player.eloOverall;

		if ((isSeason && playerElo && playerElo > 1675) || (playerEloNonseason && playerEloNonseason > 1675)) {
			return (
				<div className="sixteen wide column" style={{ marginTop: '-30px' }}>
					{this.state.isEloLimited && (
						<div>
							<h4 className="ui header">Minimum elo to sit in this game</h4>
							<Range
								onChange={this.eloSliderChange}
								min={1675}
								max={2300}
								defaultValue={[1675]}
								value={this.state.eloSliderValue}
								marks={{ 1675: '1675', 1800: '1800', 1900: '1900', 2000: '2000', 2300: '2300' }}
							/>
						</div>
					)}
					<div className="four wide column elorow" style={{ margin: '-50 auto 0' }}>
						<i className="big arrows alternate horizontal icon" />
						<h4 className="ui header">Elo limited game</h4>
						<div
							className="ui fitted toggle checkbox"
							ref={c => {
								this.elolimited = c;
							}}
						>
							<input type="checkbox" name="elolimited" defaultChecked={false} />
						</div>
					</div>
				</div>
			);
		}
	}

	render() {
		const { userInfo } = this.props;

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
						<div className="four wide column">
							<h4 className="ui header">Flag:</h4>
							{this.renderFlagDropdown()}
						</div>
						<div className="five wide column gamename">
							<h4 className="ui header">Game name:</h4>
							<div className="ui input">
								<input
									maxLength="20"
									placeholder="New Game"
									onKeyPress={e => {
										const { LEGALCHARACTERS } = require('../../constants');
										if (!LEGALCHARACTERS(e.key)) e.preventDefault();
									}}
								/>
							</div>
							{this.state.containsBadWord && <p className="contains-bad-word">This game name has a banned word or word fragment.</p>}
						</div>
						<div className="three wide column privategame">
							<h4 className="ui header">Private game</h4>
							<i className="big yellow lock icon" />
							<div
								className="ui fitted toggle checkbox private"
								ref={c => {
									this.privategame = c;
								}}
							>
								<input type="checkbox" name="privategame" defaultChecked={false} />
							</div>
						</div>
						{this.state.privateShowing && (
							<div className="four wide column ui input">
								<input
									className="password-input"
									maxLength="20"
									placeholder="Password"
									autoFocus
									ref={c => {
										this.privategamepassword = c;
									}}
								/>
							</div>
						)}
					</div>
					<div className="row slider">{this.renderPlayerSlider()}</div>
					<div className="row rebalance">{this.renderRebalanceCheckboxes()}</div>

					{/* <div className="row tourny-row">
						<div className="sixteen wide column tourny-container">
							<h4 className="ui header">Tournament mode</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.tournyconfirm = c;
								}}
							>
								<input type="checkbox" name="tournyconfirm" defaultChecked={false} />
							</div>
						</div>
					</div> */}
					{this.state.timedMode && (
						<div className="row timedmode-slider">
							<div className="sixteen wide column">
								<Range
									onChange={this.timedSliderChange}
									defaultValue={[120]}
									value={this.state.timedSliderValue}
									min={2}
									max={600}
									marks={{ 2: '2 seconds', 120: '2 minutes', 300: '5 minutes', 600: '10 minutes' }}
								/>
							</div>
						</div>
					)}
					<div className="row timedmode-check">
						<div className="sixteen wide column">
							{this.state.timedMode && (
								<span className="timed-slider-value">
									{(() => {
										const timeInSeconds = this.state.timedSliderValue[0];

										return `${Math.floor(timeInSeconds / 60)}: ${timeInSeconds % 60 < 10 ? `0${timeInSeconds % 60}` : timeInSeconds % 60}`;
									})()}
								</span>
							)}
							<i className="big hourglass half icon" />
							<h4 className="ui header">
								Timed mode - if a player does not make an action after a certain amount of time, that action is completed for them randomly.
							</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.timed = c;
								}}
							>
								<input type="checkbox" name="timedmode" defaultChecked={false} />
							</div>
						</div>
					</div>
					{this.props.userInfo.verified && (
						<div className="row verified-row">
							<div className="sixteen wide column">
								<i className="big thumbs up icon" style={{ color: 'tan !important' }} />
								<h4 className="ui header" style={{ color: 'tan' }}>
									Verified - only email-verified players can play in this game.
								</h4>
								<div
									className="ui fitted toggle checkbox"
									ref={c => {
										this.verified = c;
									}}
								>
									<input type="checkbox" name="verified" defaultChecked={false} />
								</div>
							</div>
						</div>
					)}
					{userInfo.gameSettings && !userInfo.gameSettings.disableElo && this.renderEloSlider()}
					<div className="row sliderrow">
						<div className="four wide column disablechat">
							<i className="big unmute icon" />
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
							<i className="big game icon" />
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
							<i className="big fast forward icon" />
							<h4 className="ui header">Speed mode - most animations and pauses greatly reduced and fewer gamechats</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.experiencedmode = c;
								}}
							>
								<input type="checkbox" name="experiencedmode" defaultChecked={true} />
							</div>
						</div>
						{(() => {
							let user, isRainbow;

							if (this.props.userList.list) {
								user = this.props.userList.list.find(user => user.userName === this.props.userInfo.userName);
							}
							if (user) {
								isRainbow = user.wins + user.losses > 49;
							}
							if (isRainbow) {
								return (
									<div className="four wide column experiencedmode">
										<img src="../images/rainbow.png" />
										<h4 className="ui header">Rainbow game - only fellow 50+ game veterans can be seated in this game</h4>
										<div
											className="ui fitted toggle checkbox"
											ref={c => {
												this.rainbowgame = c;
											}}
										>
											<input type="checkbox" name="rainbowgame" defaultChecked={false} />
										</div>
									</div>
								);
							}
						})()}
					</div>
					<div className="row">
						<div className="four wide column">
							<i className="big hide icon" />
							<h4 className="ui header">Blind mode - player's names are replaced with random animal names, anonymizing them.</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.blindmode = c;
								}}
							>
								<input type="checkbox" name="blindmode" defaultChecked={false} />
							</div>
						</div>
						{!this.state.isTourny && (
							<div className="four wide column">
								<i className="big talk icon" />
								<h4 className="ui header">Disable observer chat</h4>
								<div
									className="ui fitted toggle checkbox"
									ref={c => {
										this.disableobserver = c;
									}}
								>
									<input type="checkbox" name="disableobserver" defaultChecked={false} />
								</div>
							</div>
						)}
						<div className="four wide column">
							<i className="big handshake icon" />
							<h4 className="ui header">Casual game - this game will not count towards your wins and losses</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.casualgame = c;
								}}
							>
								<input type="checkbox" name="casualgame" defaultChecked={false} />
							</div>
						</div>
						{this.props.userInfo.gameSettings &&
							this.props.userInfo.gameSettings.isPrivate && (
								<div className="four wide column privateonlygame">
									<h4 className="ui header">Private only game - only other anonymous players can be seated.</h4>
									<div
										className="ui fitted toggle checkbox"
										ref={c => {
											this.privateonlygame = c;
										}}
									>
										<input type="checkbox" name="privateonlygame" defaultChecked={false} />
									</div>
								</div>
							)}
					</div>
				</div>

				<div className="ui grid centered footer">
					<div onClick={this.createNewGame} className="ui button primary">
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
