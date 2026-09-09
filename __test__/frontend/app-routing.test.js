import { App } from "../../src/frontend-scripts/components/App";
import socket from "../../src/frontend-scripts/socket";
import Swal from "sweetalert2";
import { updateGameInfo } from "../../src/frontend-scripts/actions/actions";

describe("App startup routing", () => {
  let app;

  beforeEach(() => {
    jest.spyOn(socket, "emit").mockImplementation(() => socket);
    app = new App();
    app.props = { userInfo: { userName: "Ada", isSeated: false }, gameInfo: {}, dispatch: jest.fn() };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  const seatedGame = () => {
    app.props.userInfo.isSeated = true;
    app.props.gameInfo = {
      general: { uid: "live-game" },
      gameState: { isCompleted: false },
      publicPlayersState: [{ userName: "Ada" }],
    };
  };

  it("rejoins a seated player loading #/ without emitting leaveGame", () => {
    window.history.replaceState(null, "", "/game#/");
    seatedGame();
    app.socketReady = true;
    app.startRouting();
    expect(socket.emit).toHaveBeenCalledWith("getGameInfo", "live-game");
    expect(socket.emit.mock.calls.some(([event]) => event === "leaveGame")).toBe(false);
    expect(app.props.userInfo.isSeated).toBe(true);
  });

  it("still leaves on deliberate navigation from a table to the lobby", () => {
    window.history.replaceState(null, "", "/game#/");
    seatedGame();
    app.prevHash = "#/table/live-game";
    app.router();
    expect(socket.emit).toHaveBeenCalledWith("leaveGame", { userName: "Ada", uid: "live-game" });
  });

  it("retries a deep-link request after fallback routing, once readiness arrives", () => {
    window.history.replaceState(null, "", "/game#/table/target");
    app.startRouting();
    expect(socket.emit).toHaveBeenCalledWith("getGameInfo", "target");
    socket.emit.mockClear();
    app.socketReady = true;
    app.startRouting();
    expect(socket.emit).toHaveBeenCalledWith("getGameInfo", "target");
    socket.emit.mockClear();
    app.startRouting();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("retries the current hash after navigation during setup without leaving the fallback table", () => {
    window.history.replaceState(null, "", "/game#/table/old");
    app.startRouting();
    window.history.replaceState(null, "", "/game#/table/new");
    app.router(true);
    socket.emit.mockClear();
    app.socketReady = true;
    app.startRouting();
    expect(socket.emit.mock.calls).toEqual([["getGameInfo", "new"]]);
  });

  it("retries a seated game's request even if fallback already recorded its hash", () => {
    window.history.replaceState(null, "", "/game#/table/live-game");
    seatedGame();
    app.startRouting();
    socket.emit.mockClear();
    app.socketReady = true;
    app.startRouting();
    expect(socket.emit.mock.calls).toEqual([["getGameInfo", "live-game"]]);
  });

  describe("private chat deltas", () => {
    let handlers;

    beforeEach(() => {
      jest.useFakeTimers();
      handlers = {};
      jest.spyOn(socket, "on").mockImplementation((event, handler) => {
        handlers[event] = handler;
        return socket;
      });
      jest.spyOn(socket, "connect").mockImplementation(() => socket);
      jest.spyOn(window, "addEventListener").mockImplementation(() => {});
      app.componentDidMount();
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it.each([
      "playerChatUpdate",
      "gameModChat",
    ])("appends a styled %s message once and accepts later history", (event) => {
      const game = { general: { uid: "live-game" }, gameState: { isTracksFlipped: true }, chats: [] };
      const message = {
        gameChat: true,
        timestamp: new Date(),
        chat: [{ text: "Neighbor Chat: " }, { text: " :ja: ", type: "neighbor-chat" }],
      };
      app.props.gameInfo = game;
      handlers[event](message);
      const expectedGame = { ...game, chats: [message] };
      expect(app.props.dispatch).toHaveBeenLastCalledWith(updateGameInfo(expectedGame));
      app.props.gameInfo = expectedGame;
      const snapshot = { ...expectedGame, chats: [{ ...message }] };
      handlers.gameUpdate(snapshot);
      expect(snapshot.chats).toHaveLength(1);
      expect(app.props.dispatch).toHaveBeenLastCalledWith(updateGameInfo(snapshot));
    });
  });

  describe("deleted-game notification", () => {
    let toLobby;

    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(socket, "on").mockImplementation((event, handler) => {
        if (event === "toLobby") toLobby = handler;
        return socket;
      });
      jest.spyOn(socket, "connect").mockImplementation(() => socket);
      jest.spyOn(window, "addEventListener").mockImplementation(() => {});
      jest.spyOn(Swal, "fire").mockResolvedValue();
      app.componentDidMount();
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it("returns a player viewing the deleted table to the lobby and explains why", () => {
      window.history.replaceState(null, "", "/game#/table/deleted-game");
      toLobby("deleted-game");
      expect(window.location.hash).toBe("#/");
      expect(Swal.fire).toHaveBeenCalledWith("The game you were previously in was deleted automatically.");
    });

    it.each(["#/table/another-game", "#/profile/Ada", "#/"])("leaves an unrelated page unchanged (%s)", (hash) => {
      window.history.replaceState(null, "", `/game${hash}`);
      toLobby("deleted-game");
      expect(window.location.hash).toBe(hash);
      expect(Swal.fire).not.toHaveBeenCalled();
    });
  });
});
