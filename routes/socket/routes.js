const {
  handleUpdatedReportGame,
  handleAddNewGame,
  handleAddNewGameChat,
  handleNewGeneralChat,
  handleUpdatedGameSettings,
  handleSocketDisconnect,
  handleUserLeaveGame,
  checkUserStatus,
  updateSeatedUser,
  handleUpdateWhitelist,
  handleAddNewClaim,
  handleModerationAction,
  handlePlayerReport,
  handleUpdatedBio,
  handleUpdatedRemakeGame,
  handleSubscribeModChat,
  handleModPeekVotes,
  handleModPeekRemakes,
  handleGameFreeze,
  handleHasSeenNewPlayerModal,
  handleFlappyEvent,
  handleUpdatedTheme,
  handleOpenChat,
  handleCloseChat,
  handleUnsubscribeChat,
  handleAddNewModDMChat,
} = require("./user-events");
const { handleAEMMessages } = require("./util");
const {
  sendPlayerNotes,
  sendUserReports,
  sendGameInfo,
  sendUserGameSettings,
  sendModInfo,
  sendGameList,
  sendGeneralChats,
  sendUserList,
  sendReplayGameData,
  sendSignups,
  sendAllSignups,
  sendPrivateSignups,
  updateUserStatus,
} = require("./user-requests");
const {
  selectVoting,
  selectPresidentPolicy,
  selectChancellorPolicy,
  selectChancellorVoteOnVeto,
  selectPresidentVoteOnVeto,
} = require("./game/election");
const { selectChancellor } = require("./game/election-util");
const {
  selectSpecialElection,
  selectPartyMembershipInvestigate,
  selectPolicies,
  selectPlayerToExecute,
  selectPartyMembershipInvestigateReverse,
  selectOnePolicy,
  selectBurnCard,
} = require("./game/policy-powers");
const { saveAndDeleteGame } = require("./game/end-game");
const { games, emoteList, cloneSettingsFromRedis, modDMs, getStaffList } = require("./models");
const Account = require("../../models/account");
const { TOU_CHANGES } = require("../../src/frontend-scripts/node-constants.js");
const version = require("../../version");
const https = require("https");
const moment = require("moment");
const { selectPlayerToAssassinate } = require("./game/assassination");
const { instrumentSocket } = require("./bandwidth-diagnostics");

let modUserNames = [],
  editorUserNames = [],
  adminUserNames = [];

const gamesGarbageCollector = () => {
  const currentTime = new Date();
  Object.keys(games).forEach((gameName) => {
    let toDelete = false;
    const currentGame = games[gameName];
    if (!currentGame) return;

    const completedTimer =
      currentGame.gameState &&
      currentGame.gameState.isCompleted &&
      currentGame.gameState.timeCompleted &&
      new Date(currentGame.gameState.timeCompleted + 1000 * 60 * 2);
    const abandonedTimer =
      currentGame.general &&
      currentGame.general.timeAbandoned &&
      new Date(currentGame.general.timeAbandoned.getTime() + 1000 * 60 * 2);

    // To come maybe later
    // const modDeleteTimer = games[gameName].general.modDeleteDelay && new Date(games[gameName].general.modDeleteDelay.getTime() + 900000);

    // DEBUG
    // console.log(
    // 	'Name: ',
    // 	gameName,
    // 	// '\nDelay: ',
    // 	// games[gameName].general.modDeleteDelay,
    // 	'\nCurrent Time: ',
    // 	currentTime,
    // 	// '\nDelay Timer: ',
    // 	// modDeleteTimer,
    // 	'\nCompleted Timer: ',
    // 	completedTimer
    // );

    toDelete =
      (!games[gameName].general.modDeleteDelay && completedTimer && completedTimer < currentTime) ||
      (abandonedTimer && abandonedTimer < currentTime);

    // if (games[gameName] && modDeleteTimer && modDeleteTimer < currentTime) {
    // console.log('Mod Delete Delay Timer Expired. Deleting... ');
    // toDelete = true;
    // }

    if (toDelete && currentGame.publicPlayersState) {
      for (
        let affectedPlayerNumber = 0;
        affectedPlayerNumber < currentGame.publicPlayersState.length;
        affectedPlayerNumber++
      ) {
        const affectedSocketId = Object.keys(io.sockets.sockets).find(
          (socketId) =>
            io.sockets.sockets[socketId].handshake.session.passport &&
            io.sockets.sockets[socketId].handshake.session.passport.user ===
              currentGame.publicPlayersState[affectedPlayerNumber].userName
        );
        if (!io.sockets.sockets[affectedSocketId]) {
          continue;
        }

        // I'm entirely unsure why socketio seems to misbehave with these combined so often - probably just bad timing
        if (io.sockets.sockets && io.sockets.sockets[affectedSocketId])
          io.sockets.sockets[affectedSocketId].emit("toLobby", currentGame.uid);
        if (io.sockets.sockets && io.sockets.sockets[affectedSocketId])
          io.sockets.sockets[affectedSocketId].leave(gameName);
      }

      saveAndDeleteGame(gameName);
    }
  });

  // also clone in global settings from redis
  cloneSettingsFromRedis();
};

const ensureAuthenticated = (socket) => {
  if (socket.handshake && socket.handshake.session) {
    const { passport } = socket.handshake.session;

    return Boolean(passport && passport.user && Object.keys(passport).length);
  }
};

// socket.io 2.x (unlike v3+) does not stop clients from emitting events that reuse socket.io /
// EventEmitter reserved names. An inbound "error" would otherwise reach our socket.on("error")
// listener, and "disconnect"/"disconnecting" could spoof the real lifecycle handlers. The client never
// legitimately emits any of these (verified: no frontend emit() uses these names), so the socket.use
// middleware drops them before dispatch — belt-and-suspenders with the non-fatal socket.on("error").
const RESERVED_INBOUND_EVENTS = new Set([
  "error",
  "connect",
  "connecting",
  "disconnect",
  "disconnecting",
  "connect_error",
  "connect_timeout",
  "newListener",
  "removeListener",
]);

const findGame = (data) => {
  if (games && data && data.uid && typeof data.uid === "string") {
    // Own-property guard: games is a plain object, so a forged uid like "constructor"/"__proto__"
    // would otherwise resolve to an Object.prototype member (truthy) and slip past the downstream
    // "game found" checks, crashing on a later game.private deref. Match own keys only.
    return Object.prototype.hasOwnProperty.call(games, data.uid) ? games[data.uid] : undefined;
  }
};

const ensureInGame = (passport, game) => {
  if (game && game.publicPlayersState && game.gameState && passport && passport.user) {
    const player = game.publicPlayersState.find((player) => player.userName === passport.user);

    return Boolean(player);
  }
};

const getSocketPacketContext = (socket, packet) => {
  const eventName = packet && packet[0];
  const data = packet && packet[1];
  const uid = data && data.uid;
  const game = findGame(data);
  const passport = socket && socket.handshake && socket.handshake.session && socket.handshake.session.passport;
  const dataKeys =
    data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data).slice(0, 20) : undefined;

  return {
    event: typeof eventName === "string" ? eventName : undefined,
    uid: typeof uid === "string" ? uid : undefined,
    user: passport && passport.user,
    dataType: data === null ? "null" : Array.isArray(data) ? "array" : typeof data,
    dataKeys,
    hasGame: Boolean(game),
    hasPrivate: Boolean(game && game.private),
    hasSeatedPlayers: Boolean(game && game.private && Array.isArray(game.private.seatedPlayers)),
    publicPlayerCount: game && game.publicPlayersState && game.publicPlayersState.length,
    privatePlayerCount: game && game.private && game.private.seatedPlayers && game.private.seatedPlayers.length,
    phase: game && game.gameState && game.gameState.phase,
    isStarted: game && game.gameState && game.gameState.isStarted,
    isTracksFlipped: game && game.gameState && game.gameState.isTracksFlipped,
    isCompleted: game && game.gameState && game.gameState.isCompleted,
    status: game && game.general && game.general.status,
    presidentIndex: game && game.gameState && game.gameState.presidentIndex,
  };
};

const gatherStaffUsernames = () => {
  Account.find({ staffRole: { $exists: true } })
    .then((accounts) => {
      modUserNames = accounts.filter((account) => account.staffRole === "moderator").map((account) => account.username);
      editorUserNames = accounts.filter((account) => account.staffRole === "editor").map((account) => account.username);
      adminUserNames = accounts.filter((account) => account.staffRole === "admin").map((account) => account.username);
    })
    .catch((err) => {
      console.log(err, "err in finding staffroles");
    });
};

module.exports.socketRoutes = () => {
  setInterval(gamesGarbageCollector, 30000);

  gatherStaffUsernames();

  io.on("connection", (socket) => {
    instrumentSocket(socket);

    // This 'error' listener MUST NOT exit or do anything destructive. socket.io 2.4.1 does not reserve
    // "error" on the receiving side, so a CLIENT can trigger it directly — `socket.emit("error", <anything>)`
    // is dispatched straight here. A prior version called process.exit(1), which turned this into a remote
    // kill switch: any browser console could crash the whole site, and the (client-supplied) payload was
    // logged verbatim — an attacker sent a fake "...reading 'seatedPlayers'" string to spoof a real crash.
    // Genuine handler throws do NOT arrive here; they escape to the uncaughtException handler in bin/dev.js
    // (which logs global.lastSocketPacketContext). So: log real server-side Error objects only (transport
    // noise), ignore client-supplied payloads, never exit.
    socket.on("error", (err) => {
      if (err instanceof Error) {
        console.error(`socket transport error: ${err.stack || err.message}`);
      }
    });
    checkUserStatus(socket, (initialAccount) => {
      socket.emit("version", { current: version });

      // defensively check if game exists
      socket.use((packet, next) => {
        // Drop client packets that reuse a reserved event name before they can reach any listener
        // (see RESERVED_INBOUND_EVENTS). Not calling next() ends dispatch without firing the handler.
        if (Array.isArray(packet) && RESERVED_INBOUND_EVENTS.has(packet[0])) return;

        const context = getSocketPacketContext(socket, packet);
        // Mirror onto a process global so bin/dev.js's uncaughtException/unhandledRejection handlers can
        // log the crashing packet's context: a handler throw lands there (not socket's 'error' event),
        // and this middleware runs before the handler, so it holds the right packet at crash time.
        global.lastSocketPacketContext = { ...context, socketId: socket.id, at: Date.now() };
        const data = packet[1];
        const uid = data && data.uid;
        const isGameFound = uid && findGame(data);

        if (!uid || isGameFound) {
          return next();
        } else {
          socket.emit("gameUpdate", {});
        }
      });

      const { passport } = socket.handshake.session;
      const authenticated = ensureAuthenticated(socket);

      let isAEM = false;
      let isTrial = false;
      let isTourneyMod = false;

      if (authenticated && passport && passport.user) {
        // Reuse the account already loaded in checkUserStatus instead of issuing a second identical
        // findOne. Wrapped in a resolved promise so the flags still settle on a later tick — exactly
        // as the prior .then(findOne) did — keeping isAEM false for the sendGameList(socket, isAEM)
        // call below, which runs synchronously before this resolves.
        Promise.resolve(initialAccount).then((account) => {
          if (!account) return;
          if (
            account.staffRole &&
            account.staffRole.length > 0 &&
            account.staffRole !== "trialmod" &&
            account.staffRole !== "altmod" &&
            account.staffRole !== "veteran"
          ) {
            isAEM = true;
          }
          if (account.staffRole && account.staffRole.length > 0 && account.staffRole === "trialmod") isTrial = true;
          if (account.isTournamentMod) isTourneyMod = true;
        });
      }

      sendGeneralChats(socket);
      sendGameList(socket, isAEM);

      let isRestricted = true;

      const checkRestriction = (account) => {
        if (!account || !passport || !passport.user || !socket) return;
        const parseVer = (ver) => {
          const vals = ver.split(".");
          vals.forEach((v, i) => (vals[i] = parseInt(v)));
          return vals;
        };
        const firstVerNew = (v1, v2) => {
          for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
            if (!v2[i]) return true;
            if (!v1[i] || isNaN(v1[i]) || v1[i] < v2[i]) return false;
            if (v1[i] > v2[i]) return true;
          }
          return true;
        };

        if (account.touLastAgreed && account.touLastAgreed.length) {
          const changesSince = [];
          const myVer = parseVer(account.touLastAgreed);
          TOU_CHANGES.forEach((change) => {
            if (!firstVerNew(myVer, parseVer(change.changeVer))) changesSince.push(change);
          });
          if (changesSince.length) {
            socket.emit("touChange", changesSince);
            return true;
          }
        } else {
          socket.emit("touChange", [TOU_CHANGES[TOU_CHANGES.length - 1]]);
          return true;
        }
        const warnings = account.warnings.filter((warning) => !warning.acknowledged);
        if (warnings.length > 0) {
          const { moderator, acknowledged, ...firstWarning } = warnings[0]; // eslint-disable-line no-unused-vars
          socket.emit("warningPopup", firstWarning);
          return true;
        }
        // implement other restrictions as needed
        socket.emit("removeAllPopups");
        return false;
      };

      if (passport && passport.user && authenticated) {
        // Same loaded account as above (see note) rather than a third findOne for this user on connect.
        Promise.resolve(initialAccount).then((account) => {
          isRestricted = checkRestriction(account);
        });
      }

      // Instantly sends the userlist as soon as the websocket is created.
      // For some reason, sending the userlist before this happens actually doesn't work on the client. The event gets in, but is not used.
      socket.conn.on("upgrade", () => {
        sendUserList(socket);
        socket.emit("emoteList", emoteList);

        // sockets should not be unauthenticated but let's make sure anyway
        if (passport && passport.user) {
          const dmID = Object.keys(modDMs).find((x) => modDMs[x].subscribedPlayers.indexOf(passport.user) !== -1);
          if (dmID) {
            socket.emit("preOpenModDMs");
            socket.emit(
              "openModDMs",
              handleAEMMessages(modDMs[dmID], passport.user, modUserNames, editorUserNames, adminUserNames)
            );
          }
        }
      });

      socket.on("receiveRestrictions", () => {
        Account.findOne({ username: passport.user }).then((account) => {
          isRestricted = checkRestriction(account);
        });
      });

      socket.on("seeWarnings", (username) => {
        if (isAEM) {
          Account.findOne({ username: username }).then((account) => {
            if (account) {
              if (account.warnings && account.warnings.length > 0) {
                socket.emit("sendWarnings", { username, warnings: account.warnings });
              } else {
                socket.emit("sendAlert", `That user doesn't have any warnings.`);
              }
            } else {
              socket.emit("sendAlert", `That user doesn't exist.`);
            }
          });
        } else {
          socket.emit("sendAlert", `Are you sure you're supposed to be doing that?`);
        }
      });

      // user-events
      socket.on("disconnect", () => {
        handleSocketDisconnect(socket);
      });

      socket.on("requestUserList", () => {
        sendUserList(socket);
      });

      socket.on("feedbackForm", (data) => {
        if (!(passport && passport.user && authenticated)) {
          socket.emit("feedbackResponse", { status: "error", message: "You are not logged in." });
          return;
        }

        if (!(data && data.feedback)) {
          socket.emit("feedbackResponse", { status: "error", message: "You cannot submit empty feedback." });
          return;
        }

        if (typeof data.feedback === "object") {
          return;
        }

        if (data.feedback.length <= 1900) {
          Account.findOne({ username: passport.user }).then((account) => {
            if (!account.feedbackSubmissions) account.feedbackSubmissions = [];
            const newFeedback = {
              date: new Date(),
              feedback: data.feedback,
            };

            if (account.feedbackSubmissions.length >= 2) {
              const secondMostRecentIndex = account.feedbackSubmissions.length - 2;
              if (newFeedback.date - account.feedbackSubmissions[secondMostRecentIndex].date > 1000 * 60 * 60 * 24) {
                // if it's been 24 hours since the *2nd* most recent feedback submission
                account.feedbackSubmissions.push(newFeedback);
              } else {
                socket.emit("feedbackResponse", {
                  status: "error",
                  message:
                    "You can only submit feedback twice a day. You can submit feedback again in " +
                    moment
                      .duration(
                        24 * 60 * 60 * 1000 -
                          (newFeedback.date - account.feedbackSubmissions[secondMostRecentIndex].date)
                      )
                      .humanize() +
                    ".",
                });
                return;
              }
            } else {
              account.feedbackSubmissions.push(newFeedback);
            }

            let feedback = {
              content: `__**Player**__: ${passport.user}\n__**Feedback**__: ${data.feedback}`,
              username: "Feedback",
              allowed_mentions: { parse: [] },
            };

            try {
              feedback = JSON.stringify(feedback);
              const req = https.request({
                hostname: "discordapp.com",
                path: process.env.DISCORDFEEDBACKURL,
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Content-Length": Buffer.byteLength(feedback),
                },
              });
              req.end(feedback);
              socket.emit("feedbackResponse", { status: "success", message: "Thank you for submitting feedback!" });
            } catch (e) {
              console.log(e);
              socket.emit("feedbackResponse", { status: "error", message: "An unknown error occurred." });
            }

            account.save();
          });
        } else {
          socket.emit("feedbackResponse", { status: "error", message: "Your feedback is too long." });
        }
      });

      socket.on("flappyEvent", (data) => {
        if (isRestricted) return;
        const game = findGame(data);
        if (authenticated && ensureInGame(passport, game)) {
          handleFlappyEvent(passport, game, data);
        }
      });

      socket.on("hasSeenNewPlayerModal", () => {
        if (authenticated) {
          handleHasSeenNewPlayerModal(socket);
        }
      });

      socket.on("getSignups", () => {
        if (authenticated && isAEM) {
          sendSignups(socket);
        }
      });

      socket.on("getAllSignups", () => {
        if (authenticated && isAEM) {
          sendAllSignups(socket);
        }
      });

      socket.on("getPrivateSignups", () => {
        if (authenticated && isAEM) {
          sendPrivateSignups(socket);
        }
      });

      socket.on("regatherAEMUsernames", () => {
        if (authenticated && isAEM) {
          gatherStaffUsernames();
          getStaffList();
        }
      });

      socket.on("aemOpenChat", (data) => {
        if (authenticated && isAEM) {
          handleOpenChat(socket, data, modUserNames, editorUserNames, adminUserNames);
        }
      });

      socket.on("aemCloseChat", (data) => {
        if (authenticated && isAEM) {
          handleCloseChat(socket, data, modUserNames, editorUserNames, adminUserNames);
        }
      });

      socket.on("aemUnsubscribeChat", (data) => {
        if (authenticated && isAEM) {
          handleUnsubscribeChat(socket, data, modUserNames, editorUserNames, adminUserNames);
        }
      });

      socket.on("modDMsAddChat", (data) => {
        if (authenticated) {
          handleAddNewModDMChat(socket, passport, data, modUserNames, editorUserNames, adminUserNames);
        }
      });

      socket.on("confirmTOU", () => {
        if (authenticated && isRestricted) {
          Account.findOne({ username: passport.user }).then((account) => {
            account.touLastAgreed = TOU_CHANGES[0].changeVer;
            account.save();
            isRestricted = checkRestriction(account);
          });
        }
      });

      socket.on("acknowledgeWarning", () => {
        if (authenticated && isRestricted) {
          Account.findOne({ username: passport.user }).then((acc) => {
            acc.warnings[acc.warnings.findIndex((warning) => !warning.acknowledged)].acknowledged = true;
            acc.markModified("warnings");
            acc.save(() => (isRestricted = checkRestriction(acc)));
          });
        }
      });

      socket.on("handleUpdatedTheme", (data) => {
        handleUpdatedTheme(socket, passport, data);
      });

      socket.on("updateModAction", (data) => {
        if (authenticated && isAEM) {
          handleModerationAction(socket, passport, data, false, modUserNames, editorUserNames.concat(adminUserNames));
        }
      });
      socket.on("addNewClaim", (data) => {
        const game = findGame(data);
        if (authenticated && ensureInGame(passport, game)) {
          handleAddNewClaim(socket, passport, game, data);
        }
      });
      socket.on("updateGameWhitelist", (data) => {
        const game = findGame(data);
        if (authenticated && ensureInGame(passport, game)) {
          handleUpdateWhitelist(passport, game, data);
        }
      });
      socket.on("addNewGameChat", (data) => {
        const game = findGame(data);
        if (isRestricted) return;
        if (authenticated) {
          handleAddNewGameChat(
            socket,
            passport,
            data,
            game,
            modUserNames,
            editorUserNames,
            adminUserNames,
            handleAddNewClaim,
            isTourneyMod
          );
        }
      });
      socket.on("updateReportGame", (data) => {
        try {
          handleUpdatedReportGame(socket, data);
        } catch (e) {
          console.log(e, "err in player report");
        }
      });
      socket.on("addNewGame", (data) => {
        if (isRestricted) return;
        if (authenticated) {
          handleAddNewGame(socket, passport, data);
        }
      });
      socket.on("updateGameSettings", (data) => {
        if (authenticated) {
          handleUpdatedGameSettings(socket, passport, data);
        }
      });

      socket.on("addNewGeneralChat", (data) => {
        if (isRestricted) return;

        if (authenticated) {
          handleNewGeneralChat(socket, passport, data, modUserNames, editorUserNames, adminUserNames);
        }
      });
      socket.on("leaveGame", (data) => {
        const game = findGame(data);

        if (game && game.general && io.sockets.adapter.rooms[game.general.uid] && socket) {
          socket.leave(game.general.uid);
        }

        if (authenticated && game) {
          handleUserLeaveGame(socket, game, data, passport);
        }
      });
      socket.on("updateSeatedUser", (data) => {
        if (isRestricted) return;
        if (authenticated) {
          updateSeatedUser(socket, passport, data);
        }
      });
      socket.on("playerReport", (data, callback) => {
        if (isRestricted) return; // payload shape (comment length, reason, etc.) validated in handlePlayerReport via zod
        if (authenticated) {
          handlePlayerReport(passport, data, callback);
        }
      });
      socket.on("updateRemake", (data) => {
        const game = findGame(data);
        if (authenticated && ensureInGame(passport, game)) {
          handleUpdatedRemakeGame(passport, game, data, socket);
        }
      });
      socket.on("updateBio", (data) => {
        if (authenticated) {
          handleUpdatedBio(socket, passport, data);
        }
      });
      // user-requests

      socket.on("getPlayerNotes", (data) => {
        sendPlayerNotes(socket, data);
      });
      socket.on("getGameList", () => {
        sendGameList(socket);
      });
      socket.on("getGameInfo", (uid) => {
        sendGameInfo(socket, uid);
      });
      socket.on("getUserList", () => {
        sendUserList(socket);
      });
      socket.on("getGeneralChats", () => {
        sendGeneralChats(socket);
      });
      socket.on("getUserGameSettings", () => {
        sendUserGameSettings(socket);
      });
      socket.on("selectedChancellorVoteOnVeto", (data) => {
        if (isRestricted) return;
        const game = findGame(data);
        if (authenticated && ensureInGame(passport, game)) {
          selectChancellorVoteOnVeto(passport, game, data);
        }
      });
      socket.on("getModInfo", (count) => {
        if (authenticated && (isAEM || isTrial)) {
          sendModInfo(games, socket, count, isTrial, isAEM);
        }
      });
      socket.on("subscribeModChat", (uid) => {
        // This handler isn't zod-hardened yet and mutates live game state inside an async .then with no
        // rejection path, so an edge-case game shape here would otherwise surface as an unhandledRejection
        // and take the whole process — every live game — down via bin/dev.js's fatal handler. A mod failing
        // to open mod chat must not crash the server: log and alert instead. Scoped to this one handler (not
        // a blanket swallow), and the mutations in handleSubscribeModChat are observability-only, not
        // game-rules state, so bailing part-way can't corrupt a game.
        const onError = (err) => {
          console.log(err, "err in subscribeModChat");
          socket.emit("sendAlert", "Something went wrong opening mod chat.");
        };
        try {
          const game = findGame({ uid });
          if (authenticated && (isAEM || (isTourneyMod && game?.general?.unlistedGame))) {
            if (game && game.private && game.private.seatedPlayers) {
              const players = game.private.seatedPlayers.map((player) => player.userName);
              Account.find({ staffRole: { $exists: true, $ne: "veteran" } })
                .then((accounts) => {
                  // Block the peek when a seated player is AEM staff (a non-veteran staffRole): a mod
                  // shouldn't read the mod chat of a game staff are playing in. Expression body on
                  // purpose — the previous block body returned nothing, so staff was always [] and this
                  // guard never fired.
                  const staff = accounts
                    .filter((acc) => acc.staffRole && acc.staffRole.length > 0 && players.includes(acc.username))
                    .map((acc) => acc.username);
                  if (staff.length) {
                    socket.emit("sendAlert", `AEM members are present: ${JSON.stringify(staff)}`);
                    return;
                  }
                  handleSubscribeModChat(socket, passport, game);
                })
                .catch(onError);
            } else socket.emit("sendAlert", "Game is missing.");
          }
        } catch (err) {
          onError(err);
        }
      });
      socket.on("modPeekVotes", (data) => {
        if (!data) return;
        const uid = data.uid;
        const game = findGame({ uid });
        if (authenticated && (isAEM || (isTourneyMod && game?.general?.unlistedGame))) {
          if (game && game.private && game.private.seatedPlayers) {
            handleModPeekVotes(socket, passport, game, data.modName);
          } else {
            socket.emit("sendAlert", "Game is missing.");
          }
        }
      });
      socket.on("modGetRemakes", (data) => {
        if (!data) return;
        const uid = data.uid;
        const game = findGame({ uid });
        if (authenticated && (isAEM || (isTourneyMod && game?.general?.unlistedGame))) {
          if (game && game.private && game.private.seatedPlayers) {
            handleModPeekRemakes(socket, passport, game, data.modName);
          } else {
            socket.emit("sendAlert", "Game is missing.");
          }
        }
      });
      socket.on("modFreezeGame", (data) => {
        const uid = data?.uid;
        if (!uid) return;
        const game = findGame({ uid });
        // game?.general guard: findGame returns undefined for a stale/unknown uid. The isTourneyMod
        // branch dereferences game.general, which would throw (un-caught in this listener = full
        // process crash) when a tourney mod sends a uid with no live game. Optional chaining makes
        // that authz term falsy instead, preserving the existing "no-op for unauthorized" behavior;
        // AEM mods still reach the inner "Game is missing." alert as before.
        if (authenticated && (isAEM || (isTourneyMod && game?.general?.unlistedGame))) {
          if (game && game.private && game.private.seatedPlayers) {
            handleGameFreeze(socket, passport, game, data.modName);
          } else {
            socket.emit("sendAlert", "Game is missing.");
          }
        }
      });
      socket.on("getUserReports", () => {
        if (authenticated && (isAEM || isTrial)) {
          sendUserReports(socket);
        }
      });
      socket.on("updateUserStatus", (type, gameId) => {
        const game = findGame({ uid: gameId });
        if (authenticated && ensureInGame(passport, game)) {
          updateUserStatus(passport, game);
        } else if (authenticated) {
          updateUserStatus(passport);
        }
      });
      socket.on("getReplayGameData", (uid) => {
        sendReplayGameData(socket, uid);
      });
      // election

      socket.on("presidentSelectedChancellor", (data) => {
        if (isRestricted) return;
        const game = findGame(data);
        if (authenticated && ensureInGame(passport, game)) {
          selectChancellor(socket, passport, game, data);
        }
      });
      socket.on("selectedVoting", (data) => {
        if (isRestricted) return;
        const game = findGame(data);
        if (authenticated && ensureInGame(passport, game)) {
          selectVoting(passport, game, data, socket);
        }
      });
      socket.on("selectedPresidentPolicy", (data) => {
        if (isRestricted) return;
        const game = findGame(data);
        if (authenticated && ensureInGame(passport, game)) {
          selectPresidentPolicy(passport, game, data, false, socket);
        }
      });
      socket.on("selectedChancellorPolicy", (data) => {
        if (isRestricted) return;
        const game = findGame(data);
        if (authenticated && ensureInGame(passport, game)) {
          selectChancellorPolicy(passport, game, data, false, socket);
        }
      });
      socket.on("selectedPresidentVoteOnVeto", (data) => {
        if (isRestricted) return;
        const game = findGame(data);
        if (authenticated && ensureInGame(passport, game)) {
          selectPresidentVoteOnVeto(passport, game, data, socket);
        }
      });
      // policy-powers
      socket.on("selectPartyMembershipInvestigate", (data) => {
        if (isRestricted) return;
        const game = findGame(data);
        if (authenticated && ensureInGame(passport, game)) {
          selectPartyMembershipInvestigate(passport, game, data, socket);
        }
      });
      socket.on("selectPartyMembershipInvestigateReverse", (data) => {
        if (isRestricted) return;
        const game = findGame(data);
        if (authenticated && ensureInGame(passport, game)) {
          selectPartyMembershipInvestigateReverse(passport, game, data, socket);
        }
      });
      socket.on("selectedPolicies", (data) => {
        if (isRestricted) return;
        const game = findGame(data);
        if (authenticated && ensureInGame(passport, game)) {
          if (game.private.lock.policyPeekAndDrop) selectOnePolicy(passport, game, socket);
          else selectPolicies(passport, game, socket);
        }
      });
      socket.on("selectedPresidentVoteOnBurn", (data) => {
        if (isRestricted) return;
        const game = findGame(data);
        if (authenticated && ensureInGame(passport, game)) {
          selectBurnCard(passport, game, data, socket);
        }
      });
      socket.on("selectedPlayerToExecute", (data) => {
        if (isRestricted) return;
        const game = findGame(data);
        if (authenticated && ensureInGame(passport, game)) {
          selectPlayerToExecute(passport, game, data, socket);
        }
      });
      socket.on("selectedSpecialElection", (data) => {
        if (isRestricted) return;
        const game = findGame(data);
        if (authenticated && ensureInGame(passport, game)) {
          selectSpecialElection(passport, game, data, socket);
        }
      });
      socket.on("selectedPlayerToAssassinate", (data) => {
        if (isRestricted) return;
        const game = findGame(data);
        if (authenticated && ensureInGame(passport, game)) {
          selectPlayerToAssassinate(passport, game, data, socket);
        }
      });
    });
  });
};
