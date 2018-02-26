import io from 'socket.io-client';

export default io({ reconnect: false });
