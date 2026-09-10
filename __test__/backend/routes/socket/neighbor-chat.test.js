let models, Game, runCommand, handleAddNewGameChat, generateGameObject, sendInProgressGameUpdate;
const originalIo = global.io;
let game, sockets;

beforeAll(() => {
  jest.resetModules();
  jest.useFakeTimers();
  const redis = require("redis");
  jest.spyOn(redis, "createClient").mockReturnValue({ on: jest.fn(), get: jest.fn(), set: jest.fn() });
  const Account = require("../../../../models/account");
  jest.spyOn(Account, "find").mockResolvedValue([]);
  const BannedIP = require("../../../../models/bannedIP");
  jest.spyOn(BannedIP, "deleteMany").mockImplementation((query, callback) => callback(null));
  models = require("../../../../routes/socket/models");
  jest.spyOn(models, "getPrivateChatTruncate").mockReturnValue(null);
  ({ runCommand } = require("../../../../routes/socket/commands"));
  ({ handleAddNewGameChat } = require("../../../../routes/socket/user-events/chat"));
  ({ generateGameObject } = require("../../../../routes/socket/game/end-game"));
  Game = require("../../../../models/game");
  ({ sendInProgressGameUpdate } = require("../../../../routes/socket/util"));
});

beforeEach(() => {
  jest.clearAllMocks();
  models.getPrivateChatTruncate.mockReturnValue(null);
  const players = Array.from({ length: 7 }, (_, index) => ({
    userName: `Player${index + 1}`,
    isDead: false,
    leftGame: false,
  }));
  game = {
    general: {
      uid: "NeighborChatTest",
      neighborChat: true,
      playerChats: "enabled",
      whitelistedPlayers: [],
    },
    gameState: { isStarted: true, isTracksFlipped: true, phase: "selectingChancellor" },
    publicPlayersState: players,
    playersState: [],
    cardFlingerState: [],
    trackState: {},
    chats: [],
    private: {
      seatedPlayers: players.map((player) => ({ userName: player.userName, gameChats: [], playersState: [] })),
      commandChats: {},
      unSeatedGameChats: [],
      replayGameChats: [],
      neighborChats: [],
      hiddenInfoChat: [],
      hiddenInfoSubscriptions: ["Moderator"],
    },
  };
  sockets = {};
  for (const name of [...players.map((player) => player.userName), "Observer", "Moderator", "UnsubscribedMod"]) {
    sockets[name] = {
      handshake: { session: { passport: { user: name } } },
      emit: jest.fn(),
    };
    models.userList.push({ userName: name, xpOverall: 20, status: { type: "none" } });
  }
  sockets.Anonymous = { handshake: { session: {} }, emit: jest.fn() };
  global.io = {
    sockets: {
      sockets,
      connected: sockets,
      adapter: {
        rooms: { NeighborChatTest: { sockets: Object.fromEntries(Object.keys(sockets).map((id) => [id, true])) } },
      },
    },
  };
});

afterEach(() => {
  models.userList.length = 0;
  global.io = originalIo;
});

describe.each([true, false])("replay setting persistence (completed: %s)", (completed) => {
  it.each([true, false, undefined])("preserves neighborChat=%s through the archive schema", async (neighborChat) => {
    game.general.neighborChat = neighborChat;
    if (neighborChat) run("/r private archive");
    game.gameState.isCompleted = completed ? "liberal" : false;
    let storedGame;
    const insert = jest.spyOn(Game.collection, "insertOne").mockImplementation((document, options, callback) => {
      storedGame = document;
      callback(null, { insertedId: document._id });
    });

    try {
      await new Game(generateGameObject(game)).save();
      expect(insert).toHaveBeenCalledTimes(1);
      expect(storedGame.completed).toBe(completed);
      expect(storedGame.neighborChat).toBe(neighborChat);
      expect(storedGame.neighborChats).toHaveLength(neighborChat ? 1 : 0);
      expect(storedGame.chats).toEqual([]);
      if (neighborChat)
        expect(storedGame.neighborChats[0].neighborChat).toMatchObject({ sender: "Player1", recipient: "Player2" });
      const replay = JSON.parse(JSON.stringify(Game.hydrate(storedGame)));
      expect(replay.neighborChat).toBe(neighborChat);
      if (neighborChat === undefined) expect(replay).not.toHaveProperty("neighborChat");
    } finally {
      insert.mockRestore();
    }
  });
});

afterAll(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it("persists report evidence independently of saving the game archive", async () => {
  const PlayerReport = require("../../../../models/playerReport");
  run("/r reported message");
  const message = game.private.neighborChats[0];
  let stored;
  const insert = jest.spyOn(PlayerReport.collection, "insertOne").mockImplementation((document, options, callback) => {
    stored = document;
    callback(null, { insertedId: document._id });
  });
  try {
    await new PlayerReport({
      gameUid: game.general.uid,
      neighborMessageId: message.neighborChat.id,
      neighborChatContext: [message],
    }).save();
    expect(stored.neighborMessageId).toBe(message.neighborChat.id);
    expect(stored.neighborChatContext[0]).toEqual(message);
  } finally {
    insert.mockRestore();
  }
});

const textOf = (chat) => chat.chat.map((segment) => segment.text).join("");
const run = (
  message,
  name = "Player1",
  aem = false,
  seated = game.publicPlayersState.some((p) => p.userName === name)
) =>
  runCommand(
    sockets[name],
    sockets[name].handshake.session.passport,
    models.userList.find((user) => user.userName === name),
    game,
    message,
    aem,
    seated
  );
const addChat = (chat, name = "Player1", mods = []) =>
  handleAddNewGameChat(
    sockets[name],
    sockets[name].handshake.session.passport,
    { uid: game.general.uid, chat },
    game,
    mods,
    [],
    [],
    jest.fn(),
    false
  );
const deliveredChats = (name) =>
  sockets[name].emit.mock.calls
    .filter(([event]) => event === "playerChatUpdate" || event === "gameModChat")
    .map(([, chat]) => chat);
const expectRefusal = (message, name = "Player1") => {
  expect(game.private.commandChats[name].map(textOf)).toEqual([message]);
  expect(game.private.seatedPlayers.flatMap((player) => player.gameChats)).toEqual([]);
  expect(game.chats).toEqual([]);
  expect(game.private.neighborChats).toEqual([]);
  expect(game.private.hiddenInfoChat).toEqual([]);
  expect(deliveredChats(name).map(textOf)).toEqual([message]);
  expect(sockets[name].emit).toHaveBeenCalledTimes(1);
  for (const [otherName, socket] of Object.entries(sockets)) {
    if (otherName !== name) expect(socket.emit).not.toHaveBeenCalled();
  }
};
const expectDelivery = (senderSeat, recipientSeat, direction, message = "hello") => {
  const sender = game.private.seatedPlayers[senderSeat - 1];
  const recipient = game.private.seatedPlayers[recipientSeat - 1];
  expect(sender.gameChats.map(textOf)).toEqual([
    `to ${direction} (#${recipientSeat} Player${recipientSeat}): ${message}`,
  ]);
  expect(recipient.gameChats.map(textOf)).toEqual([
    `${direction === "right" ? "← from left" : "→ from right"} (#${senderSeat} Player${senderSeat}): ${message}`,
  ]);
  for (const player of game.private.seatedPlayers) {
    expect(deliveredChats(player.userName)).toEqual(player.gameChats);
    if (player !== sender && player !== recipient) expect(player.gameChats).toEqual([]);
  }
  expect(game.chats).toEqual([]);
  expect(game.private.neighborChats.map(textOf)).toEqual([
    `Neighbor Chat - (#${senderSeat} Player${senderSeat}) to ${direction} (#${recipientSeat} Player${recipientSeat}): ${message}`,
  ]);
  expect(game.private.hiddenInfoChat).toEqual(game.private.neighborChats);
  expect(deliveredChats("Moderator")).toEqual(game.private.hiddenInfoChat);
  for (const name of ["Observer", "Anonymous", "UnsubscribedMod"]) expect(deliveredChats(name)).toEqual([]);
  for (const chat of [...sender.gameChats, ...recipient.gameChats, ...game.private.neighborChats]) {
    expect(chat).toMatchObject({ gameChat: true, timestamp: expect.any(Date) });
    expect(chat.chat[1]).toEqual({ text: message, type: "neighbor-chat" });
  }
  for (const [name, socket] of Object.entries(sockets)) {
    if (name === sender.userName || name === recipient.userName) {
      expect(socket.emit.mock.calls).toEqual([["playerChatUpdate", deliveredChats(name)[0]]]);
    } else if (name === "Moderator") {
      expect(socket.emit.mock.calls).toEqual([["gameModChat", game.private.hiddenInfoChat[0]]]);
    } else {
      expect(socket.emit).not.toHaveBeenCalled();
    }
  }
};

describe("Neighbor Chat routing and delivery", () => {
  it("keeps edits to moderation history separate from replay history", () => {
    run("/r hello");
    const replay = game.private.neighborChats[0];
    const originalTime = replay.timestamp.getTime();
    const moderation = game.private.hiddenInfoChat[0];
    moderation.chat[1].text = "redacted";
    moderation.timestamp.setTime(0);
    expect(textOf(replay)).toBe("Neighbor Chat - (#1 Player1) to right (#2 Player2): hello");
    expect(replay.timestamp.getTime()).toBe(originalTime);
  });

  it.each([
    ["r", 1, 2, "right"],
    ["l", 7, 6, "left"],
    ["r", 7, 1, "right"],
    ["l", 1, 7, "left"],
  ])("/%s from seat %i reaches seat %i", (command, sender, recipient, direction) => {
    run(`/${command} hello`, `Player${sender}`);
    expectDelivery(sender, recipient, direction);
  });

  it.each([
    ["r", "right", "isDead", 2, 3],
    ["r", "right", "leftGame", 2, 3],
    ["l", "left", "isDead", 7, 6],
    ["l", "left", "leftGame", 7, 6],
  ])("/%s skips a seat marked %s/%s", (command, direction, flag, skipped, recipient) => {
    game.publicPlayersState[skipped - 1][flag] = true;
    run(`/${command} hello`);
    expectDelivery(1, recipient, direction);
  });

  it.each([
    ["r", "right", 1, [2, 3, 4], 5],
    ["l", "left", 7, [6, 5, 4], 3],
  ])("/%s skips consecutive dead and left seats", (command, direction, sender, skipped, recipient) => {
    skipped.forEach((seat, index) => {
      game.publicPlayersState[seat - 1][index === 1 ? "leftGame" : "isDead"] = true;
    });
    run(`/${command} hello`, `Player${sender}`);
    expectDelivery(sender, recipient, direction);
  });

  it("resolves again after a neighbor reconnects", () => {
    game.publicPlayersState[1].leftGame = true;
    run("/r first");
    expect(game.private.seatedPlayers[1].gameChats).toEqual([]);
    expect(game.private.seatedPlayers[2].gameChats.map(textOf)).toEqual(["← from left (#1 Player1): first"]);
    game.publicPlayersState[1].leftGame = false;
    run("/r second");
    expect(game.private.seatedPlayers[1].gameChats.map(textOf)).toEqual(["← from left (#1 Player1): second"]);
    expect(game.private.seatedPlayers[2].gameChats).toHaveLength(1);
    expect(game.private.neighborChats).toHaveLength(2);
  });

  it.each([
    ["l", "left"],
    ["r", "right"],
  ])("/%s reaches the sole other eligible player with the opposite recipient direction", (command, direction) => {
    game.publicPlayersState.forEach((player, index) => {
      player.isDead = index !== 0 && index !== 3;
    });
    run(`/${command} hello`);
    expectDelivery(1, 4, direction);
  });

  it("uses only isDead and leftGame to determine eligibility", () => {
    game.publicPlayersState[1].connected = false;
    game.publicPlayersState[1].isAway = true;
    run("/r hello");
    expectDelivery(1, 2, "right");
  });

  it.each(["l", "r"])("/%s refuses when all other seats are dead or left", (direction) => {
    game.publicPlayersState.slice(1).forEach((player, index) => {
      player[index % 2 ? "isDead" : "leftGame"] = true;
    });
    run(`/${direction} hello`);
    expectRefusal("There is no one left to talk to.");
  });

  it.each([
    ["r", "right", 2, "← from left"],
    ["l", "left", 7, "→ from right"],
  ])("/%s masks live names in blind mode but keeps full replay and moderation attribution", (command, direction, seat, from) => {
    game.general.blindMode = true;
    run(`/${command} hello`);
    expect(game.private.seatedPlayers[0].gameChats.map(textOf)).toEqual([`to ${direction} {${seat}}: hello`]);
    expect(game.private.seatedPlayers[seat - 1].gameChats.map(textOf)).toEqual([`${from} {1}: hello`]);
    for (const player of game.publicPlayersState) {
      expect(JSON.stringify(deliveredChats(player.userName))).not.toMatch(/Player[1-7]/);
    }
    expect(game.private.neighborChats.map(textOf)).toEqual([
      `Neighbor Chat - (#1 Player1) to ${direction} (#${seat} Player${seat}): hello`,
    ]);
    expect(deliveredChats("Moderator")).toEqual(game.private.neighborChats);
    game.gameState.isCompleted = "liberal";
    const archive = generateGameObject(game);
    expect(archive.chats).toEqual([]);
    expect(archive.neighborChats).toEqual(game.private.neighborChats);
    expect(archive.hiddenInfoChat).toEqual(game.private.hiddenInfoChat);
  });
});

describe("Neighbor Chat incremental delivery", () => {
  it("sends each in-room session its own view and ignores sockets outside the room", () => {
    const room = global.io.sockets.adapter.rooms.NeighborChatTest.sockets;
    for (const name of ["Player1", "Player2", "Moderator"]) {
      sockets[`${name}SecondTab`] = {
        handshake: { session: { passport: { user: name } } },
        emit: jest.fn(),
      };
      room[`${name}SecondTab`] = true;
    }
    sockets.Elsewhere = { handshake: { session: { passport: { user: "Player2" } } }, emit: jest.fn() };
    room.Disconnected = true;
    run("/r hello");
    for (const name of ["Player1", "Player2", "Moderator"]) {
      expect(sockets[`${name}SecondTab`].emit.mock.calls).toEqual(sockets[name].emit.mock.calls);
      expect(sockets[name].emit).toHaveBeenCalledTimes(1);
    }
    expect(sockets.Elsewhere.emit).not.toHaveBeenCalled();
    expect(sockets.Observer.emit).not.toHaveBeenCalled();
  });

  it("never sends the moderator view to seated subscribers, including the sender and recipient", () => {
    game.general.blindMode = true;
    game.private.hiddenInfoSubscriptions.push("Player1", "Player2", "Player3");
    run("/r hello");
    expect(deliveredChats("Player1").map(textOf)).toEqual(["to right {2}: hello"]);
    expect(deliveredChats("Player2").map(textOf)).toEqual(["← from left {1}: hello"]);
    expect(sockets.Player1.emit.mock.calls[0][0]).toBe("playerChatUpdate");
    expect(sockets.Player2.emit.mock.calls[0][0]).toBe("playerChatUpdate");
    expect(sockets.Player3.emit).not.toHaveBeenCalled();
    expect(sockets.Player1.emit).toHaveBeenCalledTimes(1);
    expect(sockets.Player2.emit).toHaveBeenCalledTimes(1);
    expect(deliveredChats("Moderator").map(textOf)).toEqual([
      "Neighbor Chat - (#1 Player1) to right (#2 Player2): hello",
    ]);
  });

  it("stops sending moderator deltas when the subscription is removed", () => {
    run("/r first");
    game.private.hiddenInfoSubscriptions = [];
    jest.clearAllMocks();
    run("/r second");
    expect(sockets.Moderator.emit).not.toHaveBeenCalled();
    expect(game.private.hiddenInfoChat).toHaveLength(2);
  });

  it("retains missed messages for a reconnect and does not resend old history with new deltas", () => {
    const recipientSocket = sockets.Player2;
    delete sockets.Player2;
    run("/r missed");
    sockets.Player2 = recipientSocket;
    run("/r current");
    expect(deliveredChats("Player2").map(textOf)).toEqual(["← from left (#1 Player1): current"]);

    jest.clearAllMocks();
    sendInProgressGameUpdate(game);
    const snapshot = sockets.Player2.emit.mock.calls[0][1];
    expect(sockets.Player2.emit.mock.calls[0][0]).toBe("gameUpdate");
    expect(snapshot.chats.map(textOf)).toEqual([
      "← from left (#1 Player1): missed",
      "← from left (#1 Player1): current",
    ]);
    expect(sockets.Player3.emit.mock.calls[0][1].chats).toEqual([]);
    expect(sockets.Moderator.emit.mock.calls[0][1].chats).toEqual(game.private.hiddenInfoChat);
    game.gameState.isCompleted = "liberal";
    expect(generateGameObject(game).chats).toEqual([]);
    expect(generateGameObject(game).neighborChats).toEqual(game.private.neighborChats);
  });

  it("keeps per-message payload size independent of accumulated history", () => {
    const payloadBytes = () =>
      Buffer.byteLength(JSON.stringify(Object.values(sockets).map((socket) => socket.emit.mock.calls)));
    run("/r hello");
    const emptyHistoryBytes = payloadBytes();
    const history = Array.from({ length: 500 }, () => ({ chat: "old message ".repeat(20) }));
    game.chats.push(...history);
    for (const player of game.private.seatedPlayers) player.gameChats.push(...history);
    game.private.commandChats.Player1.push(...history);
    game.private.hiddenInfoChat.push(...history);
    jest.clearAllMocks();
    run("/r hello");
    expect(payloadBytes()).toBe(emptyHistoryBytes);
    expect(sockets.Player3.emit).not.toHaveBeenCalled();
  });

  it("sends only new usage feedback when the caller already has command history", () => {
    run("/help");
    const oldLength = game.private.commandChats.Player1.length;
    jest.clearAllMocks();
    run("/r");
    expect(game.private.commandChats.Player1).toHaveLength(oldLength + 1);
    expect(deliveredChats("Player1").map(textOf)).toEqual(["You're not doing this right. Some examples: /r <message>"]);
    for (const [name, socket] of Object.entries(sockets)) {
      expect(socket.emit).toHaveBeenCalledTimes(name === "Player1" ? 1 : 0);
    }
  });
});

describe("private Neighbor Chat retention", () => {
  const histories = () => [
    game.private.seatedPlayers[0].gameChats,
    game.private.seatedPlayers[1].gameChats,
    game.private.hiddenInfoChat,
  ];
  const neighbors = (history) => history.filter((chat) => chat.chat?.[1]?.type === "neighbor-chat");

  it.each([
    "enabled",
    "emotes",
  ])("bounds live private histories with %s chat without removing gameplay records", (chatMode) => {
    game.general.private = true;
    game.general.playerChats = chatMode;
    const role = { gameChat: true, chat: [{ text: "Your role is " }, { text: "liberal", type: "liberal" }] };
    const policy = { gameChat: true, chat: [{ text: "A policy was enacted." }] };
    for (const history of histories()) history.push(role);
    for (let index = 0; index < 75; index++) {
      if (index === 35) for (const history of histories()) history.push(policy);
      run(`/r ${index}`);
    }
    const expectedMessages = Array.from({ length: 30 }, (_, index) => `${index + 45}`);
    for (const history of histories()) {
      expect(neighbors(history).map((chat) => chat.chat[1].text)).toEqual(expectedMessages);
      expect(history.filter((chat) => !neighbors([chat]).length)).toEqual([role, policy]);
    }
    expect(game.chats).toEqual([]);
    expect(sockets.Player2.emit).toHaveBeenCalledTimes(75);
    expect(deliveredChats("Player2")[74].chat[1].text).toBe("74");
    expect(sockets.Player3.emit).not.toHaveBeenCalled();

    jest.clearAllMocks();
    sendInProgressGameUpdate(game);
    const snapshot = sockets.Player2.emit.mock.calls[0][1];
    expect(snapshot.chats).toEqual(game.private.seatedPlayers[1].gameChats);
    expect(neighbors(snapshot.chats)).toHaveLength(30);
    game.gameState.isCompleted = "liberal";
    const archive = generateGameObject(game);
    expect(archive.chats).toEqual([]);
    expect(archive.neighborChats).toEqual(game.private.neighborChats);
    expect(archive.hiddenInfoChat).toEqual(game.private.hiddenInfoChat);
    expect(archive.neighborChats).toHaveLength(75);
    expect(neighbors(archive.hiddenInfoChat)).toHaveLength(30);
  });

  it.each([false, undefined])("keeps public game history complete (private flag %s)", (privateFlag) => {
    game.general.private = privateFlag;
    for (let index = 0; index < 75; index++) run(`/r ${index}`);
    for (const history of histories()) expect(neighbors(history)).toHaveLength(75);
  });
});

describe("Neighbor Chat guards", () => {
  it("refuses a muted sender without recording or delivering a message", () => {
    game.private.seatedPlayers[0].neighborChatMuted = true;
    run("/r hello");
    expectRefusal("Unmute Neighbor Chat before sending a message.");
  });

  it("refuses a muted recipient without redirecting the message to another neighbor", () => {
    game.private.seatedPlayers[1].neighborChatMuted = true;
    run("/r hello");
    expectRefusal("This neighbor is not accepting Neighbor Chat.");
    game.private.seatedPlayers[1].neighborChatMuted = false;
    jest.clearAllMocks();
    run("/r hello");
    expectDelivery(1, 2, "right");
  });

  it("restores only the viewer's mute preference in reconnect snapshots", () => {
    game.private.seatedPlayers[0].neighborChatMuted = true;
    sendInProgressGameUpdate(game);
    expect(sockets.Player1.emit.mock.calls[0][1].neighborChatMuted).toBe(true);
    expect(sockets.Player2.emit.mock.calls[0][1].neighborChatMuted).toBe(false);
    expect(sockets.Observer.emit.mock.calls[0][1]).not.toHaveProperty("neighborChatMuted");
  });

  it("caps accepted messages while retaining earlier evidence", () => {
    const { MAX_NEIGHBOR_MESSAGES } = require("../../../../routes/socket/neighbor-chat");
    game.private.neighborChats = Array.from({ length: MAX_NEIGHBOR_MESSAGES - 1 }, () => ({ chat: "old evidence" }));
    run("/r last allowed message");
    expect(game.private.neighborChats).toHaveLength(MAX_NEIGHBOR_MESSAGES);
    const history = JSON.stringify(game.private.neighborChats);
    jest.clearAllMocks();
    run("/r over limit");
    expect(JSON.stringify(game.private.neighborChats)).toBe(history);
    expect(sockets.Player2.emit).not.toHaveBeenCalled();
    expect(deliveredChats("Player1").map(textOf)).toEqual([
      "Neighbor Chat has reached this game's message limit. Please use public chat.",
    ]);
  });

  it.each([false, undefined])("refuses when the mode flag is %s", (flag) => {
    game.general.neighborChat = flag;
    run("/r hello");
    expectRefusal("Neighbor Chat is not enabled in this game.");
  });

  it.each(["isDead", "leftGame"])("refuses a sender marked %s, including seated staff", (flag) => {
    game.publicPlayersState[0][flag] = true;
    run("/r hello", "Player1", true);
    expectRefusal("Only living players who have not left can use Neighbor Chat.");
  });

  it("refuses even if a caller incorrectly marks an unseated user as seated", () => {
    run("/r hello", "Observer", false, true);
    expectRefusal("Only living players who have not left can use Neighbor Chat.", "Observer");
  });

  it.each([false, true])("refuses an observer with staff status %s", (aem) => {
    run("/l hello", "Observer", aem);
    expectRefusal("This command cannot be used by observers.", "Observer");
  });

  it.each(["not started", "completed"])("refuses a game that is %s", (state) => {
    if (state === "completed") game.gameState.isCompleted = "liberal";
    else game.gameState.isStarted = false;
    run("/r hello");
    expectRefusal("This command can only be used during an in-progress game.");
  });

  it("refuses during the startup countdown before private chat state exists", () => {
    game.gameState.isTracksFlipped = false;
    delete game.private.seatedPlayers;
    expect(() => run("/r hello")).not.toThrow();
    expect(game.private.commandChats.Player1.map(textOf)).toEqual(["Neighbor Chat is not ready yet."]);
    expect(game.private.neighborChats).toEqual([]);
    expect(game.private.hiddenInfoChat).toEqual([]);
    expect(deliveredChats("Player1").map(textOf)).toEqual(["Neighbor Chat is not ready yet."]);
  });

  it("refuses silent games even for seated staff", () => {
    game.general.playerChats = "disabled";
    run("/r hello", "Player1", true);
    expectRefusal("Chat is disabled in this game.");
  });

  it("refuses Flappy pre-lock even for seated staff", () => {
    game.gameState.phase = "flappyHitler";
    game.flappyState = { isActive: true, lockedIn: false };
    run("/r hello", "Player1", true);
    expectRefusal("Chat is disabled until a bird clears the first gate.");
  });

  it("allows chat after Flappy locks in", () => {
    game.gameState.phase = "flappyHitler";
    game.flappyState = { isActive: true, lockedIn: true };
    run("/r hello");
    expectDelivery(1, 2, "right");
  });

  it.each(["l", "r"])("a bare /%s uses the existing usage response", (command) => {
    run(`/${command}`);
    expectRefusal(`You're not doing this right. Some examples: /${command} <message>`);
  });

  it("exposes the replay disclosure through /help", () => {
    run("/help");
    expect(game.private.commandChats.Player1.map(textOf)).toEqual(
      expect.arrayContaining([
        "/l - Messages your nearest living left neighbor; visible only to participants and authorized moderators, including afterwards.",
        "/r - Messages your nearest living right neighbor; visible only to participants and authorized moderators, including afterwards.",
      ])
    );
    // Other commands retain their existing full update path.
    for (const socket of Object.values(sockets)) {
      expect(socket.emit).toHaveBeenCalledTimes(1);
      expect(socket.emit.mock.calls[0][0]).toBe("gameUpdate");
    }
  });

  it.each([false, undefined])("omits neighbor commands from /help when the mode flag is %s", (flag) => {
    game.general.neighborChat = flag;
    run("/help");
    const help = game.private.commandChats.Player1.map(textOf);
    expect(help.some((line) => /^\/[lr] - /.test(line))).toBe(false);
    expect(help.some((line) => line.startsWith("/help - "))).toBe(true);
  });

  it("filters emote games even for seated staff", () => {
    game.general.playerChats = "emotes";
    run("/r secret :JA: 12 :notarealemote:", "Player1", true);
    expectDelivery(1, 2, "right", " :ja: 12");
  });

  it("refuses an empty emote-filter result", () => {
    game.general.playerChats = "emotes";
    run("/l secret :notarealemote:");
    expectRefusal("Only emotes and numbers are allowed in this game.");
  });
});

describe("Neighbor Chat through the existing chat handler", () => {
  it("delivers through addNewGameChat and the real per-player update path", async () => {
    await addChat("/r hello");
    expectDelivery(1, 2, "right");
  });

  it.each([null, 42, {}, []])("rejects non-string wire chat %j without throwing", async (chat) => {
    await expect(addChat(chat)).resolves.toBeUndefined();
    expect(game.private.neighborChats).toEqual([]);
    expect(sockets.Player1.emit).not.toHaveBeenCalled();
  });

  it("preserves the 300-character cap including the command prefix", async () => {
    await addChat(`/r ${"x".repeat(298)}`);
    expect(game.private.neighborChats).toEqual([]);
    await addChat(`/r ${"x".repeat(297)}`);
    expectDelivery(1, 2, "right", "x".repeat(297));
  });

  it("preserves the per-user command rate limit", async () => {
    await addChat("/r first");
    await addChat("/l second");
    expect(game.private.neighborChats).toHaveLength(1);
    models.userList.find((user) => user.userName === "Player1").lastMessage.timestamp = Date.now() - 1000;
    await addChat("/l second");
    expect(game.private.neighborChats).toHaveLength(2);
  });

  it.each([
    ["presidentSelectingPolicy", "isPresident"],
    ["presidentSelectingPolicy", "isChancellor"],
    ["chancellorSelectingPolicy", "isPresident"],
    ["chancellorSelectingPolicy", "isChancellor"],
  ])("preserves the %s government chat block for %s", async (phase, governmentStatus) => {
    game.gameState.phase = phase;
    game.publicPlayersState[0].governmentStatus = governmentStatus;
    await addChat("/r hello");
    expect(game.private.neighborChats).toEqual([]);
    expect(sockets.Player1.emit).not.toHaveBeenCalled();
  });

  it.each(["XP", "whitelist"])("preserves the observer %s gate before command dispatch", async (gate) => {
    if (gate === "XP") models.userList.find((user) => user.userName === "Observer").xpOverall = 0;
    else game.general.private = true;
    await addChat("/r hello", "Observer");
    expect(game.private.commandChats.Observer).toBeUndefined();
    expect(game.private.neighborChats).toEqual([]);
    expect(sockets.Observer.emit).not.toHaveBeenCalled();
  });
});

describe("public emote-chat extraction preserves the existing call site", () => {
  beforeEach(() => {
    game.general.playerChats = "emotes";
    game.general.neighborChat = false;
  });

  it("still filters public chat to emotes and digits", async () => {
    await addChat("text :JA: 12 :notarealemote:");
    expect(game.chats).toHaveLength(1);
    expect(game.chats[0].chat).toBe(" :ja: 12");
    expect(game.private.neighborChats).toEqual([]);
  });

  it("keeps the AEM observer carve-out", async () => {
    await addChat("unfiltered moderation message", "Moderator", ["Moderator"]);
    expect(game.chats[0].chat).toBe("unfiltered moderation message");
    expect(models.getPrivateChatTruncate).not.toHaveBeenCalled();
  });

  it("still filters seated AEM public messages", async () => {
    await addChat("text :JA: 12", "Player1", ["Player1"]);
    expect(game.chats[0].chat).toBe(" :ja: 12");
  });

  it.each([
    ["text :JA: 12", ["old2", "old3", " :ja: 12"]],
    ["text only", ["old2", "old3"]],
  ])("keeps private truncation and empty-result control flow for %j", async (chat, expected) => {
    game.general.private = true;
    game.chats = [0, 1, 2, 3].map((index) => ({ chat: `old${index}` }));
    models.getPrivateChatTruncate.mockReturnValue(2);
    await addChat(chat);
    expect(game.chats.map((entry) => entry.chat)).toEqual(expected);
  });
});
