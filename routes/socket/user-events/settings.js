const Account = require("../../../models/account");
const { userList, currentSeasonNumber } = require("../models");
const { sendUserList } = require("../user-requests");
const {
  themeSchema,
  gameSettingsSchema,
  blacklistSchema,
  bioSchema,
  THEME_COLOR_FIELDS,
} = require("./settings.schema");

/**
 * @param {object} socket - user socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdatedTheme = (socket, passport, data) => {
  const parsed = themeSchema.safeParse(data);
  if (!parsed.success) return;
  data = parsed.data; // field + colour fields guaranteed to be strings when present

  Account.findOne({ username: passport && passport.user }).then((account) => {
    if (!account) {
      return;
    }

    for (const field of THEME_COLOR_FIELDS) {
      if (data[field]) account[field] = data[field];
    }

    account.save();
  });
};

/**
 * @param {object} socket - socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdatedGameSettings = (socket, passport, data) => {
  // Authentication Assured in routes.js
  const parsed = gameSettingsSchema.safeParse(data);
  if (!parsed.success) return;
  data = parsed.data;

  Account.findOne({ username: passport.user })
    .then((account) => {
      const currentPrivate = account.gameSettings.isPrivate;
      const userIdx = userList.findIndex((user) => user.userName === passport.user);
      const aem =
        account.staffRole &&
        (account.staffRole === "moderator" || account.staffRole === "editor" || account.staffRole === "admin");
      const veteran = account.staffRole && account.staffRole === "veteran";
      const user = userList.find((u) => u.userName === passport.user);

      for (const setting in data) {
        if (setting == "blacklist") {
          const candidate = Array.isArray(data.blacklist) ? data.blacklist.slice(-30) : data.blacklist;
          const parsedBlacklist = blacklistSchema.safeParse(candidate);
          if (parsedBlacklist.success) {
            account.gameSettings.blacklist = parsedBlacklist.data;
            if (user) user.blacklist = parsedBlacklist.data;
          }
        }

        const allowedSettings = [
          "enableTimestamps",
          "enableRightSidebarInGame",
          "disablePlayerColorsInChat",
          "disablePlayerCardbacks",
          "disableHelpMessages",
          "disableHelpIcons",
          "disableConfetti",
          "disableCrowns",
          "disableSeasonal",
          "disableAggregations",
          "disableKillConfirmation",
          "soundStatus",
          "fontSize",
          "fontFamily",
          "isPrivate",
          "disableElo",
          "fullheight",
          "safeForWork",
          "keyboardShortcuts",
          "notifyForNewLobby",
          "gameFilters",
          "gameNotes",
          "playerNotes",
          "truncatedSize",
          "claimCharacters",
          "claimButtons",
        ];

        if (
          allowedSettings.includes(setting) ||
          (setting === "staffDisableVisibleElo" && (aem || veteran)) ||
          (setting === "staffDisableVisibleXP" && (aem || veteran)) ||
          (setting === "staffIncognito" && aem) ||
          (setting === "staffDisableStaffColor" && (aem || veteran))
        ) {
          account.gameSettings[setting] = data[setting];
        }

        if (setting === "staffIncognito" && aem) {
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

          userListInfo[`winsSeason${currentSeasonNumber}`] = account[`winsSeason${currentSeasonNumber}`];
          userListInfo[`lossesSeason${currentSeasonNumber}`] = account[`lossesSeason${currentSeasonNumber}`];
          userListInfo[`rainbowWinsSeason${currentSeasonNumber}`] = account[`rainbowWinsSeason${currentSeasonNumber}`];
          userListInfo[`rainbowLossesSeason${currentSeasonNumber}`] =
            account[`rainbowLossesSeason${currentSeasonNumber}`];
          if (userIdx !== -1) userList.splice(userIdx, 1);
          userList.push(userListInfo);
          sendUserList();
        }

        if (
          setting === "playerPronouns" &&
          ["he/him/his", "she/her/hers", "they/them/theirs", "Any Pronouns", ""].includes(data[setting])
        ) {
          account.gameSettings.playerPronouns = data[setting];
          if (user) user.playerPronouns = data[setting];
        }
      }

      if (
        ((data.isPrivate && !currentPrivate) || (!data.isPrivate && currentPrivate)) &&
        (!account.gameSettings.privateToggleTime || account.gameSettings.privateToggleTime < Date.now() - 64800000)
      ) {
        account.gameSettings.privateToggleTime = Date.now();
        account.save(() => {
          socket.emit("manualDisconnection");
        });
      } else {
        account.gameSettings.isPrivate = currentPrivate;
        account.save(() => {
          socket.emit("gameSettings", account.gameSettings);
          sendUserList();
        });
      }
    })
    .catch((err) => {
      console.log(err);
    });
};

/**
 * @param {object} socket - user socket reference.
 * @param {object} passport - socket authentication.
 * @param {object} data - from socket emit.
 */
module.exports.handleUpdatedBio = (socket, passport, data) => {
  // Authentication Assured in routes.js
  const parsed = bioSchema.safeParse(data);
  if (!parsed.success) return; // otherwise the server will crash if you forge the request
  const bio = parsed.data;
  Account.findOne({ username: passport.user }).then((account) => {
    account.bio = bio;
    account.save();
  });
};
