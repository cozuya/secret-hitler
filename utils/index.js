/* eslint-disable spaced-comment */
const { none } = require('option');
const { Range, List } = require('immutable');

/**************************
 * IMMUTABLES AND OPTIONS *
 ***************************/

// (opt: Option[A], predicate: A => Boolean) => Option[A]
exports.filterOpt = (opt, predicate) => {
	return opt.flatMap(o => (predicate(o) ? opt : none));
};

// (xs: List[Option[A]]) => List[A]
exports.flattenListOpts = xs => xs.filter(x => x.isSome()).map(x => x.value());

// (xs: List[A], opt: Option[A]) => List[A]
exports.pushOpt = (xs, opt) => {
	return xs.concat(opt.map(x => List([x])).valueOrElse(List()));
};

// (x: A) => B => (x: Option[A]) => Option[B]
exports.mapOpt1 = f => {
	return x => x.map(xx => f(xx));
};

// (x: A, y: B) => C => (x: Option[A], y: Option[B]) => Option[C]
exports.mapOpt2 = f => {
	return (x, y) => x.flatMap(xx => y.map(yy => f(xx, yy)));
};

/*****************
 * GAME ENTITIES *
 *****************/

/*
 * ALIASES:
 *
 * Hand: Array [ Policy ]
 * Policy: String ('fascist' | 'liberal')
 */

// (handX: Hand, handY: Hand) => Hand
exports.handDiff = (handX, handY) => {
	if (handX.hasOwnProperty('reds') && handX.hasOwnProperty('blues')) {
		// check for legacy format of hands
		if (handY.hasOwnProperty('reds') && handY.hasOwnProperty('blues')) {
			return {
				reds: handX.reds - handY.reds,
				blues: handX.blues - handY.blues
			};
		}

		const currentValue = { reds: handX.reds, blues: handX.blues };

		if (handY.hasOwnProperty('size')) {
			for (const elem of handY) {
				currentValue[elem === 'fascist' ? 'reds' : 'blues']--;
			}
		} else {
			currentValue[handY === 'fascist' ? 'reds' : 'blues']--;
		}

		return currentValue;
	}

	const handXClone = handX.toArray();

	if (!handY.hasOwnProperty('size')) {
		handY = [handY];
	}

	for (const elem of handY) {
		handXClone.splice(handXClone.indexOf(elem), 1);
	}
	return handXClone;
};

// expects hand to contain only a single card
// (hand: Hand) => Policy
exports.handToPolicy = hand => {
	if (hand.hasOwnProperty('reds') && hand.hasOwnProperty('blues')) {
		if (hand.reds > 0 && hand.blues > 0) {
			throw new Error('Expected hand to contain only a single card');
		}
		return hand.reds > 0 ? 'fascist' : 'liberal';
	}

	return hand[0];
};

// consistently ordered 'fascist' first, followed by 'liberal'
// (hand: Hand) => List[Policy]
const handToPolicies = (exports.handToPolicies = hand => {
	if (hand.hasOwnProperty('reds') && hand.hasOwnProperty('blues')) {
		const toPolicies = (count, type) => {
			return Range(0, count)
				.map(i => type)
				.toList();
		};

		const reds = toPolicies(hand.reds, 'fascist');
		const blues = toPolicies(hand.blues, 'liberal');

		return reds.concat(blues).toList();
	}

	return hand;
});

// (policy: Policy) => Hand
exports.policyToHand = policy => {
	// return policy === 'fascist' ? { reds: 1, blues: 0 } : { reds: 0, blues: 1 };
	return policy;
};

const isComma = (index, list, userInfo) => {
	const mode = (userInfo && userInfo.gameSettings && userInfo.gameSettings.claimCharacters) || 'short';
	if (mode === 'full') {
		return index < list.size - 1;
	}
	return false;
};

const policyToString = (policy, userInfo) => {
	const mode = (userInfo && userInfo.gameSettings && userInfo.gameSettings.claimCharacters) || 'short';
	let liberalChar = 'L';
	let fascistChar = 'F';
	if (mode === 'legacy') {
		liberalChar = 'B';
		fascistChar = 'R';
	} else if (mode === 'full') {
		liberalChar = 'liberal';
		fascistChar = 'fascist';
	}

	return policy === 'fascist' ? fascistChar : liberalChar;
};

// (policy: Policy) => String ('R' | 'B')
exports.policyToString = policyToString;

const text = (exports.text = (type, text, space, comma) => ({ type, text, space, comma }));

// (hand: Hand) => String ('R*B*')
exports.handToText = (hand, userInfo) => {
	if (handToPolicies(hand).size === 0) {
		return [];
	}

	return handToPolicies(hand)
		.map((policy, index, list) => text(policy, policyToString(policy, userInfo), false, isComma(index, list, userInfo)))
		.concat(text('normal', ''))
		.toArray();
};

/********
 * MISC *
 ********/

// (s: String) => String
exports.capitalize = s => {
	return s.charAt(0).toUpperCase() + s.slice(1);
};

// (target: Object, subset: Object) => Boolean
// compares attributes with strict equality
exports.objectContains = (target, subset) => {
	return Object.keys(subset).reduce((acc, key) => acc && target[key] === subset[key], true);
};
