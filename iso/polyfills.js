export default () => {
	if (!Array.prototype.find) {
		Array.prototype.find = function(predicate) {
			if (this === null) {
				throw new TypeError('Array.prototype.find called on null or undefined');
			}
			if (typeof predicate !== 'function') {
				throw new TypeError('predicate must be a function');
			}
			let list = Object(this),
				length = list.length >>> 0,
				thisArg = arguments[1],
				value;

			for (let i = 0; i < length; i++) {
				value = list[i];
				if (predicate.call(thisArg, value, i, list)) {
					return value;
				}
			}

			return undefined;
		}
	}
}