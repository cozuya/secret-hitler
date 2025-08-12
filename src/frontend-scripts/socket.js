// import io from 'socket.io-client';

// export default io({ reconnect: false });

// ❌ hard-coded
// const socket = io('http://localhost:8080');

// ✅ let Vite proxy / same-origin in dev

import io from 'socket.io-client';

const socket = io('/', {
	path: '/socket.io',
	transports: ['websocket', 'polling'] // keep polling for v2
});

export default socket;
