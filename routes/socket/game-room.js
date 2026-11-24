const settleRoomChange = (socket, method, room) => new Promise((resolve) => socket[method](room, resolve));
const pendingSwitches = new WeakMap();

const switchGameRoom = (socket, uid, games) => {
  const requests = pendingSwitches.get(socket) || new Set();
  pendingSwitches.set(socket, requests);
  const request = { uid };
  requests.add(request);
  const canceled = () => socket.disconnected || !requests.has(request);

  // Serialize switches so rapid changes settle first; joining again restores a lost room.
  socket.gameRoomSwitch = (socket.gameRoomSwitch || Promise.resolve())
    .then(async () => {
      if (canceled()) return false;
      for (const roomUid of Object.keys(socket.rooms)) {
        if (roomUid !== socket.id && roomUid !== uid && games[roomUid]) {
          await settleRoomChange(socket, "leave", roomUid);
        }
      }

      if (socket.currentGameRoom && socket.currentGameRoom !== uid) {
        await settleRoomChange(socket, "leave", socket.currentGameRoom);
      }

      if (canceled()) return false;
      await settleRoomChange(socket, "join", uid);
      if (canceled()) return false;
      socket.currentGameRoom = uid;
      return true;
    })
    .finally(() => requests.delete(request));

  return socket.gameRoomSwitch;
};

const cancelGameRoomSwitch = (socket, uid) => {
  const requests = pendingSwitches.get(socket);
  for (const request of requests || []) {
    if (request.uid === uid) requests.delete(request);
  }
  if (socket.currentGameRoom === uid) socket.currentGameRoom = undefined;
};

module.exports = { switchGameRoom, cancelGameRoomSwitch };
