const canvas = document.createElement('canvas');
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
	let touchStart = 'ontouchstart' in window;
	return [maxTouchPoints, touchEvent, touchStart];
};
const getWebglVendorAndRenderer = () => {
	/* This a subset of the WebGL fingerprint with a lot of entropy, while being reasonably browser-independent */
	try {
		let gl = null;
		try {
			gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
		} catch (e) {}
		if (!gl) return null;
		let extensionDebugRendererInfo = gl.getExtension('WEBGL_debug_renderer_info');
		return [gl.getParameter(extensionDebugRendererInfo.UNMASKED_VENDOR_WEBGL), gl.getParameter(extensionDebugRendererInfo.UNMASKED_RENDERER_WEBGL)];
	} catch (e) {
		return null;
	}
};
module.exports.simpleFingerprint = () => {
	let keys = {};
	keys.user_agent = navigator.userAgent;
	keys.language = navigator.language || navigator.userLanguage || navigator.browserLanguage || navigator.systemLanguage || ''; // System language.
	keys.device_memory = navigator.deviceMemory || -1; // Amount of memory available to the browser, not always total memory.
	keys.pixel_ratio = window.devicePixelRatio || ''; // Typically 1, but might vary.
	keys.hardware_concurrency = navigator.hardwareConcurrency || 'unknown'; // Number of physical cores, possibly includes hyper-threading.

	let res = [];
	if (window.screen.availWidth && window.screen.availHeight) {
		res =
			window.screen.availHeight > window.screen.availWidth
				? [window.screen.availHeight, window.screen.availWidth]
				: [window.screen.availWidth, window.screen.availHeight];
	} else {
		res = window.screen.height > window.screen.width ? [window.screen.height, window.screen.width] : [window.screen.width, window.screen.height];
	}
	keys.resolution = [res[0], res[1], window.screen.colorDepth || -1];

	keys.timezone_offset = new Date().getTimezoneOffset(); // Appears to be number of minutes to add to get to GMT+0 time. GMT+1 is -60, for instance.
	keys.navigator_platform = navigator.platform || 'unknown'; // Operating system simple ID.
	keys.webgl_vendor = getWebglVendorAndRenderer(); // Basic GPU info.
	keys.touch_support = getTouchSupport(); // Touch-screen info.
	return keys;
};
