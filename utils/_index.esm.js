// src/shared/util.esm.js
import {
	filterOpt,
	flattenListOpts,
	pushOpt,
	mapOpt1,
	mapOpt2,
	handDiff,
	handToPolicy,
	policyToHand,
	policyToString,
	handToPolicies,
	text,
	handToText,
	capitalize,
	objectContains,
	userInBlacklist,
	getBlacklistIndex
} from './index.cjs';

// Create a util object with all imported functions
const util = {
	filterOpt,
	flattenListOpts,
	pushOpt,
	mapOpt1,
	mapOpt2,
	handDiff,
	handToPolicy,
	policyToHand,
	policyToString,
	handToPolicies,
	text,
	handToText,
	capitalize,
	objectContains,
	userInBlacklist,
	getBlacklistIndex
};

export default util;
export {
	filterOpt,
	flattenListOpts,
	pushOpt,
	mapOpt1,
	mapOpt2,
	handDiff,
	handToPolicy,
	policyToHand,
	policyToString,
	handToPolicies,
	text,
	handToText,
	capitalize,
	objectContains,
	userInBlacklist,
	getBlacklistIndex
};
