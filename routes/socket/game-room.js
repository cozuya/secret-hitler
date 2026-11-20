const switchGameRoom = (socket, uid, games) => {
  Object.keys(socket.rooms).forEach((roomUid) => {
    if (roomUid !== socket.id && roomUid !== uid && games[roomUid]) socket.leave(roomUid);
  });

  if (socket.currentGameRoom && socket.currentGameRoom !== uid) {
    socket.leave(socket.currentGameRoom);
  }

  // join is idempotent; calling it again also restores a room that was lost.
  socket.join(uid);
  socket.currentGameRoom = uid;
};

module.exports = { switchGameRoom };
