import { App } from "../../src/frontend-scripts/components/App";
import socket from "../../src/frontend-scripts/socket";

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
});
