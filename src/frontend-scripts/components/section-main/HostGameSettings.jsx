import React from 'react';
import $ from 'jquery';
import Checkbox from 'semantic-ui-checkbox';
import blacklistedWords from '../../../../iso/blacklistwords';
import PropTypes from 'prop-types';

$.fn.checkbox = Checkbox;

export default class HostGameSettings extends React.Component {
	constructor() {
		super();
		this.hostUpdateTableSettings = this.hostUpdateTableSettings.bind(this);
		this.timedValueChange = this.timedValueChange.bind(this);
		this.eloValueChange = this.eloValueChange.bind(this);
		this.handleNameChange = this.handleNameChange.bind(this);
		this.toggleGameSettings = this.toggleGameSettings.bind(this);
		this.handlePasswordChange = this.handlePasswordChange.bind(this);
		this.state = {
			sliderValues: [5, 10],
			experiencedmode: false,
			voiceGame: false,
			disablegamechat: false,
			privateShowing: false,
			containsBadWord: false,
			rainbowgame: false,
			rebalance69p: true,
			checkedSliderValues: new Array(6).fill(true),
			checkedRebalanceValues: new Array(3).fill(true),
			isTourny: false,
			blindMode: false,
			flag: '',
			name: '',
			privategamepassword: '',
			disableobserver: false,
			casualGame: false,
			timedMode: false,
			timedValue: '00:02:00',
			eloLimited: false,
			eloValue: 1675
		};
	}

	componentWillMount() {
		const { gameInfo } = this.props;
		const { general } = gameInfo;
		let timeString;

		if (general.timedMode) {
			let seconds = general.timedMode;
			let minutes = Math.round(seconds / 60);
			seconds = seconds % 60;
			minutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
			seconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
			timeString = `00:${minutes}:${seconds}`;
		}

		this.setState({
			flag: general.flag,
			name: general.name,
			sliderValues: [general.minPlayersCount, general.maxPlayersCount],
			checkedSliderValues: this.state.checkedSliderValues.map((el, index) => {
				if (gameInfo.general.minPlayersCount > index + 5) {
					return false;
				} else if (gameInfo.general.maxPlayersCount < index + 5) {
					return false;
				} else {
					return !gameInfo.general.excludedPlayerCount.includes(index + 5) ? true : false;
				}
			}),
			experiencedmode: general.experiencedMode,
			voiceGame: general.voiceGame,
			disablegamechat: general.disableGamechat,
			rainbowgame: general.rainbowgame,
			privateShowing: general.private,
			blindMode: general.blindMode,
			disableobserver: general.disableObserver,
			casualGame: general.casualGame,
			timedMode: general.timedMode,
			timedValue: timeString ? timeString : '00:02:00',
			checkedRebalanceValues: [general.rebalance6p, general.rebalance7p, general.rebalance9p],
			eloLimited: general.eloMinimum ? true : false,
			eloValue: general.eloMinimum || 1675
		});
	}

	toggleGameSettings(value) {
		const data = {};
		data[value] = !this.state[value];
		this.setState(data);
	}

	componentDidMount() {
		$(this.flagDropdown).dropdown('set selected', this.state.flag);
	}

	timedValueChange(timedValue) {
		this.setState({ timedValue: timedValue.target.value });
	}

	eloValueChange(eloValue) {
		this.setState({ eloValue: eloValue.target.value });
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
							onChange={() => {
								rebalancedInputClick(index);
							}}
						/>
					</label>
				))}
			</div>
		);
	}

	hostUpdateTableSettings() {
		const { gameInfo } = this.props;
		let containsBadWord = false;

		blacklistedWords.forEach(word => {
			if (
				new RegExp(word, 'i').test(
					$('section.host-game-settings')
						.find('div.gamename input')
						.val()
				)
			) {
				containsBadWord = true;
			}
		});

		if (containsBadWord) {
			this.setState({ containsBadWord: true });
		} else {
			let seconds;
			if (this.state.timedMode) {
				const times = this.state.timedValue.split(':');
				const minutes = parseInt(times[1]);
				seconds = times[2] ? parseInt(times[2]) : 0;
				seconds += minutes * 60;
			}

			const data = {
				uid: gameInfo.general.uid,
				flag: $(this.flagDropdown)
					.find('input')
					.val(),
				name: this.state.name ? this.state.name : 'New Game',
				excludedPlayerCount: this.state.checkedSliderValues.map((el, index) => (el ? null : index + 5)).filter(el => el),
				minPlayersCount: this.state.sliderValues[0],
				maxPlayersCount: this.state.sliderValues[1],
				experiencedMode: this.state.experiencedmode,
				voiceGame: this.state.voiceGame,
				disableGamechat: this.state.disablegamechat,
				rainbowgame: this.state.rainbowgame,
				private: this.state.privateShowing ? this.state.privategamepassword : false,
				blindMode: this.state.blindMode,
				disableObserver: this.state.disableobserver,
				casualGame: this.state.casualGame,
				timedMode: this.state.timedMode ? seconds : false,
				rebalance6p: this.state.checkedRebalanceValues[0],
				rebalance7p: this.state.checkedRebalanceValues[1],
				rebalance9p: this.state.checkedRebalanceValues[2],
				eloMinimum: this.state.eloLimited ? parseInt(this.state.eloValue, 10) : false
			};

			if (data.maxPlayersCount < gameInfo.publicPlayersState.length) {
				// show warning about kicking players
				this.props.handleStoreTableSettings(data);
				this.props.handleOpenConfirmPrompt('Update Settings maxPlayers');
			} else if (data.rainbowgame === true && !gameInfo.general.rainbowgame) {
				this.props.handleStoreTableSettings(data);
				this.props.handleOpenConfirmPrompt('Update Settings rainbow');
			} else if (data.eloMinimum && gameInfo.general.eloMinimum !== data.eloMinimum) {
				this.props.handleStoreTableSettings(data);
				this.props.handleOpenConfirmPrompt('Update Settings eloMinimum');
			} else {
				this.props.handleEmitTableSettings(data);
			}

			this.props.handleCloseGameSettings();
		}
	}

	handleNameChange(e) {
		this.setState({
			name: e.target.value
		});
	}

	handlePasswordChange(e) {
		this.setState({
			privategamepassword: e.target.value
		});
	}

	renderFlagDropdown() {
		return (
			<div ref={e => (this.flagDropdown = e)} className="ui search selection dropdown flag">
				<input id="test" type="hidden" name="flag" />
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

	renderEloLimit() {
		const { userInfo, userList } = this.props;
		if (!userList.list.length) {
			return null;
		}
		const player = userList.list.find(p => p.userName === userInfo.userName);
		const isSeason = !userInfo.gameSettings.disableSeasonal;
		const playerElo = player.eloSeason;

		if (isSeason && playerElo && playerElo > 1675) {
			return (
				<div className="three wide column elo-limited">
					<h4 className="ui header">Elo Limit</h4>
					<div className="ui fitted toggle checkbox">
						<input type="checkbox" name="elo-limited" checked={this.state.eloLimited} onChange={() => this.toggleGameSettings('eloLimited')} />
						<label />
					</div>
					{this.state.eloLimited && (
						<div>
							<input
								type="number"
								id="elo"
								name="elo"
								placeholder="1675"
								min="1675"
								max={player.eloSeason}
								value={this.state.eloValue}
								onChange={this.eloValueChange}
							/>
							<span className="validity" />
						</div>
					)}
				</div>
			);
		}
	}

	render() {
		const sliderCheckboxClick = index => {
			const newSliderValues = this.state.checkedSliderValues.map((el, i) => (i === index ? !el : el)),
				includedPlayerCounts = newSliderValues.map((el, i) => (el ? i + 5 : null)).filter(el => el !== null),
				minPlayers = Math.min(...includedPlayerCounts),
				maxPlayers = Math.max(...includedPlayerCounts);

			this.setState({
				checkedSliderValues: newSliderValues,
				sliderValues: [minPlayers, maxPlayers]
			});
		};

		return (
			<section className="host-game-settings">
				<a onClick={this.props.handleCloseGameSettings}>
					<i className="host-settings remove icon" />
				</a>
				<div className="ui grid">
					<div className="row">
						<div className="five wide column flag">
							<h4 className="ui header">Flag:</h4>
							{this.renderFlagDropdown()}
						</div>
						<div className="four wide column gamename">
							<h4 className="ui header">Game name:</h4>
							<div className="ui input">
								<input maxLength="20" placeholder="New Game" value={this.state.name} onChange={this.handleNameChange} />
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
								<input type="checkbox" name="privategame" checked={this.state.privateShowing} onChange={() => this.toggleGameSettings('privateShowing')} />
								<label />
							</div>
						</div>
						{this.state.privateShowing && (
							<div className="four wide column ui input">
								<input
									className="password-input"
									maxLength="20"
									placeholder="Password"
									value={this.state.privategamepassword}
									onChange={this.handlePasswordChange}
									autoFocus
									ref={c => {
										this.privategamepassword = c;
									}}
								/>
							</div>
						)}
					</div>
					<div className="row slider">
						<div className="eight wide column centered slider">
							<h4 className="ui header">Number of players</h4>

							<div className="checkbox-container">
								{new Array(6).fill(true).map((el, index) => (
									<label key={index}>
										{index + 5}
										<br />
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
							<div className="row rebalance">{this.renderRebalanceCheckboxes()}</div>
						</div>
						{this.renderEloLimit()}
						<div className="four wide column timedmode-check">
							<i className="big hourglass half icon" />
							<h4 className="ui header">Timed mode</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.timed = c;
								}}
							>
								<input type="checkbox" name="timedmode" checked={this.state.timedMode} onChange={() => this.toggleGameSettings('timedMode')} />
								<label />
							</div>
							{this.state.timedMode && (
								<span className="timed-slider-value">
									<input className="time" type="time" value={this.state.timedValue} onChange={this.timedValueChange} min="00:00:02" max="00:10:00" step="1" />
									<span className="time validity" />
								</span>
							)}
						</div>
					</div>
					<div className="row sliderrow">
						<div className="four wide column voicegame">
							<i className="big unmute icon" />
							<h4 className="ui header">Voice Game</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.voiceGame = c;
								}}
							>
								<input type="checkbox" name="voiceGame" checked={this.state.voiceGame} onChange={() => this.toggleGameSettings('voiceGame')} />
								<label />
							</div>
						</div>
						<div className="four wide column disablegamechat">
							<i className="big game icon" />
							<h4 className="ui header">Disable game chats</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.disablegamechat = c;
								}}
							>
								<input
									type="checkbox"
									name="disablegamechat"
									checked={this.state.disablegamechat}
									onChange={() => this.toggleGameSettings('disablegamechat')}
								/>
								<label />
							</div>
						</div>
						<div className="four wide column experiencedmode">
							<i className="big fast forward icon" />
							<h4 className="ui header">Speed mode</h4>
							<div
								className="ui fitted toggle checkbox experiencedmode"
								ref={c => {
									this.experiencedmode = c;
								}}
							>
								<input
									type="checkbox"
									name="experiencedmode"
									checked={this.state.experiencedmode}
									onChange={() => this.toggleGameSettings('experiencedmode')}
								/>
								<label />
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
									<div className="four wide column rainbowgame">
										<img src="../images/rainbow.png" />
										<h4 className="ui header">Rainbow game</h4>
										<div
											className="ui fitted toggle checkbox rainbowgame"
											ref={c => {
												this.rainbowgame = c;
											}}
										>
											<input type="checkbox" name="rainbowgame" checked={this.state.rainbowgame} onChange={() => this.toggleGameSettings('rainbowgame')} />
											<label />
										</div>
									</div>
								);
							}
						})()}
					</div>
					<div className=" row">
						<div className="three wide column blindMode">
							<i className="big hide icon" />
							<h4 className="ui header">Blind mode</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.blindMode = c;
								}}
							>
								<input type="checkbox" name="blindMode" checked={this.state.blindMode} onChange={() => this.toggleGameSettings('blindMode')} />
								<label />
							</div>
						</div>
						<div className="five wide column disableobserver">
							<i className="big talk icon" />
							<h4 className="ui header">Disable Observer Chat</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.disableobserver = c;
								}}
							>
								<input
									type="checkbox"
									name="disableobserver"
									checked={this.state.disableobserver}
									onChange={() => this.toggleGameSettings('disableobserver')}
								/>
								<label />
							</div>
						</div>
						<div className="four wide column casualGame">
							<i className="big handshake icon" />
							<h4 className="ui header">Casual game</h4>
							<div
								className="ui fitted toggle checkbox"
								ref={c => {
									this.casualGame = c;
								}}
							>
								<input type="checkbox" name="casualGame" checked={this.state.casualGame} onChange={() => this.toggleGameSettings('casualGame')} />
								<label />
							</div>
						</div>
						<div className="four wide column">
							<div onClick={this.hostUpdateTableSettings} className="ui button primary">
								Update Game Settings
							</div>
						</div>
					</div>
				</div>
			</section>
		);
	}
}

HostGameSettings.propTypes = {
	socket: PropTypes.object,
	userInfo: PropTypes.object,
	userList: PropTypes.object,
	gameInfo: PropTypes.object
};
