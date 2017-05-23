const { some, none } = require('option');
const { List } = require('immutable');

// (opt: Option[A], predicate: A => Boolean) => Option[A]
exports.filterOpt = (opt, predicate) => {
	return opt.flatMap(o => predicate(o) ? opt : none);
};

// (xs: List[Option[A]]) => List[A]
exports.flattenListOpts = xs => xs
	.filter(x => x.isSome())
	.map(x => x.value());

// (x: A) => B => (x: Option[A]) => Option[B]
exports.mapOpt1 = f => {
	return x => {
		return x.map(xx => f(xx));
	};
};

// (x: A, y: B) => C => (x: Option[A], y: Option[B]) => Option[C]
exports.mapOpt2 = f => {
	return (x, y) => {
		return x.flatMap(xx => y.map(yy => f(xx, yy)));
	};
};

// (hand: { reds: Int, blues: Int }) => { reds: Int, blues: Int }
exports.handDiff = (handX, handY) => {
	return { 
		reds: handX.reds - handY.reds,
		blues: handX.blues - handY.blues
	};
};

// expects hand to contain only a single card
// (hand: { reds: Int, blues: Int }) => 'fascist' | 'liberal'
exports.handToPolicy = hand => {
	return hand.reds > 0 ? 'fascist' : 'liberal';
};

// 'fascist' | 'liberal' => { reds: Int, blues: Int }
exports.policyToHand = policy => {
	return policy === 'fascist'
		? { reds: 1, blues: 0 }
		: { reds: 0, blues: 1 };
};

// (p: 'fascist' | 'liberal') => 'R' | 'B'
exports.policyToString = policy => {
	return policy === 'fascist' ? 'R' : 'B';
};

// (hand: { reds: Int, blues: Int }) => String
exports.handToString = hand => {
	const reds = hand.reds > 0 ? `${hand.reds}R` : '';
	const blues = hand.blues > 0 ? `${hand.blues}B` : '';

	return reds + blues;
};

// (s: String) => String
exports.capitalize = s => {
	return s.charAt(0).toUpperCase() + s.slice(1);
};

// (xs: List[A], opt: Option[A]) => List[A]
exports.pushOpt = (xs, opt) => {
	return xs.concat(opt.map(x => List([x])).valueOrElse(List()))
}