const { switchGameRoom } = require("../../routes/socket/game-room");

const makeSocket = (id, initialRooms) => {
  const rooms = new Set(initialRooms);
  const queue = [];
  const calls = { join: [], leave: [] };

  return {
    id,
    currentGameRoom: undefined,
    get rooms() {
      return Object.fromEntries([...rooms].map((room) => [room, room]));
    },
    join(room) {
      calls.join.push(room);
      queue.push(() => rooms.add(room));
    },
    leave(room) {
      calls.leave.push(room);
      queue.push(() => rooms.delete(room));
    },
    flush() {
      queue.splice(0).forEach((apply) => apply());
    },
    get roomSet() {
      return new Set(rooms);
    },
    calls,
  };
};

const games = { gameA: {}, gameB: {}, gameC: {} };

test("reopening the current table does not leave it", () => {
  const socket = makeSocket("socket-1", ["socket-1", "gameA"]);
  socket.currentGameRoom = "gameA";

  switchGameRoom(socket, "gameA", games);
  socket.flush();

  expect(socket.calls.leave).not.toContain("gameA");
  expect(socket.calls.join).toContain("gameA");
  expect(socket.roomSet.has("gameA")).toBe(true);
  expect(socket.currentGameRoom).toBe("gameA");
});

test("back-to-back switches leave only the last requested table", () => {
  const socket = makeSocket("socket-1", ["socket-1", "gameA"]);
  socket.currentGameRoom = "gameA";

  switchGameRoom(socket, "gameB", games);
  // Socket.IO applies room changes on the next tick, so gameA is still visible here.
  expect(socket.rooms).toHaveProperty("gameA");

  switchGameRoom(socket, "gameC", games);
  socket.flush();

  expect(socket.currentGameRoom).toBe("gameC");
  expect(socket.roomSet.has("gameC")).toBe(true);
  expect(socket.roomSet.has("gameA")).toBe(false);
  expect(socket.roomSet.has("gameB")).toBe(false);
  expect(socket.calls.join).toEqual(["gameB", "gameC"]);
});
