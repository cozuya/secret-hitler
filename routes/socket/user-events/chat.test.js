const { handleAddNewGameChat } = require('./chat');

jest.mock('../models', () => ({
	userList: [],
	newStaff: { modUserNames: [], editorUserNames: [] },
	generalChats: { list: [], sticky: '' },
	getLastGenchatModPingAsync: jest.fn(),
	setLastGenchatModPingAsync: jest.fn(),
	emoteList: {},
	getPrivateChatTruncate: jest.fn()
}));
jest.mock('../report.js');
jest.mock('../chatReplacements', () => ({ chatReplacements: [] }));
jest.mock('../commands');
jest.mock('../util.js', () => ({
	sendInProgressGameUpdate: jest.fn(),
	sendPlayerChatUpdate: jest.fn(),
	sendCommandChatsUpdate: jest.fn()
}));
jest.mock('../util', () => ({
	sendInProgressGameUpdate: jest.fn(),
	sendPlayerChatUpdate: jest.fn(),
	sendCommandChatsUpdate: jest.fn()
}));

describe('handleAddNewGameChat', () => {
	const makeSocket = () => ({ emit: jest.fn() });
	const makeGame = (slowChatMode = false) => ({
		general: {
			uid: 'test-123',
			playerChats: 'enabled',
			disableObserver: false,
			disableObserverLobby: false,
			chatReplTime: Array(1).fill(0),
			slowChatMode
		},
		gameState: { isStarted: true, isCompleted: false, isTracksFlipped: true },
		publicPlayersState: [{ userName: 'alice' }],
		private: { seatedPlayers: [{ playersState: [{}] }] },
		chats: []
	});
	const makeUser = (overrides = {}) => ({
		userName: 'alice',
		staffRole: '',
		wins: 0,
		losses: 0,
		xpOverall: 0,
		isRainbowOverall: false,
		lastMessage: null,
		gameLastMessages: {},
		...overrides
	});

	beforeEach(() => {
		require('../models').userList.length = 0;
	});

	it('should allow normal chat when slowChatMode is off', async () => {
		const socket = makeSocket();
		const game = makeGame(false);
		const user = makeUser();
		require('../models').userList.push(user);

		await handleAddNewGameChat(
			socket,
			{ user: 'alice' },
			{ chat: 'hello world', uid: 'test-123' },
			game,
			[], [], []
		);

		expect(socket.emit).not.toHaveBeenCalled();
		expect(game.chats.length).toBeGreaterThan(0);
	});

	it('should allow first chat when slowChatMode is on', async () => {
		const socket = makeSocket();
		const game = makeGame(5);
		const user = makeUser();
		require('../models').userList.push(user);

		await handleAddNewGameChat(
			socket,
			{ user: 'alice' },
			{ chat: 'first', uid: 'test-123' },
			game,
			[], [], []
		);

		expect(socket.emit).not.toHaveBeenCalledWith('sendAlert', expect.stringContaining('Slow chat mode'));
	});

	it('should block rapid second chat when slowChatMode is on', async () => {
		const socket = makeSocket();
		const game = makeGame(5);
		const now = Date.now();
		const user = makeUser({
			lastMessage: { timestamp: now - 5000 },
			gameLastMessages: { 'test-123': now - 1000 }
		});
		require('../models').userList.push(user);

		await handleAddNewGameChat(
			socket,
			{ user: 'alice' },
			{ chat: 'second', uid: 'test-123' },
			game,
			[], [], []
		);

		expect(socket.emit).toHaveBeenCalledWith(
			'sendAlert',
			expect.stringContaining('Slow chat mode is on')
		);
		expect(game.chats.length).toBe(0);
	});
});
