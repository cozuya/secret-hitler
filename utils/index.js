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
 * Hand: { reds: Int, blues: Int }
 * Policy: String ('fascist' | 'liberal')
 */

// (handX: Hand, handY: Hand) => Hand
exports.handDiff = (handX, handY) => {
	return {
		reds: handX.reds - handY.reds,
		blues: handX.blues - handY.blues
	};
};

// expects hand to contain only a single card
// (hand: Hand) => Policy
exports.handToPolicy = hand => {
	if (hand.reds > 0 && hand.blues > 0) {
		throw new Error('Expected hand to contain only a single card');
	}
	return hand.reds > 0 ? 'fascist' : 'liberal';
};

// consistently ordered 'fascist' first, followed by 'liberal'
// (hand: Hand) => List[Policy]
const handToPolicies = (exports.handToPolicies = hand => {
	const toPolicies = (count, type) => {
		return Range(0, count)
			.map(i => type)
			.toList();
	};

	const reds = toPolicies(hand.reds, 'fascist');
	const blues = toPolicies(hand.blues, 'liberal');

	return reds.concat(blues).toList();
});

// (policy: Policy) => Hand
exports.policyToHand = policy => {
	return policy === 'fascist' ? { reds: 1, blues: 0 } : { reds: 0, blues: 1 };
};

// (policy: Policy) => String ('R' | 'B')
exports.policyToString = policy => {
	return policy === 'fascist' ? 'R' : 'B';
};

const text = (exports.text = (type, text, space) => ({ type, text, space }));

// (hand: Hand) => String ('R*B*')
exports.handToText = hand => {
	const policyToString = policy => (policy === 'fascist' ? 'R' : 'B');

	return handToPolicies(hand)
		.map(policy => text(policy, policyToString(policy), false))
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
