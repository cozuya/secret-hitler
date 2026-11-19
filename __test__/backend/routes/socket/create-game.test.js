const Account = require("../../../../models/account");
const Game = require("../../../../models/game");
const { games, userList } = require("../../../../routes/socket/models");
const { handleAddNewGame } = require("../../../../routes/socket/user-events/create-game");

jest.mock("gfycat-style-urls", () => ({ generateCombination: () => "NeighborChatGame" }));
jest.mock("../../../../routes/socket/user-requests", () => ({
  updateUserStatus: jest.fn(),
  sendGameList: jest.fn(),
}));

describe("create-game Neighbor Chat", () => {
  const originalIo = global.io;
  let user;
  let socket;

  beforeEach(() => {
    user = { userName: "Creator", status: { type: "none" } };
    userList.push(user);
    socket = { join: jest.fn(), emit: jest.fn() };
    global.io = { sockets: { emit: jest.fn() } };
    jest.spyOn(Game, "findOne").mockResolvedValue(null);
    jest.spyOn(Account, "findOne").mockResolvedValue({ username: user.userName });
  });

  afterEach(() => {
    delete games.NeighborChatGame;
    userList.splice(userList.indexOf(user), 1);
    global.io = originalIo;
    jest.restoreAllMocks();
  });

  it.each([
    [{ neighborChat: false }, false],
    [{ neighborChat: false, playerChats: "disabled" }, false],
    [{}, false],
  ])("leaves a game without effective Neighbor Chat ranked (%j)", async (options, expected) => {
    await handleAddNewGame(
      socket,
      { user: user.userName },
      { gameName: "Neighbor Chat", gameType: "ranked", ...options }
    );

    expect(games.NeighborChatGame.general).toMatchObject({
      neighborChat: expected,
      casualGame: false,
      practiceGame: false,
    });
    expect(socket.emit).toHaveBeenCalledWith(
      "gameUpdate",
      expect.objectContaining({ general: expect.objectContaining({ neighborChat: expected }) })
    );
  });

  it.each([
    [{ gameType: "ranked" }],
    [{ gameType: "ranked", casualGame: false }],
    [{ gameType: "ranked", playerChats: "enabled", casualGame: false }],
    [{ gameType: "casual", casualGame: true }],
    // Practice and casual are mutually exclusive; Neighbor Chat wins, so the game is casual.
    [{ gameType: "practice", casualGame: false }],
    [{ gameType: "ranked", privatePassword: "pw", casualGame: false }],
    [{ gameType: "ranked", unlistedGame: true, casualGame: false }],
  ])("forces a Neighbor Chat game casual whatever the client sends (%j)", async (options) => {
    await handleAddNewGame(
      socket,
      { user: user.userName },
      { gameName: "Neighbor Chat", neighborChat: true, ...options }
    );

    expect(games.NeighborChatGame.general).toMatchObject({
      neighborChat: true,
      casualGame: true,
      practiceGame: false,
    });
    expect(socket.emit).toHaveBeenCalledWith(
      "gameUpdate",
      expect.objectContaining({ general: expect.objectContaining({ neighborChat: true, casualGame: true }) })
    );
  });

  it.each([
    "enabled",
    "disabled",
  ])("keeps a custom Neighbor Chat game in the (unrated) Custom type (%s chat)", async (playerChats) => {
    await handleAddNewGame(
      socket,
      { user: user.userName },
      {
        gameName: "Neighbor Chat",
        gameType: "custom",
        playerChats,
        neighborChat: true,
        minPlayersCount: 5,
        maxPlayersCount: 5,
        customGameSettings: {
          enabled: true,
          deckState: { lib: 6, fas: 11 },
          trackState: { lib: 0, fas: 0 },
          fascistCount: 1,
          hitlerZone: 1,
          vetoZone: 5,
          powers: [null, null, null, null, null],
        },
      }
    );

    expect(games.NeighborChatGame.customGameSettings.enabled).toBe(true);
    expect(games.NeighborChatGame.general).toMatchObject({
      neighborChat: true,
      casualGame: false,
      practiceGame: false,
    });
  });

  it.each([
    "ranked",
    "casual",
    "practice",
  ])("preserves silent public chat and forces Neighbor Chat casual for a %s request", async (gameType) => {
    await handleAddNewGame(
      socket,
      { user: user.userName },
      { gameName: "Silent neighbors", gameType, playerChats: "disabled", neighborChat: true, casualGame: false }
    );

    expect(games.NeighborChatGame.general).toMatchObject({
      playerChats: "disabled",
      neighborChat: true,
      casualGame: true,
      practiceGame: false,
    });
    expect(socket.emit).toHaveBeenCalledWith(
      "gameUpdate",
      expect.objectContaining({
        general: expect.objectContaining({ playerChats: "disabled", neighborChat: true, casualGame: true }),
      })
    );
  });

  it("keeps Neighbor Chat available in emote-only casual games", async () => {
    await handleAddNewGame(
      socket,
      { user: user.userName },
      {
        gameName: "Neighbor emotes",
        gameType: "casual",
        neighborChat: true,
        playerChats: "emotes",
      }
    );
    expect(games.NeighborChatGame.general).toMatchObject({ neighborChat: true, playerChats: "emotes" });
  });

  it.each(["blindMode", "avalonSH", "monarchistSH"])("keeps Neighbor Chat enabled with %s", async (mode) => {
    await handleAddNewGame(
      socket,
      { user: user.userName },
      {
        gameName: "Neighbor Chat",
        gameType: "ranked",
        neighborChat: true,
        [mode]: true,
      }
    );

    expect(games.NeighborChatGame.general.neighborChat).toBe(true);
  });

  it.each([
    "false",
    "true",
    0,
    1,
    null,
    {},
    [],
  ])("rejects an invalid Neighbor Chat flag %j before creating anything", async (neighborChat) => {
    await handleAddNewGame(socket, { user: user.userName }, { gameName: "Neighbor Chat", neighborChat });
    expect(games.NeighborChatGame).toBeUndefined();
    expect(Game.findOne).not.toHaveBeenCalled();
    expect(Account.findOne).not.toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
    expect(global.io.sockets.emit).not.toHaveBeenCalled();
    expect(user.status).toEqual({ type: "none" });
  });
});
