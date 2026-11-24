const { switchGameRoom, cancelGameRoomSwitch } = require("../../routes/socket/game-room");

// Socket.IO 2.x filters joins against the still-current socket.rooms and updates
// the room bookkeeping from adapter callbacks, so the mock defers them as well.
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
    join(room, callback) {
      calls.join.push(room);
      if (rooms.has(room)) {
        if (callback) callback(null);
        return;
      }
      queue.push(() => {
        rooms.add(room);
        if (callback) callback(null);
      });
    },
    leave(room, callback) {
      calls.leave.push(room);
      queue.push(() => {
        rooms.delete(room);
        if (callback) callback(null);
      });
    },
    async flush() {
      for (let step = 0; step < 40; step++) {
        queue.splice(0).forEach((apply) => apply());
        await Promise.resolve();
      }
    },
    get roomSet() {
      return new Set(rooms);
    },
    calls,
  };
};

const games = { gameA: {}, gameB: {}, gameC: {} };

test("reopening the current table does not leave it", async () => {
  const socket = makeSocket("socket-1", ["socket-1", "gameA"]);
  socket.currentGameRoom = "gameA";

  const change = switchGameRoom(socket, "gameA", games);
  await socket.flush();
  await change;

  expect(socket.calls.leave).not.toContain("gameA");
  expect(socket.calls.join).toContain("gameA");
  expect(socket.roomSet).toEqual(new Set(["socket-1", "gameA"]));
  expect(socket.currentGameRoom).toBe("gameA");
});

test("back-to-back switches leave only the last requested table", async () => {
  const socket = makeSocket("socket-1", ["socket-1", "gameA"]);
  socket.currentGameRoom = "gameA";

  const changes = [switchGameRoom(socket, "gameB", games), switchGameRoom(socket, "gameC", games)];
  await socket.flush();
  await Promise.all(changes);

  expect(socket.currentGameRoom).toBe("gameC");
  expect(socket.roomSet).toEqual(new Set(["socket-1", "gameC"]));
  expect(socket.calls.join).toEqual(["gameB", "gameC"]);
});

test("returning to the original table is not skipped", async () => {
  const socket = makeSocket("socket-1", ["socket-1", "gameA"]);
  socket.currentGameRoom = "gameA";

  const changes = [switchGameRoom(socket, "gameB", games), switchGameRoom(socket, "gameA", games)];
  await socket.flush();
  await Promise.all(changes);

  expect(socket.currentGameRoom).toBe("gameA");
  expect(socket.roomSet).toEqual(new Set(["socket-1", "gameA"]));
  expect(socket.calls.join).toEqual(["gameB", "gameA"]);
});

test("an explicit leave cancels the pending switch and allows a later rejoin", async () => {
  const socket = makeSocket("socket-1", ["socket-1", "gameA"]);
  socket.currentGameRoom = "gameA";

  const canceledSwitch = switchGameRoom(socket, "gameB", games);
  cancelGameRoomSwitch(socket, "gameB");
  await socket.flush();
  expect(await canceledSwitch).toBe(false);
  expect(socket.roomSet.has("gameB")).toBe(false);

  const laterSwitch = switchGameRoom(socket, "gameB", games);
  await socket.flush();
  expect(await laterSwitch).toBe(true);
  expect(socket.roomSet).toEqual(new Set(["socket-1", "gameB"]));
});
