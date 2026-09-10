const Account = require("../../models/account");
const ModAction = require("../../models/modAction");
const PlayerReport = require("../../models/playerReport");
const PlayerNote = require("../../models/playerNote");
const Game = require("../../models/game");
const { replayUidSchema } = require("./user-requests.schema");
const { replayForViewer, isChatReviewer } = require("./neighbor-chat");
const Signups = require("../../models/signups");

const {
  games,
  userList,
  generalChats,
  accountCreationDisabled,
  ipbansNotEnforced,
  gameCreationDisabled,
  limitNewPlayers,
  bypassVPNCheck,
  userListEmitter,
  emitUserListToSocket,
  getUserListView,
  gameListEmitter,
  formattedGameList,
  isStaffSocket,
} = require("./models");
const { sendInProgressGameUpdate } = require("./util");
const version = require("../../version");
const { obfIP } = require("./ip-obf");
const { CURRENT_SEASON_FIELDS } = require("../../src/shared/season");

/**
 * @param {object} socket - user socket reference.
 */
const sendUserList = (module.exports.sendUserList = (socket, force = false) => {
  // eslint-disable-line one-var
  if (socket) {
    const view = getUserListView(isStaffSocket(socket));
    if (force || socket._lastUserListViewHash !== view.hash) emitUserListToSocket(socket, view);
  } else {
    userListEmitter.markDirty();
  }
});

const getModInfo = (games, users, socket, queryObj, count = 1, isTrial, isAEM) => {
  const maskEmail = (email) => (email && email.split("@")[1]) || "";
  ModAction.find(queryObj)
    .sort({ $natural: -1 })
    .limit(500 * count)
    .then((actions) => {
      const list = users.map((user) => {
        const usr = userList.find((userListUser) => user.username === userListUser.userName);

        return usr
          ? {
              status: usr.status,
              isRainbow: user.isRainbowOverall,
              userName: user.username,
              ip: user.lastConnectedIP || user.signupIP,
              email: `${user.verified ? "+" : "-"}${maskEmail(user.verification.email)}`,
            }
          : {};
      });
      list.forEach((user) => {
        if (user.ip && user.ip != "") {
          try {
            user.ip = "-" + obfIP(user.ip);
          } catch (e) {
            user.ip = "ERROR";
            console.log(e);
          }
        }
      });
      actions.forEach((action) => {
        if (action.ip && action.ip != "") {
          if (action.ip.startsWith("-")) {
            action.ip = "ERROR"; // There are some bugged IPs in the list right now, need to suppress it.
          } else {
            try {
              action.ip = "-" + obfIP(action.ip);
            } catch (e) {
              action.ip = "ERROR";
              console.log(e);
            }
          }
        }
      });
      const gList = [];
      if (games) {
        Object.values(games).forEach((game) => {
          gList.push({
            name: game.general.name,
            uid: game.general.uid,
            electionNum: game.general.electionCount,
            casual: game.general.casualGame,
            private: game.general.private,
            custom: game.customGameSettings.enabled,
            unlisted: game.general.unlistedGame,
          });
        });
      }
      socket.emit("modInfo", {
        modReports: actions,
        accountCreationDisabled,
        ipbansNotEnforced,
        gameCreationDisabled,
        limitNewPlayers,
        bypassVPNCheck,
        userList: list,
        gameList: gList,
        showActions: !isTrial && isAEM,
      });
    })
    .catch((err) => {
      console.log(err, "err in finding mod actions");
    });
};

module.exports.getModInfo = getModInfo;

module.exports.sendSignups = (socket) => {
  Signups.find({ type: { $in: ["local", "discord", "github"] } })
    .sort({ $natural: -1 })
    .limit(500)
    .select({ unobfuscatedIP: 0 })
    .then((signups) => {
      socket.emit("signupsInfo", signups);
    })
    .catch((err) => {
      console.log(err, "err in finding signups");
    });
};

module.exports.sendAllSignups = (socket) => {
  Signups.find({ type: { $nin: ["local", "private", "discord", "github"] } })
    .sort({ $natural: -1 })
    .limit(500)
    .select({ unobfuscatedIP: 0 })
    .then((signups) => {
      socket.emit("signupsInfo", signups);
    })
    .catch((err) => {
      console.log(err, "err in finding signups");
    });
};

module.exports.sendPrivateSignups = (socket) => {
  Signups.find({ type: "private" })
    .sort({ $natural: -1 })
    .limit(500)
    .select({ unobfuscatedIP: 0 })
    .then((signups) => {
      socket.emit("signupsInfo", signups);
    })
    .catch((err) => {
      console.log(err, "err in finding signups");
    });
};

/**
 * @param {array} games - list of all games
 * @param {object} socket - user socket reference.
 * @param {number} count - depth of modinfo requested.
 * @param {boolean} isTrial - true if the user is a trial mod.
 * @param {boolean} isAEM - true if the user is a AEM member.
 */
module.exports.sendModInfo = (games, socket, count, isTrial, isAEM) => {
  const userNames = userList.map((user) => user.userName);

  Account.find({ username: userNames, "gameSettings.isPrivate": { $ne: true } })
    .then((users) => {
      getModInfo(games, users, socket, {}, count, isTrial, isAEM);
    })
    .catch((err) => {
      console.log(err, "err in sending mod info");
    });
};

/**
 * @param {object} socket - user socket reference.
 */
module.exports.sendUserGameSettings = (socket, loadedAccount) => {
  const { passport } = socket.handshake.session;

  if (!passport || !passport.user) {
    return;
  }

  const accountRequest = loadedAccount ? Promise.resolve(loadedAccount) : Account.findOne({ username: passport.user });

  return accountRequest
    .then((account) => {
      // Account reads can finish after disconnect cleanup or a newer tab taking ownership.
      // Neither stale connection may recreate presence, including explicit settings refreshes.
      if (socket.disconnected || socket._replacedBySocketId) return;
      socket.emit("gameSettings", account.gameSettings);

      const userListNames = userList.map((user) => user.userName);

      if (!userListNames.includes(passport.user)) {
        const userListInfo = {
          userName: passport.user,
          playerPronouns: account.gameSettings.playerPronouns,
          staffRole: account.staffRole || "",
          isContributor: account.isContributor || false,
          staffDisableVisibleElo: account.gameSettings.staffDisableVisibleElo,
          staffDisableVisibleXP: account.gameSettings.staffDisableVisibleXP,
          staffDisableStaffColor: account.gameSettings.staffDisableStaffColor,
          staffIncognito: account.gameSettings.staffIncognito,
          wins: account.wins,
          losses: account.losses,
          rainbowWins: account.rainbowWins,
          rainbowLosses: account.rainbowLosses,
          isRainbowOverall: account.isRainbowOverall,
          isRainbowSeason: account.isRainbowSeason,
          isPrivate: account.gameSettings.isPrivate,
          tournyWins: account.gameSettings.tournyWins,
          blacklist: account.gameSettings.blacklist,
          customCardback: account.gameSettings.customCardback,
          customCardbackUid: account.gameSettings.customCardbackUid,
          previousSeasonAward: account.gameSettings.previousSeasonAward,
          specialTournamentStatus: account.gameSettings.specialTournamentStatus,
          eloOverall: account.eloOverall,
          xpOverall: account.xpOverall,
          eloSeason: account.eloSeason,
          xpSeason: account.xpSeason,
          status: {
            type: "none",
            gameId: null,
          },
        };

        userListInfo[CURRENT_SEASON_FIELDS.wins] = account[CURRENT_SEASON_FIELDS.wins];
        userListInfo[CURRENT_SEASON_FIELDS.losses] = account[CURRENT_SEASON_FIELDS.losses];
        userListInfo[CURRENT_SEASON_FIELDS.rainbowWins] = account[CURRENT_SEASON_FIELDS.rainbowWins];
        userListInfo[CURRENT_SEASON_FIELDS.rainbowLosses] = account[CURRENT_SEASON_FIELDS.rainbowLosses];
        userList.push(userListInfo);
        sendUserList();
      }

      socket.emit("version", {
        current: version,
        lastSeen: account.lastVersionSeen || "none",
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

/**
 * @param {object} socket - user socket reference.
 * @param {object} data - data about the request
 */
module.exports.sendPlayerNotes = (socket, data) => {
  if (data) {
    PlayerNote.find({ userName: data?.userName, notedUser: { $in: data?.seatedPlayers } })
      .then((notes) => {
        if (notes) {
          socket.emit("notesUpdate", notes);
        }
      })
      .catch((err) => {
        console.log(err, "err in getting playernotes");
      });
  }
};

/**
 * @param {object} socket - user socket reference.
 * @param {string} uid - uid of game.
 */
module.exports.sendReplayGameData = async (socket, uid) => {
  const parsed = replayUidSchema.safeParse(uid);
  if (!parsed.success) return;
  try {
    const username = socket.handshake?.session?.passport?.user;
    const [game, account] = await Promise.all([
      Game.findOne({ uid: parsed.data }).select({ _id: 0, _v: 0 }).lean(),
      typeof username === "string" ? Account.findOne({ username }).select("username staffRole").lean() : null,
    ]);
    if (!game) return;
    const live = games[uid];
    // A saved snapshot of a still-running table must not expose live identities, roles, or other conversations.
    if (live && !live.gameState?.isCompleted) return;
    // Read current DB authorization; a demoted reviewer must not retain access through a connected socket.
    socket.emit("replayGameData", replayForViewer(game, account?.username, isChatReviewer(account)));
  } catch (err) {
    console.log(err, "err retrieving replay chat");
    socket.emit("sendAlert", "Unable to load replay chat right now.");
  }
};

/**
 * @param {object} socket - user socket reference.
 * @param {boolean} isAEM - user AEM designation
 */
module.exports.sendGameList = (socket, isAEM) => {
  // eslint-disable-line one-var
  if (socket) {
    let gameList = formattedGameList();
    gameList = gameList.filter((game) => isAEM || (game && !game.isUnlisted));
    socket.emit("gameList", gameList);
  } else {
    gameListEmitter.send = true;
  }
};

/**
 * @param {object} socket - user socket reference.
 */
module.exports.sendUserReports = async (socket) => {
  const username = socket.handshake?.session?.passport?.user;
  if (typeof username !== "string") return;
  try {
    const account = await Account.findOne({ username }).select("staffRole").lean();
    if (!isChatReviewer(account)) return;
    const reports = await PlayerReport.find().sort({ $natural: -1 }).limit(500).lean();
    socket.emit(
      "reportInfo",
      reports.map((report) => {
        const live = games[report.gameUid];
        if (!live || live.gameState?.isCompleted) return report;
        // Reports must not bypass the live hidden-info subscription/seated-staff restrictions.
        const { neighborChatContext, ...summary } = report;
        if (report.neighborMessageId) {
          summary.comment = "Neighbor Chat evidence is available after the game.";
          summary.reportedPlayer = "Hidden during play";
          summary.reportingPlayer = "Hidden during play";
        }
        return summary;
      })
    );
  } catch (err) {
    console.log(err, "err retrieving player reports");
    socket.emit("sendAlert", "Unable to load reports right now.");
  }
};

/**
 * @param {object} socket - user socket reference.
 */
module.exports.sendGeneralChats = (socket) => {
  socket.emit("generalChats", generalChats);
};

/**
 * @param {object} passport - socket authentication.
 * @param {object} game - target game.
 * @param {string} override - type of user status to be displayed.
 */
const updateUserStatus = (module.exports.updateUserStatus = (passport, game, override) => {
  const user = userList.find((user) => user.userName === passport.user);
  if (user) {
    user.status = {
      type:
        override && game && !game.general.unlistedGame
          ? override
          : game
            ? game.general.private
              ? "private"
              : !game.general.unlistedGame && game.general.rainbowgame
                ? "rainbow"
                : !game.general.unlistedGame
                  ? "playing"
                  : "none"
            : "none",
      gameId: game ? game.general.uid : false,
    };
    sendUserList();
  }
});

/**
 * @param {object} socket - user socket reference.
 * @param {string} uid - uid of game.
 */
module.exports.sendGameInfo = (socket, uid) => {
  if (typeof uid !== "string") {
    return;
  }

  const game = games[uid];
  const { passport } = socket.handshake.session;

  if (game && game.publicPlayersState && game.general) {
    if (passport && Object.keys(passport).length) {
      const player = game.publicPlayersState.find((player) => player.userName === passport.user);

      if (player) {
        player.leftGame = false;
        player.connected = true;
        if (game.general) game.general.timeAbandoned = null;
        socket.emit("updateSeatForUser", true);
        updateUserStatus(passport, game);
      } else {
        updateUserStatus(passport, game, "observing");
      }
    }

    socket.join(uid);
    sendInProgressGameUpdate(game);
    socket.emit("joinGameRedirect", game.general.uid);
  } else {
    Game.findOne({ uid }).then((game, err) => {
      if (err) {
        console.log(err, "game err retrieving for replay");
      }

      socket.emit("manualReplayRequest", game ? game.uid : "");
    });
  }
};
