const settleRoomChange = (socket, method, room) =>
  new Promise((resolve) => socket[method](room, resolve));

const switchGameRoom = (socket, uid, games) => {
  // Serialize switches so rapid changes settle first; joining again restores a lost room.
  socket.gameRoomSwitch = (socket.gameRoomSwitch || Promise.resolve()).then(async () => {
    for (const roomUid of Object.keys(socket.rooms)) {
      if (roomUid !== socket.id && roomUid !== uid && games[roomUid]) {
        await settleRoomChange(socket, "leave", roomUid);
      }
    }

    if (socket.currentGameRoom && socket.currentGameRoom !== uid) {
      await settleRoomChange(socket, "leave", socket.currentGameRoom);
    }

    await settleRoomChange(socket, "join", uid);
    socket.currentGameRoom = uid;
  });

  return socket.gameRoomSwitch;
};

module.exports = { switchGameRoom };
