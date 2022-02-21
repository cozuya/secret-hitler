const mongoose = require('mongoose');
const Account = require('../models/account');
const Profile = require('../models/profile/index');
const _ = require('lodash');
const { awardBadgePrequeried } = require('../routes/socket/badges');

mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://localhost:27017/secret-hitler-app`);

let count = 0;

const topOfSeason = {
	maki2: [[1, 1]],
	karamia: [[1, 2]],
	TheDaniMan: [[1, 3]],
	NotIconic: [
		[1, 4],
		[3, 10]
	],
	TheJustStop0: [[1, 5]],
	qwefjz: [[1, 6]],
	BunchOfAnima: [[1, 7]],
	Zeek: [[1, 8]],
	Fusilli: [[3, 1]],
	SheepManu: [[3, 2]],
	HomoSapien: [[3, 3]],
	Samsung: [[3, 4]],
	benjamin172: [
		[3, 5],
		[4, 1],
		[5, 5]
	],
	harvyyy: [[3, 6]],
	imbapingu: [
		[3, 7],
		[6, 6],
		[7, 2],
		[8, 3],
		[10, 2],
		[11, 2],
		[13, 10],
		[14, 2],
		[15, 9]
	],
	Manu1234: [[3, 8]],
	Jasmine: [[3, 9]],
	minie: [
		[4, 2],
		[5, 2]
	],
	GoldenPanda: [[4, 3]],
	scum: [[4, 4]],
	Moranki: [
		[4, 5],
		[11, 5]
	],
	User: [[4, 6]],
	Gamethrower: [[4, 7]],
	mufasa: [
		[4, 8],
		[5, 6]
	],
	adam: [[4, 9]],
	Cucumber: [[4, 10]],
	nvassOG: [[5, 1]],
	Claire0536: [[5, 3]],
	Canaris: [
		[5, 4],
		[7, 1]
	],
	Arrtxi: [[5, 7]],
	RyanLockwood: [
		[5, 8],
		[10, 10]
	],
	Anzuboi: [[5, 9]],
	spite: [[5, 10]],
	Roxz80: [[6, 1]],
	Einstein: [[6, 2]],
	Freakin: [
		[6, 3],
		[7, 8]
	],
	obama: [[6, 4]],
	Metalace: [[6, 5]],
	StatReset: [[6, 7]],
	Prohell: [[6, 8]],
	acro: [
		[6, 9],
		[7, 7]
	],
	wenshan: [
		[6, 10],
		[8, 4]
	],
	liluzivert: [[7, 3]],
	Maximovic96: [[7, 4]],
	rags009: [
		[7, 5],
		[9, 1]
	],
	Olk: [[7, 6]],
	Kristy: [[7, 9]],
	okboomer: [[7, 10]],
	godhemzelve: [
		[8, 1],
		[13, 1],
		[15, 2]
	],
	Scorcha: [
		[8, 2],
		[9, 3]
	],
	'Rivstar:1937': [[8, 5]],
	MaximTheMeme: [
		[8, 6],
		[13, 9]
	],
	RetiredManu: [[8, 7]],
	codingwizard: [[8, 8]],
	trump: [[8, 9]],
	IThanosI: [[8, 10]],
	ChroIIo: [
		[9, 2],
		[14, 4]
	],
	NotFat: [[9, 4]],
	ChillMedusa: [[9, 5]],
	arteezy: [[9, 6]],
	DanGheesling14: [[9, 7]],
	olly97: [
		[9, 8],
		[16, 8]
	],
	earring: [[9, 9]],
	lucaanders: [
		[9, 10],
		[16, 9]
	],
	thijsdB: [[10, 1]],
	FinalManu: [[10, 3]],
	GodMedusa: [[10, 4]],
	Reich25: [[10, 5]],
	DoubleAgent: [[10, 6]],
	CowsAreCute: [[10, 7]],
	KyleTheHill: [[10, 8]],
	Mell0: [
		[10, 9],
		[12, 2],
		[13, 2]
	],
	CuSith: [[11, 1]],
	Starkrush: [[11, 3]],
	Ohrami2: [
		[11, 4],
		[12, 3]
	],
	near1337: [[11, 6]],
	SexGodMedusa: [[11, 7]],
	'1on1': [[11, 8]],
	SOOOOZE: [
		[11, 9],
		[14, 10]
	],
	NotAnAlt7: [[11, 10]],
	pinguREFORMED: [[12, 1]],
	DaddyRiddler: [[12, 4]],
	thijsdb: [[12, 5]],
	LyingLizard: [[12, 6]],
	Freekin: [[12, 7]],
	NotKexhiluz: [[12, 8]],
	RichRobby: [[12, 9]],
	CucuOnly: [[12, 10]],
	carlgauss: [[13, 3]],
	BuIbasaur: [[13, 4]],
	eclowna: [[13, 5]],
	Flexing: [[13, 6]],
	Morientes: [[13, 7]],
	'007Bunny': [[13, 8]],
	noooothitler: [
		[14, 1],
		[16, 7]
	],
	Ohrami3: [[14, 3]],
	NotMell0: [[14, 5]],
	hemmie: [[14, 6]],
	evilGon: [
		[14, 7],
		[15, 4]
	],
	enobii: [[14, 8]],
	nach022: [[14, 9]],
	SourceTa1k: [[15, 1]],
	ReformedG: [[15, 3]],
	Tempest1K: [[15, 5]],
	NotAFasc: [[15, 6]],
	illusory: [[15, 7]],
	Godxevoir: [
		[15, 8],
		[16, 1]
	],
	Hidden110: [[15, 10]],
	Gamesolver: [[16, 2]],
	ClownGamer: [[16, 3]],
	casdude: [[16, 4]],
	Elevate: [[16, 5]],
	DocD: [[16, 6]],
	hecetox249: [[16, 10]]
};

Account.find({ 'games.1': { $exists: true } })
	.cursor()
	.eachAsync(acc => {
		// == QUERY PROFILE ==
		Profile.findOne({ _id: acc.username }).then(profile => {
			// == DATA TO SAVE ==
			const preResetElo = acc.eloOverall;
			const preResetGameCount = acc.games.length;

			// == UPDATE PROFILE STATS ==
			profile.stats.matches.legacyMatches = {
				liberal: _.clone(profile.stats.matches.liberal),
				fascist: _.clone(profile.stats.matches.fascist)
			};
			profile.stats.actions.legacyVoteAccuracy = _.clone(profile.stats.actions.voteAccuracy);
			profile.stats.actions.legacyShotAccuracy = _.clone(profile.stats.actions.shotAccuracy);
			profile.stats.actions.voteAccuracy = {
				events: 0,
				successes: 0
			};
			profile.stats.actions.shotAccuracy = {
				events: 0,
				successes: 0
			};

			// == BADGES ==
			awardBadgePrequeried(
				acc,
				`eloReset${preResetElo.toFixed(0)}`,
				`At the time of the Elo reset, you had ${preResetElo.toFixed(0)} overall Elo and ${preResetGameCount} games played.`,
				`Elo Reset`
			); // other badges will be awarded when players log in

			if (topOfSeason.hasOwnProperty(acc.username)) {
				for (const badge of topOfSeason[acc.username]) {
					const [season, placement] = badge;

					awardBadgePrequeried(acc, `topSeason${season}`, `You were Rank ${placement} of Season ${season}.`, `Season ${season} Top 10`);
				}
			}

			// == RESET ACCOUNT STATS ==
			acc.eloSeason = 1600;
			acc.eloOverall = 1600;
			acc.xpOverall = preResetGameCount;
			acc.xpSeason = 0;
			acc.isRainbowOverall = acc.xpOverall >= 50.0;
			if (acc.isRainbowOverall) {
				acc.dateRainbowOverall = new Date();
			}
			acc.isRainbowSeason = false;

			// == WE ARE DONE ==
			profile.save(() => {
				acc.save();
				count++;
				if (Number.isInteger(count / 100)) {
					console.log('processed account ' + count);
				}
			});
		});
	})
	.then(() => {
		console.log('done');
		mongoose.connection.close();
	})
	.catch(err => {
		console.log(err, 'caught err');
	});
