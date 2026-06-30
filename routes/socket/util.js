const { newStaff } = require("./models");
const util = require("util");
const { Webhook } = require("discord-webhook-node");
const tempy = require("tempy");

/**
 * Debugging function to send a game to Discord after it's been identified to be cyclic
 */

const debugSendGame = (game, message = "") => {
  const _game = Object.assign({}, game);
  delete _game.unsentReports;
  const webhook = new Webhook(process.env.DISCORDPRIVATEDEVELOPERS);
  const gameStr = util.inspect(_game, { showHidden: true, depth: null, colors: false });

  tempy.write.task(
    gameStr,
    (filename) => {
      if (message) webhook.send(message);
      webhook.sendFile(filename);
    },
    { extension: ".txt" }
  );
};
module.exports.debugSendGame = debugSendGame;

const identified = [];
/**
 * Check if a game is cyclic (JSON stringify fails on a cyclic object)
 * @param {*} game game object
 * @param {string} phase identifier of when this was detected
 */
const testGameObject = (game) => {
  if (identified.indexOf(game.general.uid) !== -1) return;
  try {
    // eslint-disable-next-line no-unused-vars
    const str = JSON.stringify(game);
  } catch (e) {
    debugSendGame(game, `Cyclic game object detected, stack trace: \n${e.stack}`);
    identified.push(game.general.uid);
  }
};
module.exports.testGameObject = testGameObject;

/**
 * @param {object} game - game to act on.
 * @return {object} game
 */
const secureGame = (game) => {
  const _game = Object.assign({}, game);

  delete _game.private;
  delete _game.remakeData;
  delete _game.guesses;
  delete _game.unsentReports;
  return _game;
};

const combineInProgressChats = (game, userName) =>
  userName && game.gameState.isTracksFlipped
    ? game.private.seatedPlayers.find((player) => player.userName === userName).gameChats.concat(game.chats)
    : game.private.unSeatedGameChats.concat(game.chats);

const combineCommandChats = (game, user, commandChats) =>
  commandChats[user] ? game.chats.concat(commandChats[user]) : game.chats;

module.exports.combineCommandChats = combineCommandChats;

/**
 * @param {object} game - game to act on.
 * @param {boolean} noChats - remove chats for client to handle.
 */
module.exports.sendInProgressGameUpdate = (game, noChats = false) => {
  if (!game || !io.sockets.adapter.rooms[game.general.uid]) {
    return;
  }

  // DEBUG ONLY
  // console.log(game.general.status, 'TimedMode:', game.gameState.timedModeEnabled, 'TimerId:', game.private.timerId ? 'exists' : 'null');

  const seatedPlayerNames = game.publicPlayersState.map((player) => player.userName);
  const roomSockets = Object.keys(io.sockets.adapter.rooms[game.general.uid].sockets).map(
    (sockedId) => io.sockets.connected[sockedId]
  );
  const playerSockets = roomSockets.filter(
    (socket) =>
      socket &&
      socket.handshake.session.passport &&
      Object.keys(socket.handshake.session.passport).length &&
      seatedPlayerNames.includes(socket.handshake.session.passport.user)
  );
  const observerSockets = roomSockets.filter(
    (socket) =>
      (socket && !socket.handshake.session.passport) ||
      (socket && !seatedPlayerNames.includes(socket.handshake.session.passport.user))
  );

  playerSockets.forEach((sock) => {
    const _game = Object.assign({}, game);
    const { user } = sock.handshake.session.passport;

    if (!game.gameState.isCompleted && game.gameState.isTracksFlipped) {
      const privatePlayer = _game.private.seatedPlayers.find((player) => user === player.userName);

      if (!_game || !privatePlayer) {
        return;
      }

      _game.playersState = privatePlayer.playersState;
      _game.cardFlingerState = privatePlayer.cardFlingerState || [];
    }

    _game.chats = combineCommandChats(_game, user, game.private.commandChats);

    if (noChats) {
      delete _game.chats;
      sock.emit("gameUpdate", secureGame(_game), true);
    } else {
      _game.chats = combineInProgressChats(_game, user);
      sock.emit("gameUpdate", secureGame(_game));
    }
  });

  let chatWithHidden = game.chats;
  if (!noChats && game.private && game.private.hiddenInfoChat && game.private.hiddenInfoSubscriptions.length) {
    chatWithHidden = [...chatWithHidden, ...game.private.hiddenInfoChat];
  }
  if (observerSockets.length) {
    observerSockets.forEach((sock) => {
      const _game = Object.assign({}, game);
      const user = sock.handshake.session.passport ? sock.handshake.session.passport.user : null;

      if (
        user &&
        game.private &&
        game.private.hiddenInfoSubscriptions &&
        game.private.hiddenInfoSubscriptions.includes(user)
      ) {
        // AEM status is ensured when adding to the subscription list
        _game.chats = chatWithHidden;
      }

      if (noChats) {
        delete _game.chats;
        sock.emit("gameUpdate", secureGame(_game), true);
      } else {
        _game.chats = combineInProgressChats(_game);
        _game.chats = combineCommandChats(_game, user, game.private.commandChats);

        sock.emit("gameUpdate", secureGame(_game));
      }
    });

    // Cyclic-structure check (reports to Discord) — run once per update instead of once per observer
    // socket. It JSON.stringifies the whole game, so per-socket meant O(observers) full serializations
    // of identical state each update; one check per update suffices.
    testGameObject(game);
  }
};

module.exports.sendInProgressModChatUpdate = (game, chat, specificUser) => {
  if (!io.sockets.adapter.rooms[game.general.uid]) {
    return;
  }

  const roomSockets = Object.keys(io.sockets.adapter.rooms[game.general.uid].sockets).map(
    (sockedId) => io.sockets.connected[sockedId]
  );

  if (roomSockets.length) {
    roomSockets.forEach((sock) => {
      if (sock && sock.handshake && sock.handshake.passport && sock.handshake.passport.user) {
        const { user } = sock.handshake.session.passport;
        if (game.private.hiddenInfoSubscriptions.includes(user)) {
          // AEM status is ensured when adding to the subscription list
          if (!specificUser) {
            // single message
            sock.emit("gameModChat", chat);
          } else if (specificUser === user) {
            // list of messages
            chat.forEach((msg) => sock.emit("gameModChat", msg));
          }
        }
      }
    });
  }
};

module.exports.sendPlayerChatUpdate = (game, chat) => {
  if (!io.sockets.adapter.rooms[game.general.uid]) {
    return;
  }

  const roomSockets = Object.keys(io.sockets.adapter.rooms[game.general.uid].sockets).map(
    (sockedId) => io.sockets.connected[sockedId]
  );

  roomSockets.forEach((sock) => {
    if (sock) {
      sock.emit("playerChatUpdate", chat);
    }
  });
};

module.exports.sendCommandChatsUpdate = (game) => {
  if (!io.sockets.adapter.rooms[game.general.uid]) {
    return;
  }

  const roomSockets = Object.keys(io.sockets.adapter.rooms[game.general.uid].sockets).map(
    (sockedId) => io.sockets.connected[sockedId]
  );

  roomSockets.forEach((sock) => {
    if (sock) {
      const _game = Object.assign({}, game);
      const user = sock.handshake?.session?.passport?.user;
      if (user) {
        _game.chats = combineCommandChats(_game, user, game.private.commandChats);
        sock.emit("gameUpdate", secureGame(_game));
      }
    }
  });
};

module.exports.secureGame = secureGame;

const getStaffRole = (user, modUserNames, editorUserNames, adminUserNames) => {
  if (modUserNames.includes(user) || newStaff.modUserNames.includes(user)) {
    return "moderator";
  } else if (editorUserNames.includes(user) || newStaff.editorUserNames.includes(user)) {
    return "editor";
  } else if (adminUserNames && adminUserNames.includes(user)) {
    return "admin";
  }
  return "";
};
module.exports.getStaffRole = getStaffRole;

const handleAEMMessages = (dm, user, modUserNames, editorUserNames, adminUserNames) => {
  const dmClone = Object.assign({}, dm);

  if (getStaffRole(user, modUserNames, editorUserNames, adminUserNames)) {
    dmClone.messages = dmClone.aemOnlyMessages;
  }

  delete dmClone.aemOnlyMessages;
  delete dmClone.subscribedPlayers;

  return dmClone;
};
module.exports.handleAEMMessages = handleAEMMessages;

module.exports.sendInProgressModDMUpdate = (dm, modUserNames, editorUserNames, adminUserNames) => {
  for (const user of dm.subscribedPlayers) {
    try {
      io.sockets.sockets[
        Object.keys(io.sockets.sockets).find(
          (socketId) =>
            io.sockets.sockets[socketId].handshake.session.passport &&
            io.sockets.sockets[socketId].handshake.session.passport.user === user
        )
      ].emit("inProgressModDMUpdate", handleAEMMessages(dm, user, modUserNames, editorUserNames, adminUserNames));
    } catch (e) {
      console.log("err", e);
    }
  }
};

module.exports.destroySession = (username) => {
  if (process.env.NODE_ENV !== "production") {
    const Mongoclient = require("mongodb").MongoClient;

    let mongoClient;

    Mongoclient.connect("mongodb://localhost:27017", { useNewUrlParser: true }, (err, client) => {
      mongoClient = client;
    });

    if (!mongoClient) {
      console.log("WARN: No mongo connection, cannot destroy user session.");
      return;
    }
    mongoClient
      .db("secret-hitler-app")
      .collection("sessions")
      .findOneAndDelete({ "session.passport.user": username }, (err) => {
        if (err) {
          try {
            console.log(err, "err in logoutuser");
          } catch (error) {}
        }
      });
  }
};

class LineGuess {
  /**
   * @type number[]
   */
  regs;

  /**
   * @type number|null
   */
  hit;

  /**
   * @param {{regs: number[], hit: (number|null)}} o
   */
  constructor(o = { regs: [], hit: null }) {
    this.regs = o.regs;
    this.hit = o.hit;
  }

  /**
   * @return {string} - A string representation of the guess, can be passed to parse.
   */
  toString() {
    return this.regs
      .map((reg) => {
        const newReg = reg === 10 ? 0 : reg;
        return reg === this.hit ? `${newReg}h` : `${newReg}`;
      })
      .join("");
  }

  /**
   * @param {LineGuess} other - the guess to compare this to.
   * @return {boolean} - whether the guesses are equal.
   */
  equals(other) {
    if (this.hit !== other.hit) {
      return false;
    }

    if (this.regs.length !== other.regs.length) {
      return false;
    }

    for (let i = 0; i < this.regs.length; i++) {
      if (this.regs[i] !== other.regs[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Parses a string guess into a structured format.
   *
   * @param {string} guess - the guess string.
   * @return {LineGuess|null} - the resulting guess, or null if it is invalid.
   */
  static parse(guess) {
    const fasRegex = /(\dh?)/gi;

    const result = new LineGuess();
    const m = guess.match(fasRegex);
    if (!m) {
      return null;
    }

    for (const match of m) {
      let seat = parseInt(match[0]);
      seat = seat === 0 ? 10 : seat;

      if (result.regs.includes(seat)) {
        return null;
      }

      result.regs.push(seat);
      if (match.length === 2) {
        if (result.hit) {
          return null;
        }

        result.hit = seat;
      }
    }

    result.regs.sort((a, b) => a - b);
    return result;
  }

  /**
   * @param {LineGuess} other - the guess to find the difference of this to.
   * @return {[number, boolean]} - the number of fas the same and whether hit is the same.
   */
  difference(other) {
    const fasSame = this.regs.reduce((accum, f) => accum + other.regs.includes(f), 0);
    return [fasSame, this.hit === other.hit];
  }
}

module.exports.LineGuess = LineGuess;

// Single source of truth for the human-readable game-type label used in game-summary reports.
// Mirrors end-game.js's rating-eligibility gate so a game only reads as "Ranked" when it actually
// rates: private / custom / unlisted are excluded there, so they get their own label here rather than
// the misleading "Ranked". (Keep this in sync with that gate — see the NOTE there.) Silent games have
// no separate label: a silent game that's otherwise ranked reads "Ranked", matching its Elo treatment.
const gameTypeLabel = (game) => {
  if (game.general.casualGame) return "Casual";
  if (game.general.practiceGame) return "Practice";
  if (game.general.private) return "Private";
  if (game.customGameSettings && game.customGameSettings.enabled) return "Custom";
  if (game.general.unlistedGame) return "Unlisted";
  return "Ranked";
};

// The header fields every makeReport() payload shares (mod ping, auto-report, mod-chat). Spread into
// the call-specific fields (player/seat/role/situation) so this shape lives in one place instead of
// being copy-pasted at ~16 call sites across election.js / commands.js / mod-modals.js.
module.exports.gameReportHeader = (game) => ({
  election: game.general.electionCount,
  title: game.general.name,
  uid: game.general.uid,
  gameType: gameTypeLabel(game),
});

// tacks on "/64" to IPv6 ips; needed to properly ban IPv6 ips
module.exports.handleDefaultIPv6Range = (ip) => {
  // check if there is NOT a : or there IS a / (ie. it's not IPv6 or it already has a CIDR range)
  return ip.indexOf(":") === -1 || ip.indexOf("/") !== -1 ? ip : ip + "/64";
};
