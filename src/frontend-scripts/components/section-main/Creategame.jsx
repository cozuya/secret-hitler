import React from 'react';
import Switch from 'react-switch';
import Select from 'react-select';
import { Range } from 'rc-slider';
import blacklistedWords from '../../../../iso/blacklistwords';
import PropTypes from 'prop-types';
import * as Swal from 'sweetalert2';

export default class Creategame extends React.Component {
	constructor(props) {
		super(props);

		let isRainbow = false;
		let user;
		if (this.props.userList.list) {
			user = this.props.userList.list.find(user => user.userName === this.props.userInfo.userName);
		}
		if (user) {
			isRainbow = user.wins + user.losses > 49;
		}

		this.state = {
			gameName: '',
			gameType: 'ranked',
			sliderValues: [7, 7],
			experiencedmode: true,
			disablechat: false,
			disablegameChat: false,
			disableobserverlobby: false,
			disableobserver: false,
			privateShowing: false,
			password: '',
			containsBadWord: false,
			rainbowgame: isRainbow,
			checkedSliderValues: [false, false, true, false, false, false],
			checkedRebalanceValues: [true, false, true],
			privateonlygame: false,
			unlistedGame: false,
			isTourny: false,
			blindMode: false,
			timedMode: false,
			isVerifiedOnly: props.userInfo.verified && !isRainbow,
			timedSliderValue: [120],
			customGameSliderValue: [7],
			eloSliderValue: [1600],
			isEloLimited: false,
			flappyMode: false,
			flappyOnlyMode: false,
			customGameSettings: {
				enabled: false,
				// Valid powers: investigate, deckpeek, election, bullet; null for no power
				powers: [null, null, null, null, null], // last "power" is always a fas victory
				hitlerZone: 3, // 1-5
				vetoZone: 5, // 1-5, must be larger than fas track state
				fascistCount: 1, // 1-3, does not include hit
				hitKnowsFas: false,
				deckState: { lib: 6, fas: 11 }, // includes tracks cards; 6 deck + 1 track = 5 in deck
				trackState: { lib: 0, fas: 0 },
				fasCanShootHit: false
			}
		};
	}

	renderFlagDropdown() {
		const options = [
			{ value: 'none', label: 'None' },
			{ value: 'us', label: 'United States' },
			{ value: 'ca', label: 'Canada' },
			{ value: 'de', label: 'Germany' },
			{ value: 'gb', label: 'United Kingdom' },
			{ value: 'au', label: 'Australia' },
			{ value: 'af', label: 'Afghanistan' },
			{ value: 'ax', label: 'Aland Islands' },
			{ value: 'al', label: 'Albania' },
			{ value: 'dz', label: 'Algeria' },
			{ value: 'as', label: 'American Samoa' },
			{ value: 'ad', label: 'Andorra' },
			{ value: 'ao', label: 'Angola' },
			{ value: 'ai', label: 'Anguilla' },
			{ value: 'ag', label: 'Antigua' },
			{ value: 'ar', label: 'Argentina' },
			{ value: 'am', label: 'Armenia' },
			{ value: 'aw', label: 'Aruba' },
			{ value: 'at', label: 'Austria' },
			{ value: 'az', label: 'Azerbaijan' },
			{ value: 'bs', label: 'Bahamas' },
			{ value: 'bh', label: 'Bahrain' },
			{ value: 'bd', label: 'Bangladesh' },
			{ value: 'bb', label: 'Barbados' },
			{ value: 'by', label: 'Belarus' },
			{ value: 'be', label: 'Belgium' },
			{ value: 'bz', label: 'Belize' },
			{ value: 'bj', label: 'Benin' },
			{ value: 'bm', label: 'Bermuda' },
			{ value: 'bt', label: 'Bhutan' },
			{ value: 'bo', label: 'Bolivia' },
			{ value: 'ba', label: 'Bosnia' },
			{ value: 'bw', label: 'Botswana' },
			{ value: 'bv', label: 'Bouvet Island' },
			{ value: 'br', label: 'Brazil' },
			{ value: 'vg', label: 'British Virgin Islands' },
			{ value: 'bn', label: 'Brunei' },
			{ value: 'bg', label: 'Bulgaria' },
			{ value: 'bf', label: 'Burkina Faso' },
			{ value: 'mm', label: 'Burma' },
			{ value: 'bi', label: 'Burundi' },
			{ value: 'tc', label: 'Caicos Islands' },
			{ value: 'kh', label: 'Cambodia' },
			{ value: 'cm', label: 'Cameroon' },
			{ value: 'cn', label: 'China' },
			{ value: 'cv', label: 'Cape Verde' },
			{ value: 'ky', label: 'Cayman Islands' },
			{ value: 'cf', label: 'Central African Republic' },
			{ value: 'td', label: 'Chad' },
			{ value: 'cl', label: 'Chile' },
			{ value: 'cx', label: 'Christmas Island' },
			{ value: 'cc', label: 'Cocos Islands' },
			{ value: 'co', label: 'Colombia' },
			{ value: 'km', label: 'Comoros' },
			{ value: 'cg', label: 'Congo Brazzaville' },
			{ value: 'cd', label: 'Congo' },
			{ value: 'ck', label: 'Cook Islands' },
			{ value: 'cr', label: 'Costa Rica' },
			{ value: 'ci', label: 'Cote Divoire' },
			{ value: 'hr', label: 'Croatia' },
			{ value: 'cu', label: 'Cuba' },
			{ value: 'cy', label: 'Cyprus' },
			{ value: 'cz', label: 'Czech Republic' },
			{ value: 'dk', label: 'Denmark' },
			{ value: 'dj', label: 'Djibouti' },
			{ value: 'dm', label: 'Dominica' },
			{ value: 'do', label: 'Dominican Republic' },
			{ value: 'ec', label: 'Ecuador' },
			{ value: 'eg', label: 'Egypt' },
			{ value: 'sv', label: 'El Salvador' },
			{ value: 'gq', label: 'Equatorial Guinea' },
			{ value: 'er', label: 'Eritrea' },
			{ value: 'ee', label: 'Estonia' },
			{ value: 'et', label: 'Ethiopia' },
			{ value: 'eu', label: 'European Union' },
			{ value: 'fk', label: 'Falkland Islands' },
			{ value: 'fo', label: 'Faroe Islands' },
			{ value: 'fj', label: 'Fiji' },
			{ value: 'fi', label: 'Finland' },
			{ value: 'fr', label: 'France' },
			{ value: 'gf', label: 'French Guiana' },
			{ value: 'pf', label: 'French Polynesia' },
			{ value: 'tf', label: 'French Territories' },
			{ value: 'ga', label: 'Gabon' },
			{ value: 'gm', label: 'Gambia' },
			{ value: 'ge', label: 'Georgia' },
			{ value: 'gh', label: 'Ghana' },
			{ value: 'gi', label: 'Gibraltar' },
			{ value: 'gr', label: 'Greece' },
			{ value: 'gl', label: 'Greenland' },
			{ value: 'gd', label: 'Grenada' },
			{ value: 'gp', label: 'Guadeloupe' },
			{ value: 'gu', label: 'Guam' },
			{ value: 'gt', label: 'Guatemala' },
			{ value: 'gw', label: 'Guinea-Bissau' },
			{ value: 'gn', label: 'Guinea' },
			{ value: 'gy', label: 'Guyana' },
			{ value: 'ht', label: 'Haiti' },
			{ value: 'hm', label: 'Heard Island' },
			{ value: 'hn', label: 'Honduras' },
			{ value: 'hk', label: 'Hong Kong' },
			{ value: 'hu', label: 'Hungary' },
			{ value: 'is', label: 'Iceland' },
			{ value: 'in', label: 'India' },
			{ value: 'io', label: 'Indian Ocean Territory' },
			{ value: 'id', label: 'Indonesia' },
			{ value: 'ir', label: 'Iran' },
			{ value: 'iq', label: 'Iraq' },
			{ value: 'ie', label: 'Ireland' },
			{ value: 'il', label: 'Israel' },
			{ value: 'it', label: 'Italy' },
			{ value: 'jm', label: 'Jamaica' },
			{ value: 'jp', label: 'Japan' },
			{ value: 'jo', label: 'Jordan' },
			{ value: 'kz', label: 'Kazakhstan' },
			{ value: 'ke', label: 'Kenya' },
			{ value: 'ki', label: 'Kiribati' },
			{ value: 'kw', label: 'Kuwait' },
			{ value: 'kg', label: 'Kyrgyzstan' },
			{ value: 'la', label: 'Laos' },
			{ value: 'lv', label: 'Latvia' },
			{ value: 'lb', label: 'Lebanon' },
			{ value: 'ls', label: 'Lesotho' },
			{ value: 'lr', label: 'Liberia' },
			{ value: 'ly', label: 'Libya' },
			{ value: 'li', label: 'Liechtenstein' },
			{ value: 'lt', label: 'Lithuania' },
			{ value: 'lu', label: 'Luxembourg' },
			{ value: 'mo', label: 'Macau' },
			{ value: 'mk', label: 'Macedonia' },
			{ value: 'mg', label: 'Madagascar' },
			{ value: 'mw', label: 'Malawi' },
			{ value: 'my', label: 'Malaysia' },
			{ value: 'mv', label: 'Maldives' },
			{ value: 'ml', label: 'Mali' },
			{ value: 'mt', label: 'Malta' },
			{ value: 'mh', label: 'Marshall Islands' },
			{ value: 'mq', label: 'Martinique' },
			{ value: 'mr', label: 'Mauritania' },
			{ value: 'mu', label: 'Mauritius' },
			{ value: 'yt', label: 'Mayotte' },
			{ value: 'mx', label: 'Mexico' },
			{ value: 'fm', label: 'Micronesia' },
			{ value: 'md', label: 'Moldova' },
			{ value: 'mc', label: 'Monaco' },
			{ value: 'mn', label: 'Mongolia' },
			{ value: 'me', label: 'Montenegro' },
			{ value: 'ms', label: 'Montserrat' },
			{ value: 'ma', label: 'Morocco' },
			{ value: 'mz', label: 'Mozambique' },
			{ value: 'na', label: 'Namibia' },
			{ value: 'nr', label: 'Nauru' },
			{ value: 'np', label: 'Nepal' },
			{ value: 'an', label: 'Netherlands Antilles' },
			{ value: 'nl', label: 'Netherlands' },
			{ value: 'nc', label: 'New Caledonia' },
			{ value: 'pg', label: 'New Guinea' },
			{ value: 'nz', label: 'New Zealand' },
			{ value: 'ni', label: 'Nicaragua' },
			{ value: 'ne', label: 'Niger' },
			{ value: 'ng', label: 'Nigeria' },
			{ value: 'nu', label: 'Niue' },
			{ value: 'nf', label: 'Norfolk Island' },
			{ value: 'kp', label: 'North Korea' },
			{ value: 'mp', label: 'Northern Mariana Islands' },
			{ value: 'no', label: 'Norway' },
			{ value: 'om', label: 'Oman' },
			{ value: 'pk', label: 'Pakistan' },
			{ value: 'pw', label: 'Palau' },
			{ value: 'ps', label: 'Palestine' },
			{ value: 'pa', label: 'Panama' },
			{ value: 'py', label: 'Paraguay' },
			{ value: 'pe', label: 'Peru' },
			{ value: 'ph', label: 'Philippines' },
			{ value: 'pn', label: 'Pitcairn Islands' },
			{ value: 'pl', label: 'Poland' },
			{ value: 'pt', label: 'Portugal' },
			{ value: 'pr', label: 'Puerto Rico' },
			{ value: 'qa', label: 'Qatar' },
			{ value: 're', label: 'Reunion' },
			{ value: 'ro', label: 'Romania' },
			{ value: 'ru', label: 'Russia' },
			{ value: 'rw', label: 'Rwanda' },
			{ value: 'sh', label: 'Saint Helena' },
			{ value: 'kn', label: 'Saint Kitts and Nevis' },
			{ value: 'lc', label: 'Saint Lucia' },
			{ value: 'pm', label: 'Saint Pierre' },
			{ value: 'vc', label: 'Saint Vincent' },
			{ value: 'ws', label: 'Samoa' },
			{ value: 'sm', label: 'San Marino' },
			{ value: 'gs', label: 'Sandwich Islands' },
			{ value: 'st', label: 'Sao Tome' },
			{ value: 'sa', label: 'Saudi Arabia' },
			{ value: 'gb sct', label: 'Scotland' },
			{ value: 'sn', label: 'Senegal' },
			{ value: 'cs', label: 'Serbia' },
			{ value: 'rs', label: 'Serbia' },
			{ value: 'sc', label: 'Seychelles' },
			{ value: 'sl', label: 'Sierra Leone' },
			{ value: 'sg', label: 'Singapore' },
			{ value: 'sk', label: 'Slovakia' },
			{ value: 'si', label: 'Slovenia' },
			{ value: 'sb', label: 'Solomon Islands' },
			{ value: 'so', label: 'Somalia' },
			{ value: 'za', label: 'South Africa' },
			{ value: 'kr', label: 'South Korea' },
			{ value: 'es', label: 'Spain' },
			{ value: 'lk', label: 'Sri Lanka' },
			{ value: 'sd', label: 'Sudan' },
			{ value: 'sr', label: 'Suriname' },
			{ value: 'sj', label: 'Svalbard' },
			{ value: 'sz', label: 'Swaziland' },
			{ value: 'se', label: 'Sweden' },
			{ value: 'ch', label: 'Switzerland' },
			{ value: 'sy', label: 'Syria' },
			{ value: 'tw', label: 'Taiwan' },
			{ value: 'tj', label: 'Tajikistan' },
			{ value: 'tz', label: 'Tanzania' },
			{ value: 'th', label: 'Thailand' },
			{ value: 'tl', label: 'Timorleste' },
			{ value: 'tg', label: 'Togo' },
			{ value: 'tk', label: 'Tokelau' },
			{ value: 'to', label: 'Tonga' },
			{ value: 'tt', label: 'Trinidad' },
			{ value: 'tn', label: 'Tunisia' },
			{ value: 'tr', label: 'Turkey' },
			{ value: 'tm', label: 'Turkmenistan' },
			{ value: 'tv', label: 'Tuvalu' },
			{ value: 'ug', label: 'Uganda' },
			{ value: 'ua', label: 'Ukraine' },
			{ value: 'ae', label: 'United Arab Emirates' },
			{ value: 'uy', label: 'Uruguay' },
			{ value: 'um', label: 'Us Minor Islands' },
			{ value: 'vi', label: 'Us Virgin Islands' },
			{ value: 'uz', label: 'Uzbekistan' },
			{ value: 'vu', label: 'Vanuatu' },
			{ value: 'va', label: 'Vatican City' },
			{ value: 've', label: 'Venezuela' },
			{ value: 'vn', label: 'Vietnam' },
			{ value: 'gb wls', label: 'Wales' },
			{ value: 'wf', label: 'Wallis and Futuna' },
			{ value: 'eh', label: 'Western Sahara' },
			{ value: 'ye', label: 'Yemen' },
			{ value: 'zm', label: 'Zambia' },
			{ value: 'zw', label: 'Zimbabwe' }
		];

		const style = {
			option: (styles, state) => ({
				...styles,
				backgroundColor: state.isSelected ? 'rgba(127, 65, 225, 0.75)' : state.isFocused ? 'rgba(98, 124, 200, 0.1)' : null,
				color: 'black',
				padding: '5px',
				fontWeight: state.isSelected ? 'bold' : null
			})
		};

		const findValue = val => {
			for (const value of options) {
				if (val === value.value) {
					return value;
				}
			}
		};

		return (
			<Select
				defaultValue={options[0]}
				options={options}
				styles={style}
				value={findValue(this.state.flag)}
				onChange={(inputValue, action) => this.setState({ flag: inputValue.value })}
				menuPlacement={'auto'}
				isSearchable={true}
				menuShouldScrollIntoView={true}
			/>
		);
	}

	renderGameTypeDropdown() {
		const options = [
			{
				value: 'ranked',
				label: (
					<>
						<span title="A normal ranked game, counts for winrate and Elo">Ranked</span>
					</>
				)
			},
			{
				value: 'casual',
				label: (
					<>
						<span title="A casual game, gameplay rules are not enforced, does not count for winrate or Elo">Casual</span>
					</>
				)
			},
			{
				value: 'practice',
				label: (
					<>
						<span title="A practice game, gameplay rules ARE enforced, does not count for winrate or Elo">Practice</span>
					</>
				)
			},
			{
				value: 'custom',
				label: (
					<>
						<span title="A game with custom gameplay settings, gameplay rules are not enforced, does not count for winrate or Elo">Custom</span>
					</>
				)
			}
		];

		const style = {
			option: (styles, state) => ({
				...styles,
				backgroundColor: state.isSelected ? 'rgba(127, 65, 225, 0.75)' : state.isFocused ? 'rgba(98, 124, 200, 0.1)' : null,
				color: 'black',
				padding: '5px',
				fontWeight: state.isSelected ? 'bold' : null
			})
		};

		const findValue = val => {
			for (const value of options) {
				if (val === value.value) {
					return value;
				}
			}

			if (val === 'private') {
				return {
					value: 'private',
					label: (
						<>
							<span title="A private game with a password, gameplay rules are not enforced, does not count for winrate or Elo">Private</span>
						</>
					)
				};
			}
		};

		return (
			<Select
				defaultValue={options[0]}
				options={
					this.state.privateShowing || this.state.privateonlygame
						? [
								{
									value: 'private',
									label: (
										<>
											<span title="A private game with a password, gameplay rules are not enforced, does not count for winrate or Elo">Private</span>
										</>
									)
								},
								options[3]
						  ]
						: options
				}
				styles={style}
				value={findValue(this.state.gameType)}
				onChange={(inputValue, action) => {
					this.setState({
						gameType: inputValue.value,
						customGameSettings: { ...this.state.customGameSettings, enabled: inputValue.value === 'custom' }
					});
				}}
				menuPlacement={'auto'}
				isDisabled={this.state.unlistedGame || this.state.customGameSettings.enabled}
				menuShouldScrollIntoView={true}
			/>
		);
	}

	powerPicker(slot) {
		const options = [
			{ value: 'null', label: 'No Power' },
			{ value: 'investigate', label: 'Investigate' },
			{ value: 'deckpeek', label: 'Deck Peek' },
			{ value: 'election', label: 'Special Election' },
			{ value: 'bullet', label: 'Bullet' },
			{ value: 'reverseinv', label: 'Show Loyalty' },
			{ value: 'peekdrop', label: 'Peek & Drop' }
		];

		const style = {
			option: (styles, state) => ({
				...styles,
				backgroundColor: state.isSelected ? 'rgba(127, 65, 225, 0.75)' : state.isFocused ? 'rgba(98, 124, 200, 0.1)' : null,
				color: 'black',
				padding: '5px',
				fontWeight: state.isSelected ? 'bold' : null
			})
		};

		const findValue = val => {
			for (const value of options) {
				if (val === value.value) {
					return value;
				}
			}
		};

		return (
			<Select
				defaultValue={options[0]}
				options={options}
				styles={style}
				value={findValue(this.state.customGameSettings.powers[slot])}
				onChange={(inputValue, action) => {
					const newPowerList = this.state.customGameSettings.powers;
					newPowerList[slot] = inputValue.value;
					this.setState({ customGameSettings: Object.assign(this.state.customGameSettings, { powers: newPowerList }) });
				}}
				defaultMenuIsOpen={true}
				menuShouldScrollIntoView={true}
			/>
		);
	}

	presetSelector(preset) {
		let isRainbow = false;
		let user;
		if (this.props.userList.list) {
			user = this.props.userList.list.find(user => user.userName === this.props.userInfo.userName);
		}
		if (user) {
			isRainbow = user.wins + user.losses > 49;
		}

		switch (preset) {
			case 'Meoww':
				this.setState({
					gameName: 'Meoww',
					gameType: 'ranked',
					sliderValues: [5, 5],
					experiencedmode: true,
					disablechat: false,
					disablegameChat: false,
					disableobserverlobby: true,
					disableobserver: true,
					privateShowing: false,
					containsBadWord: false,
					rainbowgame: true,
					checkedSliderValues: [true, false, false, false, false, false],
					checkedRebalanceValues: [false, false, false],
					privateonlygame: false,
					unlistedGame: false,
					isTourny: false,
					blindMode: false,
					timedMode: false,
					isVerifiedOnly: !isRainbow,
					timedSliderValue: [120],
					customGameSliderValue: [7],
					eloSliderValue: [1700],
					isEloLimited: true,
					customGameSettings: {
						enabled: false,
						// Valid powers: investigate, deckpeek, election, bullet; null for no power
						powers: [null, null, null, null, null], // last "power" is always a fas victory
						hitlerZone: 3, // 1-5
						vetoZone: 5, // 1-5, must be larger than fas track state
						fascistCount: 1, // 1-3, does not include hit
						hitKnowsFas: false,
						fasCanShootHit: false,
						deckState: { lib: 6, fas: 11 }, // includes tracks cards; 6 deck + 1 track = 5 in deck
						trackState: { lib: 0, fas: 0 }
					}
				});
				break;
			case 'High ELO':
				this.setState({
					gameName: 'High ELO',
					gameType: 'ranked',
					sliderValues: [7, 7],
					experiencedmode: true,
					disablechat: false,
					disablegameChat: false,
					disableobserverlobby: true,
					disableobserver: true,
					privateShowing: false,
					containsBadWord: false,
					rainbowgame: true,
					checkedSliderValues: [false, false, true, false, false, false],
					checkedRebalanceValues: [false, false, false],
					privateonlygame: false,
					unlistedGame: false,
					isTourny: false,
					blindMode: false,
					timedMode: false,
					isVerifiedOnly: !isRainbow,
					timedSliderValue: [120],
					customGameSliderValue: [7],
					eloSliderValue: [1700],
					isEloLimited: true,
					customGameSettings: {
						enabled: false,
						// Valid powers: investigate, deckpeek, election, bullet; null for no power
						powers: [null, null, null, null, null], // last "power" is always a fas victory
						hitlerZone: 3, // 1-5
						vetoZone: 5, // 1-5, must be larger than fas track state
						fascistCount: 1, // 1-3, does not include hit
						hitKnowsFas: false,
						fasCanShootHit: false,
						deckState: { lib: 6, fas: 11 }, // includes tracks cards; 6 deck + 1 track = 5 in deck
						trackState: { lib: 0, fas: 0 }
					}
				});
				break;
			case 'Gun Game':
				this.setState({
					gameName: 'Gun Game',
					gameType: 'custom',
					sliderValues: [7, 7],
					experiencedmode: true,
					disablechat: false,
					disablegameChat: false,
					disableobserverlobby: false,
					disableobserver: false,
					privateShowing: false,
					containsBadWord: false,
					rainbowgame: true,
					checkedSliderValues: [false, false, true, false, false, false],
					checkedRebalanceValues: [false, false, false],
					privateonlygame: false,
					unlistedGame: false,
					isTourny: false,
					blindMode: false,
					timedMode: false,
					isVerifiedOnly: !isRainbow,
					timedSliderValue: [120],
					customGameSliderValue: [7],
					eloSliderValue: [1600],
					isEloLimited: false,
					customGameSettings: {
						enabled: true,
						// Valid powers: investigate, deckpeek, election, bullet; null for no power
						powers: ['bullet', 'bullet', 'bullet', 'bullet', 'bullet'], // last "power" is always a fas victory
						hitlerZone: 4, // 1-5
						vetoZone: 5, // 1-5, must be larger than fas track state
						fascistCount: 1, // 1-3, does not include hit
						hitKnowsFas: false,
						fasCanShootHit: false,
						deckState: { lib: 6, fas: 13 }, // includes tracks cards; 6 deck + 1 track = 5 in deck
						trackState: { lib: 0, fas: 0 }
					}
				});
				break;
			case '2R1H':
				this.setState({
					gameName: '2 Rooms 1 Hitler',
					gameType: 'casual',
					sliderValues: [7, 7],
					experiencedmode: true,
					disablechat: true,
					disablegameChat: false,
					disableobserverlobby: false,
					disableobserver: true,
					privateShowing: false,
					password: '',
					containsBadWord: false,
					rainbowgame: true,
					checkedSliderValues: [false, false, true, false, false, false],
					checkedRebalanceValues: [false, false, false],
					privateonlygame: false,
					unlistedGame: true,
					isTourny: false,
					blindMode: false,
					timedMode: false,
					isVerifiedOnly: !isRainbow,
					timedSliderValue: [120],
					customGameSliderValue: [7],
					eloSliderValue: [1600],
					isEloLimited: false,
					customGameSettings: {
						enabled: false,
						// Valid powers: investigate, deckpeek, election, bullet; null for no power
						powers: [null, null, null, null, null], // last "power" is always a fas victory
						hitlerZone: 3, // 1-5
						vetoZone: 5, // 1-5, must be larger than fas track state
						fascistCount: 1, // 1-3, does not include hit
						hitKnowsFas: false,
						fasCanShootHit: false,
						deckState: { lib: 6, fas: 11 }, // includes tracks cards; 6 deck + 1 track = 5 in deck
						trackState: { lib: 0, fas: 0 }
					}
				});
				break;
			case 'Silent Game':
				this.setState({
					gameName: 'Silent Game',
					gameType: 'casual',
					sliderValues: [7, 7],
					experiencedmode: true,
					disablechat: true,
					disablegameChat: false,
					disableobserverlobby: true,
					disableobserver: true,
					privateShowing: false,
					password: '',
					containsBadWord: false,
					rainbowgame: true,
					checkedSliderValues: [false, false, true, false, false, false],
					checkedRebalanceValues: [false, false, false],
					privateonlygame: false,
					unlistedGame: false,
					isTourny: false,
					blindMode: false,
					timedMode: false,
					isVerifiedOnly: !isRainbow,
					timedSliderValue: [120],
					customGameSliderValue: [7],
					eloSliderValue: [1600],
					isEloLimited: false,
					customGameSettings: {
						enabled: false,
						// Valid powers: investigate, deckpeek, election, bullet; null for no power
						powers: [null, null, null, null, null], // last "power" is always a fas victory
						hitlerZone: 3, // 1-5
						vetoZone: 5, // 1-5, must be larger than fas track state
						fascistCount: 1, // 1-3, does not include hit
						hitKnowsFas: false,
						fasCanShootHit: false,
						deckState: { lib: 6, fas: 11 }, // includes tracks cards; 6 deck + 1 track = 5 in deck
						trackState: { lib: 0, fas: 0 }
					}
				});
				break;
			case 'Tourney Game':
				this.setState({
					gameName: 'Tourney Game ',
					gameType: 'casual',
					sliderValues: [7, 7],
					experiencedmode: true,
					disablechat: false,
					disablegameChat: false,
					disableobserverlobby: true,
					disableobserver: true,
					privateShowing: false,
					password: '',
					containsBadWord: false,
					rainbowgame: true,
					checkedSliderValues: [false, false, true, false, false, false],
					checkedRebalanceValues: [false, false, false],
					privateonlygame: false,
					unlistedGame: true,
					isTourny: false,
					blindMode: false,
					timedMode: false,
					isVerifiedOnly: false,
					timedSliderValue: [120],
					customGameSliderValue: [7],
					eloSliderValue: [1600],
					isEloLimited: false,
					customGameSettings: {
						enabled: false,
						// Valid powers: investigate, deckpeek, election, bullet; null for no power
						powers: [null, null, null, null, null], // last "power" is always a fas victory
						hitlerZone: 3, // 1-5
						vetoZone: 5, // 1-5, must be larger than fas track state
						fascistCount: 1, // 1-3, does not include hit
						hitKnowsFas: false,
						fasCanShootHit: false,
						deckState: { lib: 6, fas: 11 }, // includes tracks cards; 6 deck + 1 track = 5 in deck
						trackState: { lib: 0, fas: 0 }
					}
				});
				break;
			case 'Inv Game':
				this.setState({
					gameName: 'Investigation Game',
					gameType: 'custom',
					sliderValues: [7, 7],
					experiencedmode: true,
					disablechat: false,
					disablegameChat: false,
					disableobserverlobby: false,
					disableobserver: false,
					privateShowing: false,
					password: '',
					containsBadWord: false,
					rainbowgame: true,
					checkedSliderValues: [false, false, true, false, false, false],
					checkedRebalanceValues: [false, false, false],
					privateonlygame: false,
					unlistedGame: false,
					isTourny: false,
					blindMode: false,
					timedMode: false,
					isVerifiedOnly: !isRainbow,
					timedSliderValue: [120],
					customGameSliderValue: [7],
					eloSliderValue: [1600],
					isEloLimited: false,
					customGameSettings: {
						enabled: true,
						// Valid powers: investigate, deckpeek, election, bullet; null for no power
						powers: ['investigate', 'reverseinv', 'investigate', 'reverseinv', 'investigate'], // last "power" is always a fas victory
						hitlerZone: 3, // 1-5
						vetoZone: 5, // 1-5, must be larger than fas track state
						fascistCount: 1, // 1-3, does not include hit
						hitKnowsFas: false,
						fasCanShootHit: false,
						deckState: { lib: 6, fas: 15 }, // includes tracks cards; 6 deck + 1 track = 5 in deck
						trackState: { lib: 0, fas: 0 }
					}
				});
				break;
			case 'Trivia Mode':
				this.setState({
					gameName: 'Trivia Mode',
					gameType: 'custom',
					sliderValues: [7, 7],
					experiencedmode: true,
					disablechat: false,
					disablegameChat: false,
					disableobserverlobby: false,
					disableobserver: false,
					privateShowing: false,
					password: '',
					containsBadWord: false,
					rainbowgame: true,
					checkedSliderValues: [false, false, true, false, false, false],
					checkedRebalanceValues: [false, false, false],
					privateonlygame: false,
					unlistedGame: false,
					isTourny: false,
					blindMode: false,
					timedMode: false,
					isVerifiedOnly: false,
					timedSliderValue: [120],
					customGameSliderValue: [7],
					eloSliderValue: [1600],
					isEloLimited: false,
					customGameSettings: {
						enabled: true,
						// Valid powers: investigate, deckpeek, election, bullet; null for no power
						powers: ['bullet', 'bullet', 'bullet', 'bullet', 'bullet'], // last "power" is always a fas victory
						hitlerZone: 4, // 1-5
						vetoZone: 5, // 1-5, must be larger than fas track state
						fascistCount: 2, // 1-3, does not include hit
						hitKnowsFas: true,
						fasCanShootHit: true,
						deckState: { lib: 6, fas: 19 }, // includes tracks cards; 6 deck + 1 track = 5 in deck
						trackState: { lib: 0, fas: 0 }
					}
				});
				break;
			case 'Reset':
				this.setState({
					gameName: '',
					gameType: 'ranked',
					sliderValues: [7, 7],
					experiencedmode: true,
					disablechat: false,
					disablegameChat: false,
					disableobserverlobby: false,
					disableobserver: false,
					privateShowing: false,
					password: '',
					containsBadWord: false,
					rainbowgame: isRainbow,
					checkedSliderValues: [false, false, true, false, false, false],
					checkedRebalanceValues: [true, false, true],
					privateonlygame: false,
					unlistedGame: false,
					isTourny: false,
					blindMode: false,
					timedMode: false,
					isVerifiedOnly: !isRainbow,
					timedSliderValue: [120],
					customGameSliderValue: [7],
					eloSliderValue: [1600],
					isEloLimited: false,
					customGameSettings: {
						enabled: false,
						// Valid powers: investigate, deckpeek, election, bullet; null for no power
						powers: [null, null, null, null, null], // last "power" is always a fas victory
						hitlerZone: 3, // 1-5
						vetoZone: 5, // 1-5, must be larger than fas track state
						fascistCount: 1, // 1-3, does not include hit
						hitKnowsFas: false,
						fasCanShootHit: false,
						deckState: { lib: 6, fas: 11 }, // includes tracks cards; 6 deck + 1 track = 5 in deck
						trackState: { lib: 0, fas: 0 }
					}
				});
		}
	}

	sliderNumFas = val => {
		const { customGameSettings } = this.state;

		customGameSettings.fascistCount = val[0];
		customGameSettings.enabled = true;
		this.setState({ gameType: 'custom', customGameSettings });
	};

	sliderHitlerZone = val => {
		const { customGameSettings } = this.state;
		customGameSettings.hitlerZone = val[0];
		customGameSettings.enabled = true;
		this.setState({ gameType: 'custom', customGameSettings });
	};

	sliderVetoZone = val => {
		const { customGameSettings } = this.state;
		customGameSettings.vetoZone = val[0];
		customGameSettings.enabled = true;
		this.setState({ gameType: 'custom', customGameSettings });
	};

	sliderDeckLib = val => {
		const { customGameSettings } = this.state;
		customGameSettings.deckState.lib = val[0];
		customGameSettings.enabled = true;
		this.setState({ gameType: 'custom', customGameSettings });
	};

	sliderDeckFas = val => {
		const { customGameSettings } = this.state;
		customGameSettings.deckState.fas = val[0];
		customGameSettings.enabled = true;
		this.setState({ gameType: 'custom', customGameSettings });
	};

	sliderTrackLib = val => {
		const { customGameSettings } = this.state;
		customGameSettings.trackState.lib = val[0];
		customGameSettings.enabled = true;
		this.setState({ gameType: 'custom', customGameSettings });
	};

	sliderTrackFas = val => {
		const { customGameSettings } = this.state;
		customGameSettings.trackState.fas = val[0];
		customGameSettings.enabled = true;
		this.setState({ gameType: 'custom', customGameSettings });
	};

	sliderChange = sliderValues => {
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
	};

	customGameSliderChange = sliderValues => {
		this.sliderChange(sliderValues);
		this.setState({
			customGameSliderValue: sliderValues
		});
	};

	createNewGame = () => {
		const { userInfo } = this.props;
		const { customGameSettings, customGameSliderValue } = this.state;

		if (userInfo.gameSettings.isPrivate && !this.state.privateShowing) {
			return;
		}

		if (this.state.containsBadWord) {
			return;
		} else if (userInfo.gameSettings && userInfo.gameSettings.unbanTime && new Date(userInfo.gameSettings.unbanTime) > new Date()) {
			Swal.fire('Sorry, this service is currently unavailable.');
		} else {
			const excludedPlayerCount = this.state.checkedSliderValues.map((el, index) => (el ? null : index + 5)).filter(el => el);
			const data = {
				gameName: this.state.gameName || 'New Game',
				gameType: this.state.gameType,
				flag: this.state.flag || 'none',
				minPlayersCount: customGameSettings.enabled ? customGameSliderValue[0] : this.state.sliderValues[0],
				excludedPlayerCount,
				maxPlayersCount: customGameSettings.enabled ? customGameSliderValue[0] : this.state.isTourny ? undefined : this.state.sliderValues[1],
				experiencedMode: this.state.experiencedmode,
				disableChat: this.state.disablechat,
				disableObserverLobby: this.state.disableobserverlobby,
				disableObserver: this.state.disableobserver && !this.state.isTourny,
				isTourny: this.state.isTourny,
				isVerifiedOnly: userInfo.verified ? this.state.isVerifiedOnly : false,
				disableGamechat: false, // this.state.disablegameChat,
				rainbowgame: this.state.rainbowgame,
				blindMode: this.state.blindMode,
				flappyMode: this.state.flappyMode,
				flappyOnlyMode: this.state.flappyOnlyMode,
				timedMode: this.state.timedMode ? this.state.timedSliderValue[0] : false,
				rebalance6p: this.state.checkedRebalanceValues[0],
				rebalance7p: this.state.checkedRebalanceValues[1],
				rebalance9p2f: this.state.checkedRebalanceValues[2],
				eloSliderValue: this.state.isEloLimited ? this.state.eloSliderValue[0] : null,
				unlistedGame: this.state.unlistedGame && !this.state.privateShowing,
				privatePassword: this.state.privateShowing && !this.state.unlistedGame ? this.state.password : false,
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
	};

	renderPlayerSlider() {
		const { isTourny, customGameSettings } = this.state;
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
				{isTourny ? (
					<Range
						className="tourny-slider"
						onChange={this.sliderChange}
						min={1}
						max={3}
						defaultValue={[0]}
						value={this.state.sliderValues}
						marks={{ 1: '14', 2: '16', 3: '18' }}
					/>
				) : customGameSettings.enabled ? (
					<Range
						onChange={this.customGameSliderChange}
						min={5}
						max={10}
						defaultValue={[7]}
						value={this.state.customGameSliderValue}
						marks={{ 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10' }}
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
				{!isTourny && !customGameSettings.enabled && (
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
					<i className="info circle icon" />
					Rebalance:
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

	timedSliderChange = timedSliderValue => {
		this.setState(prevState => ({ timedSliderValue, gameType: timedSliderValue[0] < 30 ? 'casual' : this.state.gameType }));
	};

	eloSliderChange = eloSliderValue => {
		this.setState({ eloSliderValue });
	};

	renderEloSlider() {
		const origMarks = { 1600: '1600', 1650: '', 1700: '1700', 1750: '', 1800: '1800', 1850: '', 1900: '1900', 1950: '', 2000: '2000' };
		const { userInfo, userList } = this.props;
		if (userInfo.gameSettings && userInfo.gameSettings.disableElo) return null;
		let player = null;
		if (userList.list) player = userList.list.find(p => p.userName === userInfo.userName);
		const isSeason = (userInfo.gameSettings && !userInfo.gameSettings.disableSeasonal) || false;
		const playerElo = (player && player.eloSeason && Math.min(2000, player.eloSeason)) || 1600;
		const playerEloNonseason = (player && player.eloOverall && Math.min(2000, player.eloOverall)) || 1600;
		const max = Math.min(playerElo, playerEloNonseason);
		const marks = Object.keys(origMarks)
			.filter(k => origMarks[k] <= max)
			.reduce((obj, key) => {
				obj[key] = origMarks[key];
				return obj;
			}, {});

		if ((isSeason && playerElo > 1600) || (playerEloNonseason && playerEloNonseason > 1600)) {
			return (
				<div className="sixteen wide column" style={{ marginTop: '-30px' }}>
					{this.state.isEloLimited && (
						<div>
							<h4 className="ui header">Minimum elo to sit in this game</h4>
							<Range onChange={this.eloSliderChange} min={1600} max={max} defaultValue={[1600]} value={this.state.eloSliderValue} marks={marks} />

							<input
								value={this.state.eloSliderValue[0]}
								onChange={e => {
									if (!isNaN(e.target.value)) {
										this.setState({ eloSliderValue: [e.target.value] });
									}
								}}
								style={{ background: `${this.state.eloSliderValue[0] < 1600 || this.state.eloSliderValue[0] > max ? '#f66' : 'white'}`, marginTop: '30px' }}
							/>
						</div>
					)}
					<div className="four wide column elorow" style={{ margin: '-50 auto 0' }}>
						<i className="big arrows alternate horizontal icon" />
						<h4 className="ui header">Elo limited game</h4>
						<Switch
							onChange={checked => {
								this.setState({ isEloLimited: checked });
							}}
							className="create-game-switch"
							checked={this.state.isEloLimited}
							onColor="#627cc8"
							offColor="#444444"
							uncheckedIcon={false}
							checkedIcon={false}
							height={21}
							width={48}
							handleDiameter={21}
						/>
					</div>
				</div>
			);
		}
	}

	renderDeck() {
		const { customGameSettings } = this.state;
		const numLib = customGameSettings.deckState.lib - customGameSettings.trackState.lib;
		const numFas = customGameSettings.deckState.fas - customGameSettings.trackState.fas;
		const rowWidth = Math.ceil((numLib + numFas) / 3);
		const data = _.range(0, numLib)
			.map((val, i) => {
				return <div key={`L${i}`} className="deckcard" style={{ backgroundImage: "url('../images/cards/liberalp-l.png')" }} />; // eslint-disable-line
			})
			.concat(
				_.range(0, numFas).map((val, i) => {
					return <div key={`F${i}`} className="deckcard" style={{ backgroundImage: "url('../images/cards/fascistp-l.png')" }} />; // eslint-disable-line
				})
			);
		const thirds = [];
		data.forEach((elem, idx) => {
			if (thirds[Math.floor(idx / rowWidth)] == null) thirds[Math.floor(idx / rowWidth)] = [];
			thirds[Math.floor(idx / rowWidth)][idx % rowWidth] = elem;
		});
		if ((numLib + numFas) % 3 == 1) {
			// Causes two rows to be one short, instead of one row being two short.
			thirds[2][rowWidth - 2] = thirds[1][rowWidth - 1];
			delete thirds[1][rowWidth - 1];
		}
		return thirds.map((val, i) => {
			return (
				<div key={i} className="column" style={{ width: '4em', marginBottom: '-2.5rem', display: 'flex', width: 'auto' }}>
					{val}
				</div>
			);
		});
	}

	renderFasTrack() {
		const { customGameSettings } = this.state;
		const offX = 94;
		const offY = 6;
		const powers = customGameSettings.powers.map(p => {
			if (p == null || p == '' || p == 'null') return 'None';
			if (p == 'investigate') return 'Inv';
			if (p == 'deckpeek') return 'Peek';
			if (p == 'election') return 'Elect';
			if (p == 'bullet') return 'Gun';
			if (p == 'reverseinv') return 'ReverseInv';
			if (p == 'peekdrop') return 'PeekDrop';
			return null;
		});
		const numFas = customGameSettings.fascistCount;
		const hzStart = customGameSettings.hitlerZone;
		const vzPoint = customGameSettings.vetoZone;
		const hitKnowsFas = customGameSettings.hitKnowsFas;
		const getHZ = pos => {
			if (pos < hzStart) return 'Off';
			if (pos > hzStart) return 'On';
			return 'Start';
		};
		return (
			<div
				style={{
					backgroundSize: 'contain',
					backgroundRepeat: 'no-repeat',
					top: 0,
					left: 0,
					height: '220px',
					width: '650px',
					margin: 'auto',
					backgroundImage: "url('../images/customtracks/fasTrack.png')" // eslint-disable-line
				}}
			>
				<span
					style={{
						width: '92px',
						height: '120px',
						left: `${offX + 137}px`,
						top: `${offY + 58}px`,
						position: 'absolute',
						backgroundImage: `url(../images/customtracks/fasTrackHZ${getHZ(1)}.png)`
					}}
				/>
				<span
					style={{
						width: '92px',
						height: '120px',
						left: `${offX + 229}px`,
						top: `${offY + 58}px`,
						position: 'absolute',
						backgroundImage: `url(../images/customtracks/fasTrackHZ${getHZ(2)}.png)`
					}}
				/>
				<span
					style={{
						width: '92px',
						height: '120px',
						left: `${offX + 321}px`,
						top: `${offY + 58}px`,
						position: 'absolute',
						backgroundImage: `url(../images/customtracks/fasTrackHZ${getHZ(3)}.png)`
					}}
				/>
				<span
					style={{
						width: '92px',
						height: '120px',
						left: `${offX + 413}px`,
						top: `${offY + 58}px`,
						position: 'absolute',
						backgroundImage: `url(../images/customtracks/fasTrackHZ${getHZ(4)}.png)`
					}}
				/>
				<span
					style={{
						width: '92px',
						height: '120px',
						left: `${offX + 505}px`,
						top: `${offY + 58}px`,
						position: 'absolute',
						backgroundImage: `url(../images/customtracks/fasTrackHZ${getHZ(5)}.png)`
					}}
				/>

				<span
					className="custom-fastrack-powerslot"
					style={{
						left: `${offX + 58}px`,
						top: `${offY + 58}px`,
						backgroundImage: `url(../images/customtracks/fasPower${powers[0]}${hzStart <= 0 ? 'Light' : ''}.png)`
					}}
				>
					{vzPoint == 1 && <span className={'custom-fastrack-powerslot ' + (hzStart <= 0 ? 'custom-fastrack-vetozone-light' : 'custom-fastrack-vetozone')} />}
				</span>
				<span
					className="custom-fastrack-powerslot"
					style={{
						left: `${offX + 150}px`,
						top: `${offY + 58}px`,
						backgroundImage: `url(../images/customtracks/fasPower${powers[1]}${hzStart <= 1 ? 'Light' : ''}.png)`
					}}
				>
					{vzPoint == 2 && <span className={'custom-fastrack-powerslot ' + (hzStart <= 1 ? 'custom-fastrack-vetozone-light' : 'custom-fastrack-vetozone')} />}
				</span>
				<span
					className="custom-fastrack-powerslot"
					style={{
						left: `${offX + 242}px`,
						top: `${offY + 58}px`,
						backgroundImage: `url(../images/customtracks/fasPower${powers[2]}${hzStart <= 2 ? 'Light' : ''}.png)`
					}}
				>
					{vzPoint == 3 && <span className={'custom-fastrack-powerslot ' + (hzStart <= 2 ? 'custom-fastrack-vetozone-light' : 'custom-fastrack-vetozone')} />}
				</span>
				<span
					className="custom-fastrack-powerslot"
					style={{
						left: `${offX + 334}px`,
						top: `${offY + 58}px`,
						backgroundImage: `url(../images/customtracks/fasPower${powers[3]}${hzStart <= 3 ? 'Light' : ''}.png)`
					}}
				>
					{vzPoint == 4 && <span className={'custom-fastrack-powerslot ' + (hzStart <= 3 ? 'custom-fastrack-vetozone-light' : 'custom-fastrack-vetozone')} />}
				</span>
				<span
					className="custom-fastrack-powerslot"
					style={{
						left: `${offX + 426}px`,
						top: `${offY + 58}px`,
						backgroundImage: `url(../images/customtracks/fasPower${powers[4]}${hzStart <= 4 ? 'Light' : ''}.png)`
					}}
				>
					{vzPoint == 5 && <span className={'custom-fastrack-powerslot ' + (hzStart <= 4 ? 'custom-fastrack-vetozone-light' : 'custom-fastrack-vetozone')} />}
				</span>
				<span
					className="custom-fastrack-powerslot"
					style={{ left: `${offX + 518}px`, top: `${offY + 58}px`, backgroundImage: 'url(../images/customtracks/fasPowerEndGame.png)' }}
				/>
				<span
					style={{
						width: '268px',
						height: '15px',
						left: `${offX + 336}px`,
						top: `${offY + 60}px`,
						position: 'absolute',
						backgroundImage: 'url(../images/customtracks/fasTrackHZText.png)'
					}}
				/>
				<span
					style={{
						width: '227px',
						height: '11px',
						left: `${offX + 220}px`,
						top: `${offY + 186}px`,
						position: 'absolute',
						backgroundImage: `url(../images/customtracks/fasTrack${numFas}fas.png)`
					}}
				/>
				<span
					style={{
						width: '227px',
						height: '11px',
						left: `${offX + 220}px`,
						top: `${offY + 196}px`,
						position: 'absolute',
						backgroundImage: `url(../images/customtracks/fasTrack${numFas > 1 ? 'Multi' : 'Single'}${hitKnowsFas ? 'Known' : 'Unknown'}.png)`
					}}
				/>
			</div>
		);
	}

	renderCustomGames() {
		const { hitKnowsFas } = this.state.customGameSettings;

		const renderFas = () => {
			return _.range(0, this.state.customGameSettings.fascistCount).map((val, i) => (
				<div
					key={i}
					className="rolecard"
					style={{ backgroundImage: hitKnowsFas ? `url('../images/cards/fascist${val}.png')` : "url('../images/cards/secretrole.png')" }} // eslint-disable-line
				/>
			));
		};

		const renderLib = () => {
			return _.range(0, this.state.customGameSliderValue - this.state.customGameSettings.fascistCount - 1).map((val, i) => (
				<div
					key={i}
					className="rolecard"
					style={{ backgroundImage: hitKnowsFas ? `url('../images/cards/liberal${val % 6}.png')` : "url('../images/cards/secretrole.png')" }} // eslint-disable-line
				/>
			));
		};

		return (
			<React.Fragment>
				<div className="row">
					<div className="wide column" style={{ width: '20%' }}>
						{this.powerPicker(0)}
					</div>
					<div className="wide column" style={{ width: '20%' }}>
						{this.powerPicker(1)}
					</div>
					<div className="wide column" style={{ width: '20%' }}>
						{this.powerPicker(2)}
					</div>
					<div className="wide column" style={{ width: '20%' }}>
						{this.powerPicker(3)}
					</div>
					<div className="wide column" style={{ width: '20%' }}>
						{this.powerPicker(4)}
					</div>
				</div>
				<div className="row">
					<div className="seven wide column">
						<div>
							<h4 className="ui header">Hitler Zone</h4>
							<Range
								min={1}
								max={5}
								defaultValue={[3]}
								onChange={this.sliderHitlerZone}
								value={[this.state.customGameSettings.hitlerZone]}
								marks={{ 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }}
							/>
						</div>
					</div>
					<div className="two wide column" />
					<div className="seven wide column">
						<div>
							<h4 className="ui header">Veto Zone</h4>
							<Range
								min={1}
								max={5}
								defaultValue={[5]}
								onChange={this.sliderVetoZone}
								value={[this.state.customGameSettings.vetoZone]}
								marks={{ 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }}
							/>
						</div>
					</div>
				</div>
				<div className="row">{this.renderFasTrack()}</div>
				<div className="eight wide column ui grid" style={{ height: 'fit-content' }}>
					<div className="row">
						<div className="six wide column">
							<div>
								<h4 className="ui header">Number of fascists</h4>
								<Range
									min={1}
									max={3}
									defaultValue={[2]}
									onChange={this.sliderNumFas}
									value={[this.state.customGameSettings.fascistCount]}
									marks={{ 1: '1', 2: '2', 3: '3' }}
								/>
							</div>
						</div>
						<div className="five wide column">
							<h4 className="ui header">Hitler sees fascists</h4>
							<Switch
								className="create-game-switch"
								onChange={checked => {
									this.setState({ customGameSettings: { ...this.state.customGameSettings, hitKnowsFas: checked } });
								}}
								checked={this.state.customGameSettings.hitKnowsFas}
								onColor="#627cc8"
								offColor="#444444"
								uncheckedIcon={false}
								checkedIcon={false}
								height={21}
								width={48}
								handleDiameter={21}
							/>
						</div>
						<div className="five wide column">
							<h4 className="ui header">Fascists can shoot hitler</h4>
							<Switch
								className="create-game-switch"
								onChange={checked => {
									this.setState({ customGameSettings: { ...this.state.customGameSettings, fasCanShootHit: checked } });
								}}
								checked={this.state.customGameSettings.fasCanShootHit}
								onColor="#627cc8"
								offColor="#444444"
								uncheckedIcon={false}
								checkedIcon={false}
								height={21}
								width={48}
								handleDiameter={21}
							/>
						</div>
					</div>
					<div className="row">
						<div style={{ display: 'flex', width: '100%', marginBottom: '6px' }}>
							<div className="rolecard" style={{ backgroundImage: "url('../images/cards/hitler0.png')" }} /> {/* eslint-disable-line */}
							{renderFas()}
						</div>
						<div style={{ display: 'flex', width: '100%' }}>{renderLib()}</div>
					</div>
				</div>
				<div className="eight wide column ui grid" style={{ marginTop: '-1rem', marginLeft: '3rem', marginBottom: '3rem' }}>
					<div className="row">
						<div className="eight wide column">
							<h4 className="ui header">Liberal policies</h4>
							<Range
								min={5}
								max={8}
								defaultValue={[6]}
								onChange={this.sliderDeckLib}
								value={[this.state.customGameSettings.deckState.lib]}
								marks={{ 5: '5', 6: '6', 7: '7', 8: '8' }}
							/>
						</div>
						<div className="eight wide column">
							<h4 className="ui header">Fascist policies</h4>
							<Range
								min={10}
								max={19}
								defaultValue={[12]}
								onChange={this.sliderDeckFas}
								value={[this.state.customGameSettings.deckState.fas]}
								marks={{ 10: '10', 11: '', 12: '', 13: '13', 14: '', 15: '', 16: '16', 17: '', 18: '', 19: '19' }}
							/>
						</div>
					</div>
					<div className="row">
						<div className="eight wide column">
							<h4 className="ui header">Starting lib policies</h4>
							<Range
								min={0}
								max={2}
								defaultValue={[0]}
								onChange={this.sliderTrackLib}
								value={[this.state.customGameSettings.trackState.lib]}
								marks={{ 0: '0', 1: '1', 2: '2' }}
							/>
						</div>
						<div className="eight wide column">
							<h4 className="ui header">Starting fas policies</h4>
							<Range
								min={0}
								max={2}
								defaultValue={[0]}
								onChange={this.sliderTrackFas}
								value={[this.state.customGameSettings.trackState.fas]}
								marks={{ 0: '0', 1: '1', 2: '2' }}
							/>
						</div>
					</div>
					<div className="row">{this.renderDeck()}</div>
				</div>
			</React.Fragment>
		);
	}

	renderPresetSelector() {
		return (
			<div className="sixteen wide column">
				<h4 className="ui header" style={{ color: '#dd2f23', margin: '0' }}>
					Presets:
				</h4>
				<br />
				<button className="preset" onClick={() => this.presetSelector('High ELO')}>
					High ELO
				</button>
				<button className="preset" onClick={() => this.presetSelector('Gun Game')}>
					Gun Game
				</button>
				<button className="preset" onClick={() => this.presetSelector('2R1H')}>
					2R1H
				</button>
				<button className="preset" onClick={() => this.presetSelector('Tourney Game')}>
					Tournament
				</button>
				<button className="preset" onClick={() => this.presetSelector('Meoww')}>
					Meoww
				</button>
				<br />
				<button className="preset" onClick={() => this.presetSelector('Silent Game')}>
					Silent Game
				</button>
				<button className="preset" onClick={() => this.presetSelector('Inv Game')}>
					Inv Game
				</button>
				<button className="preset" onClick={() => this.presetSelector('Trivia Mode')}>
					Trivia Mode
				</button>
				<button className="preset default" onClick={() => this.presetSelector('Reset')}>
					Reset
				</button>
			</div>
		);
	}

	getErrors() {
		const errs = [];

		const { userInfo, userList } = this.props;
		if (userList && userList.list) {
			// Can happen when refreshing.
			const player = userList.list.find(p => p.userName === userInfo.userName);
			if (!player) errs.push('Not logged in, please refresh.');
			if (player && player.staffIncognito) errs.push(`You're incognito`);
			else if (this.state.isEloLimited) {
				const playerElo = (player && player.eloSeason && Math.min(2000, player.eloSeason)) || 1600;
				const playerEloNonseason = (player && player.eloOverall && Math.min(2000, player.eloOverall)) || 1600;
				const max = Math.min(playerElo, playerEloNonseason);
				if (this.state.eloSliderValue[0] < 1600 || this.state.eloSliderValue[0] > max) {
					errs.push(`ELO slider value is invalid, your maximum is ${max}.`);
				}
			}
		}
		if (this.state.customGameSettings.enabled) {
			if (this.state.customGameSettings.fascistCount + 1 >= this.state.customGameSliderValue / 2) {
				errs.push('There must be a liberal majority when the game starts.');
			}
			if (this.state.customGameSettings.vetoZone <= this.state.customGameSettings.trackState.fas) {
				errs.push('Veto Zone cannot be active when the game starts.');
			}
		}
		if (this.state.containsBadWord) {
			errs.push("This game's name contains a forbidden word or fragment."); // eslint-disable-line
		}

		if (errs.length) return errs;
		return null;
	}

	renderErrors() {
		const errs = this.getErrors();
		if (errs) {
			return (
				<div className="sixteen wide column">
					{errs.map((e, i) => (
						<h4 key={i} className="ui header" style={{ color: 'red' }}>
							{e}
						</h4>
					))}
				</div>
			);
		}
	}

	render() {
		let createClass = 'ui button primary';
		if (this.getErrors() != null) {
			createClass += ' disabled';
		}

		return (
			<section className="creategame">
				<a href="#/">
					<i className="remove icon" />
				</a>
				<div className="ui header">
					<div className="content">Create a new game</div>
				</div>
				<div className="ui grid centered footer">
					<div onClick={this.createNewGame} className={createClass}>
						Create game
					</div>
				</div>
				<div className="ui grid">
					{this.renderErrors()}
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
									value={this.state.gameName}
									onChange={e => {
										let badWord = false;
										blacklistedWords.forEach(word => {
											if (new RegExp(word, 'i').test(e.target.value)) {
												badWord = true;
											}
										});
										this.setState({
											gameName: `${e.target.value}`,
											containsBadWord: badWord
										});
									}}
								/>
							</div>
							{this.state.containsBadWord && <p className="contains-bad-word">This game name has a banned word or word fragment.</p>}
						</div>
						{!this.state.unlistedGame && (
							<div className="three wide column privategame">
								<h4 className="ui header" style={{ marginBottom: '15px' }}>
									Private game
								</h4>
								<i className="big yellow lock icon" />
								<Switch
									className="create-game-switch"
									onChange={checked => {
										this.setState({
											privateShowing: checked,
											gameType: checked ? 'private' : this.state.customGameSettings.enabled ? 'custom' : 'ranked'
										});
									}}
									checked={this.state.privateShowing}
									onColor="#627cc8"
									offColor="#444444"
									uncheckedIcon={false}
									checkedIcon={false}
									height={21}
									width={48}
									handleDiameter={21}
								/>
							</div>
						)}
						{this.state.unlistedGame && <div className="three wide column privategame" />}
						{this.state.privateShowing && (
							<div className="four wide column ui input">
								<input
									className="password-input"
									maxLength="20"
									placeholder="Password"
									type="text"
									autoFocus
									value={this.state.password}
									onChange={e => this.setState({ password: e.target.value })}
								/>
							</div>
						)}
						{!this.state.privateShowing && (
							<div className="three wide column privategame">
								<h4 className="ui header" style={{ marginBottom: '15px' }}>
									Unlisted game
								</h4>
								<i className="big green lock icon" />
								<Switch
									className="create-game-switch"
									onChange={checked => {
										this.setState({
											unlistedGame: checked,
											gameType: checked ? 'casual' : 'ranked'
										});
									}}
									checked={this.state.unlistedGame}
									onColor="#627cc8"
									offColor="#444444"
									uncheckedIcon={false}
									checkedIcon={false}
									height={21}
									width={48}
									handleDiameter={21}
								/>
							</div>
						)}
					</div>
					{this.renderPresetSelector()}
					<div className="row slider">{this.renderPlayerSlider()}</div>
					<div className="row rebalance">{!this.state.customGameSettings.enabled && this.renderRebalanceCheckboxes()}</div>
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
					<div className="row flappy">
						<div className="sixteen wide column">
							<i className="big plane icon" style={{ color: 'orange' }} />
							<h4 className="ui header" style={{ color: 'orange' }}>
								<i
									className="info circle icon"
									style={{ color: 'red', cursor: 'help' }}
									title="If active, when players are on the last policy, roles are revealed and a 1 on 1 game of Flappy Hitler commences with control of the 'flappy' passed between team members at intervals."
								/>
								COMING SOON: Resolve sudden death games with Flappy Hitler
							</h4>
							<Switch
								className="create-game-switch"
								onChange={checked => {
									this.setState({ flappyMode: checked });
								}}
								checked={this.state.flappyMode}
								onColor="#627cc8"
								offColor="#444444"
								uncheckedIcon={false}
								checkedIcon={false}
								height={21}
								width={48}
								handleDiameter={21}
							/>
						</div>
					</div>

					{this.state.flappyMode && (
						<div className="row flappy-force">
							<div className="sixteen wide column">
								<i className="big plane icon" style={{ color: 'darkred' }} />
								<h4 className="ui header" style={{ color: 'darkred' }}>
									Forget the policies, just play a flappy-only game
								</h4>
								<Switch
									className="create-game-switch"
									onChange={checked => {
										this.setState({ flappyOnlyMode: checked });
									}}
									checked={this.state.flappyOnlyMode}
									onColor="#627cc8"
									offColor="#444444"
									uncheckedIcon={false}
									checkedIcon={false}
									height={21}
									width={48}
									handleDiameter={21}
								/>
							</div>
						</div>
					)}
					{this.state.timedMode && (
						<div className="row timedmode-slider">
							<div className="sixteen wide column">
								<Range
									onChange={this.timedSliderChange}
									defaultValue={[120]}
									value={this.state.timedSliderValue}
									min={2}
									max={600}
									marks={{ 2: '2 seconds', 30: '', 60: '', 90: '', 120: '2 minutes', 180: '', 240: '', 300: '5 minutes', 600: '10 minutes' }}
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
							<Switch
								className="create-game-switch"
								onChange={checked => {
									this.setState({ timedMode: checked });
								}}
								checked={this.state.timedMode}
								onColor="#627cc8"
								offColor="#444444"
								uncheckedIcon={false}
								checkedIcon={false}
								height={21}
								width={48}
								handleDiameter={21}
							/>
						</div>
					</div>
					{this.props.userInfo.verified && !this.state.privateonlygame && (
						<div className="row verified-row">
							<div className="sixteen wide column">
								<i className="big thumbs up icon" style={{ color: 'tan !important' }} />
								<h4 className="ui header" style={{ color: 'tan' }}>
									Verified - only verified players can play in this game.
								</h4>
								<Switch
									className="create-game-switch"
									onChange={checked => {
										this.setState({ isVerifiedOnly: checked });
									}}
									checked={this.state.isVerifiedOnly}
									onColor="#627cc8"
									offColor="#444444"
									uncheckedIcon={false}
									checkedIcon={false}
									height={21}
									width={48}
									handleDiameter={21}
								/>
							</div>
						</div>
					)}
					{this.renderEloSlider()}
					<div className="row sliderrow">
						<div className="four wide column disablechat">
							<i className="big unmute icon" />
							<h4 className="ui header">Disable player chat - use this for voice-only games</h4>
							<Switch
								className="create-game-switch"
								onChange={checked => {
									this.setState({ disablechat: checked });
								}}
								checked={this.state.disablechat}
								onColor="#627cc8"
								offColor="#444444"
								uncheckedIcon={false}
								checkedIcon={false}
								height={21}
								width={48}
								handleDiameter={21}
							/>
						</div>
						<div className="four wide column disablegamechat">
							<i className="big game icon" />
							<h4 className="ui header">
								Disable game chats - {/* you're on your own to remember what happened over the course of the game */}
								<span style={{ fontStyle: 'italic' }}>currently disabled due to multiple issues. </span>
							</h4>
							{/* <Switch
              className="create-game-switch"
								onChange={checked => {
									this.setState({ disablegameChat: checked });
								}}
								checked={this.state.disablegameChat}
								onColor="#627cc8"
								offColor="#444444"
								uncheckedIcon={false}
								checkedIcon={false}
								height={21}
								width={48}
								handleDiameter={21}
							/> */}
						</div>
						<div className="four wide column experiencedmode">
							<i className="big fast forward icon" />
							<h4 className="ui header">Speed mode - most animations and pauses greatly reduced and fewer gamechats</h4>
							<Switch
								className="create-game-switch"
								onChange={checked => {
									this.setState({ experiencedmode: checked });
								}}
								checked={this.state.experiencedmode}
								onColor="#627cc8"
								offColor="#444444"
								uncheckedIcon={false}
								checkedIcon={false}
								height={21}
								width={48}
								handleDiameter={21}
							/>
						</div>
						{(() => {
							let isRainbow = false;
							let user;
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
										<Switch
											className="create-game-switch"
											onChange={checked => {
												this.setState({
													rainbowgame: checked,
													isVerifiedOnly: !checked
												});
											}}
											checked={this.state.rainbowgame}
											onColor="#627cc8"
											offColor="#444444"
											uncheckedIcon={false}
											checkedIcon={false}
											height={21}
											width={48}
											handleDiameter={21}
										/>
									</div>
								);
							}
						})()}
					</div>
					<div className="row">
						<div className="four wide column">
							<i className="big hide icon" />
							<h4 className="ui header">Blind mode - player's names are replaced with random animal names, anonymizing them.</h4>
							<Switch
								className="create-game-switch"
								onChange={checked => {
									this.setState({ blindMode: checked });
								}}
								checked={this.state.blindMode}
								onColor="#627cc8"
								offColor="#444444"
								uncheckedIcon={false}
								checkedIcon={false}
								height={21}
								width={48}
								handleDiameter={21}
							/>
						</div>
						{!this.state.isTourny && (
							<div className="four wide column">
								<i className="big talk icon" />
								<h4 className="ui header">Disable observer chat</h4>
								<Switch
									className="create-game-switch"
									onChange={checked => {
										this.setState({ disableobserverlobby: checked, disableobserver: checked });
									}}
									checked={this.state.disableobserverlobby}
									onColor="#627cc8"
									offColor="#444444"
									uncheckedIcon={false}
									checkedIcon={false}
									height={21}
									width={48}
									handleDiameter={21}
								/>
								<h4 className="ui header">Disable observer chat during game{this.state.disableobserverlobby ? '' : ' only'}</h4>
								<Switch
									className="create-game-switch"
									onChange={checked => {
										this.setState({ disableobserver: checked });
									}}
									checked={this.state.disableobserver}
									onColor="#627cc8"
									offColor="#444444"
									uncheckedIcon={false}
									checkedIcon={false}
									height={21}
									width={48}
									handleDiameter={21}
									disabled={this.state.disableobserverlobby}
								/>
							</div>
						)}
						<div className="four wide column">
							<i className="big handshake icon" />
							<h4 className="ui header">Game Type</h4>
							{this.renderGameTypeDropdown()}
						</div>
						{this.props.userInfo.gameSettings && this.props.userInfo.gameSettings.isPrivate && (
							<div className="four wide column privateonlygame">
								<h4 className="ui header">Private only game - only other anonymous players can be seated.</h4>
								<Switch
									className="create-game-switch"
									onChange={checked => {
										this.setState({
											privateonlyGame: checked,
											isVerifiedOnly: false,
											gameType: checked ? 'private' : this.state.customGameSettings.enabled ? 'custom' : 'ranked'
										});
									}}
									checked={this.state.privateonlyGame}
									onColor="#627cc8"
									offColor="#444444"
									uncheckedIcon={false}
									checkedIcon={false}
									height={21}
									width={48}
									handleDiameter={21}
								/>
							</div>
						)}
					</div>
					<div className="row">
						<div className="sixteen wide column">
							<i className="big setting icon" />
							<h4 className="ui header">Custom Game - Use a custom fascist track.</h4>
							<Switch
								className="create-game-switch"
								onChange={checked => {
									this.setState({
										customGameSettings: Object.assign(this.state.customGameSettings, { enabled: checked }),
										gameType: checked ? 'custom' : this.state.privateShowing || this.state.privateonlygame ? 'private' : 'ranked'
									});
								}}
								checked={this.state.customGameSettings.enabled}
								onColor="#627cc8"
								offColor="#444444"
								uncheckedIcon={false}
								checkedIcon={false}
								height={21}
								width={48}
								handleDiameter={21}
							/>
						</div>
					</div>
					{this.state.customGameSettings.enabled && this.renderCustomGames()}
					{this.renderErrors()}
				</div>
				<div className="ui grid centered footer">
					<div onClick={this.createNewGame} className={createClass}>
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
