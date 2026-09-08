const { games, testIP } = require("../models");
const { sendInProgressGameUpdate } = require("../util.js");
const Account = require("../../../models/account");
const { sendUserList } = require("../user-requests");

/**
 * @param {object} socket - socket reference.
 * @param {function} callback - success callback.
 */
module.exports.checkUserStatus = (socket, callback) => {
  const { passport } = socket.handshake.session;

  if (passport && Object.keys(passport).length) {
    const { user } = passport;
    const { sockets } = io.sockets;

    const game =
      games[
        Object.keys(games).find((gameName) =>
          games[gameName].publicPlayersState.find((player) => player.userName === user && !player.leftGame)
        )
      ];

    const oldSocketID = Object.keys(sockets).find(
      (socketID) =>
        sockets[socketID].handshake.session.passport &&
        Object.keys(sockets[socketID].handshake.session.passport).length &&
        sockets[socketID].handshake.session.passport.user === user &&
        socketID !== socket.id
    );

    if (oldSocketID && sockets[oldSocketID]) {
      // The replacement owns presence now; a delayed disconnect from this socket must not remove the
      // new tab from userList or mark its in-progress game seat disconnected.
      sockets[oldSocketID]._replacedBySocketId = socket.id;
      sockets[oldSocketID].emit("manualDisconnection");
      delete sockets[oldSocketID];
    }

    const reconnectingUser = game ? game.publicPlayersState.find((player) => player.userName === user) : undefined;

    if (game && game.gameState.isStarted && !game.gameState.isCompleted && reconnectingUser) {
      reconnectingUser.connected = true;
      socket.join(game.general.uid);
      socket.emit("updateSeatForUser");
      sendInProgressGameUpdate(game);
    }

    if (user) {
      // Double-check the user isn't sneaking past IP bans.
      const logOutUser = () => {
        socket.emit("manualDisconnection");
        // The connection's disconnect listener owns presence cleanup, including rejected connections.
        socket.disconnect(true);
      };

      Account.findOne({ username: user }, function (err, account) {
        if (socket.disconnected || socket._replacedBySocketId) return;
        if (err) {
          console.log(err, "err in checkUserStatus account lookup");
          // A failed lookup cannot authorize initialization. Close the transport without logging out
          // the session, so a transient database failure can recover on a fresh connection.
          socket.disconnect(true);
          return;
        }
        if (account) {
          if (account.isBanned || (account.isTimeout && new Date() < account.isTimeout)) {
            logOutUser();
          } else {
            testIP(account.lastConnectedIP, (banType) => {
              if (socket.disconnected || socket._replacedBySocketId) return;
              if (
                banType &&
                banType != "new" &&
                banType != "fragbanSmall" &&
                banType != "fragbanLarge" &&
                !account.gameSettings.ignoreIPBans
              )
                logOutUser();
              else {
                sendUserList();
                // Pass the loaded account to the connection callback so it doesn't re-query the same
                // user twice more (AEM flags + restriction check) on every connect.
                callback(account);
              }
            });
          }
        } else {
          logOutUser();
        }
      });
    } else callback();
  } else callback();
};

module.exports.handleHasSeenNewPlayerModal = (socket) => {
  const { passport } = socket.handshake.session;

  if (passport && Object.keys(passport).length) {
    const { user } = passport;
    Account.findOne({ username: user }).then((account) => {
      account.hasNotDismissedSignupModal = false;
      socket.emit("checkRestrictions");
      account.save();
    });
  }
};
