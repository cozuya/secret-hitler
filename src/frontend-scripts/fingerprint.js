const getTouchSupport = () => {
	let maxTouchPoints = 0;
	let touchEvent = false;
	if (typeof navigator.maxTouchPoints !== 'undefined') {
		maxTouchPoints = navigator.maxTouchPoints;
	} else if (typeof navigator.msMaxTouchPoints !== 'undefined') {
		maxTouchPoints = navigator.msMaxTouchPoints;
	}
	try {
		document.createEvent('TouchEvent');
		touchEvent = true;
	} catch (_) {}
	const touchStart = 'ontouchstart' in window;
	return [maxTouchPoints, touchEvent, touchStart];
};
const getWebglVendorAndRenderer = () => {
	/* This a subset of the WebGL fingerprint with a lot of entropy, while being reasonably browser-independent */
	try {
		const canvas = document.createElement('canvas');
		let gl = null;
		try {
			gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
		} catch (e) {}
		if (!gl) return null;
		const extensionDebugRendererInfo = gl.getExtension('WEBGL_debug_renderer_info');
		return gl.getParameter(extensionDebugRendererInfo.UNMASKED_VENDOR_WEBGL) + '~' + gl.getParameter(extensionDebugRendererInfo.UNMASKED_RENDERER_WEBGL);
	} catch (e) {
		return null;
	}
};

module.exports.simpleFingerprint = () => {
	const keys = [];
	keys.push({ key: 'user_agent', value: navigator.userAgent });
	keys.push({ key: 'language', value: navigator.language || navigator.userLanguage || navigator.browserLanguage || navigator.systemLanguage || '' });
	keys.push({ key: 'device_memory', value: navigator.deviceMemory || -1 });
	keys.push({ key: 'pixel_ratio', value: window.devicePixelRatio || '' });
	keys.push({ key: 'hardware_concurrency', value: navigator.hardwareConcurrency || 'unknown' });

	let res = [];
	if (window.screen.availWidth && window.screen.availHeight) {
		res =
			window.screen.availHeight > window.screen.availWidth
				? [window.screen.availHeight, window.screen.availWidth]
				: [window.screen.availWidth, window.screen.availHeight];
	} else {
		res = window.screen.height > window.screen.width ? [window.screen.height, window.screen.width] : [window.screen.width, window.screen.height];
	}
	keys.push({ key: 'resolution', value: res[0] + 'x' + res[1] + '@' + (window.screen.colorDepth || -1) });

	keys.push({ key: 'timezone_offset', value: new Date().getTimezoneOffset() });
	keys.push({ key: 'navigator_platform', value: navigator.platform || 'unknown' });
	keys.push({ key: 'webgl_vendor', value: getWebglVendorAndRenderer() });
	keys.push({ key: 'touch_support', value: getTouchSupport() });
	return keys;
};
