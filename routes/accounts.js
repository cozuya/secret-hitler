const passport = require("passport");
const { randomBytes } = require("crypto");
const Account = require("../models/account");
const Profile = require("../models/profile/index");
const BannedIP = require("../models/bannedIP");
const Signups = require("../models/signups");
const fetch = require("node-fetch");
const EightEightCounter = require("../models/eightEightCounter");
const { accountCreationDisabled, bypassVPNCheck, verifyBypass, consumeBypass, testIP } = require("./socket/models");
const { verifyRoutes, setVerify } = require("./verification");
const blacklistedWords = require("../iso/blacklistwords");
const bannedEmails = require("../utils/disposableEmails");
const { expandAndSimplify, obfIP, doesIPMatchCIDR } = require("./socket/ip-obf");
const prodCacheBustToken = require("./prodCacheBustToken");
const { handleDefaultIPv6Range } = require("./socket/util");
const {
  AUTH_PASSWORD,
  AUTH_OAUTH,
  accountDeletionAuthMode,
  linkedProviderId,
  newDeleteAccountCsrfToken,
  validDeleteAccountCsrf,
  isDeleteAccountOAuthState,
  newDeleteAccountOAuthRequest,
  takeDeleteAccountOAuthRequest,
  confirmAccountDeletion,
  hasFreshOAuthConfirmation,
} = require("./account-deletion");
const {
  signupBodySchema,
  changePasswordBodySchema,
  emailBodySchema,
  usernameBodySchema,
} = require("./accounts.schema");

/**
 * @param {object} req - express request object.
 * @param {object} res - express response object.
 * @param {function} next - express middleware function.
 * @return {function} returns next() if user is authenticated.
 */
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
};
const requireAccountSession = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ message: "Your session expired. Sign in again and retry." });
};
const VPNCache = {};
let getIPIntelCounter = {
  reset: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 23, 59, 59, 999),
  count: 0,
};
// module.exports.vpnCounter = getIPIntelCounter;
let torIps;
const emailRegex =
  /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;

const renderPage = (req, res, pageName, varName) => {
  const renderObj = {};

  renderObj[varName] = true;

  if (req.user) {
    renderObj.username = req.user.username;
  }

  if (process.env.NODE_ENV === "production") {
    renderObj.prodCacheBustToken = prodCacheBustToken.prodCacheBustToken;
  }

  res.render(pageName, renderObj);
};

const checkIP = (config) => {
  const { res, username, email, signupIP, hasBypass, next } = config;
  if (hasBypass) {
    config.vpnScore = 0;
    next(config);
  } else if (accountCreationDisabled.status && !hasBypass) {
    const creationDisabledSignup = new Signups({
      date: new Date(),
      userName: username,
      type: "Failed - ACD",
      ip: obfIP(signupIP),
      email: Boolean(email),
      unobfuscatedIP: signupIP,
    });
    creationDisabledSignup.save(() => {
      res.status(403).json({
        message:
          "Creating new accounts is currently disabled.  This is likely due to limitations on our current server hardware.  If you need an exception, please contact our moderators on discord.",
      });
    });
  } else if (torIps.includes(signupIP)) {
    const torSignup = new Signups({
      date: new Date(),
      userName: username,
      type: "Failed - TOR",
      ip: obfIP(signupIP),
      email: config.isOAuth
        ? `${config.type} ${config.profile.username}${config.type === "discord" ? "#" + config.profile.discriminator : ""}`
        : Boolean(email),
      unobfuscatedIP: signupIP,
      oauthID: `${config.isOAuth && config.type === "discord" ? config.profile.id : ""}`,
    });
    torSignup.save(() => {
      res.status(403).json({
        message: "Use of TOR is not allowed on this site.",
      });
    });
  } else if (process.env.NODE_ENV !== "production" && !process.env.IPBANSINDEV) {
    config.vpnScore = 0;
    next(config);
  } else if (getIPIntelCounter.count >= 1995 && new Date() < getIPIntelCounter.reset && !VPNCache[signupIP]) {
    const rateLimitSignup = new Signups({
      date: new Date(),
      userName: username,
      type: "Failed - GII 429",
      ip: obfIP(signupIP),
      email: config.isOAuth
        ? `${config.type} ${config.profile.username}${config.type === "discord" ? "#" + config.profile.discriminator : ""}`
        : Boolean(email),
      unobfuscatedIP: signupIP,
      oauthID: `${config.isOAuth && config.type === "discord" ? config.profile.id : ""}`,
    });
    rateLimitSignup.save(() => {
      res.status(403).json({
        message: "An internal server error occurred. Please try again later.",
      });
    });
  } else {
    let ipBanned = false;
    const checkFragban = (ban) => {
      return (
        ((new Date() < ban.bannedDate || ban.permanent) && doesIPMatchCIDR(ban.ip, signupIP)) ||
        ((new Date() < ban.bannedDate || ban.permanent) &&
          !ban.ip.includes("/") &&
          ban.ip.includes(".") &&
          signupIP.includes(".") && // backwards compatability
          (ban.ip === signupIP.split(".").slice(0, 3).join(".") ||
            ban.ip === signupIP.split(".").slice(0, 2).join(".")))
      );
    };
    BannedIP.find({
      type: ["fragbanSmall", "fragbanLarge"],
    }).then((bans) => {
      if (bans.some(checkFragban) && !hasBypass) {
        const fragSignup = new Signups({
          date: new Date(),
          userName: username,
          type: "Failed - FragBanned",
          ip: obfIP(signupIP),
          email: config.isOAuth
            ? `${config.type} ${config.profile.username}${config.type === "discord" ? "#" + config.profile.discriminator : ""}`
            : Boolean(email),
          unobfuscatedIP: signupIP,
          oauthID: `${config.isOAuth && config.type === "discord" ? config.profile.id : ""}`,
        });
        fragSignup.save(() => {
          res.status(401).json({
            message:
              "Creating new accounts is currently disabled.  This is likely due to limitations on our current server hardware.  If you need an exception, please contact our moderators on Discord.",
          });
        });
        ipBanned = true;
      } else {
        testIP(signupIP, (banType, unbanTime, permanent) => {
          if (hasBypass && banType == "new") banType = null;
          if (banType && !hasBypass) {
            if (banType == "nocache")
              res
                .status(403)
                .json({ message: "The server is still getting its bearings, try again in a few moments." });
            else if (banType === "small" || banType === "big") {
              res.status(403).json({
                message:
                  "You can no longer access this service.  If you believe this is in error, contact the moderators on our discord channel.",
              });
              ipBanned = true;
            } else if (banType === "tiny") {
              res.status(403).json({
                message: `Your IP address was timed out.  If you believe this is in error, contact the moderators on Discord. Your timeout expires on ${new Date(
                  unbanTime
                )}`,
              });
              ipBanned = true;
            } else if (banType == "new") {
              res.status(403).json({
                message:
                  "You can only make accounts once per day.  If you need an exception to this rule, contact the moderators on our discord channel.",
              });
              ipBanned = true;
            } else {
              console.log(`Unhandled IP ban type: ${banType}`);
              res.status(403).json({
                message:
                  "You can no longer access this service.  If you believe this is in error, contact the moderators on our discord channel.",
              });
              ipBanned = true;
            }
          }
          if (ipBanned) {
            const ipbannedSignup = new Signups({
              date: new Date(),
              userName: username,
              type: `Failed - IPBanned ${permanent ? "permanent " : ""}${banType}`,
              ip: obfIP(signupIP),
              email: config.isOAuth
                ? `${config.type} ${config.profile.username}${config.type === "discord" ? "#" + config.profile.discriminator : ""}`
                : Boolean(email),
              unobfuscatedIP: signupIP,
              oauthID: `${config.isOAuth && config.type === "discord" ? config.profile.id : ""}`,
            });
            ipbannedSignup.save();
          } else {
            if (bypassVPNCheck.status) {
              config.vpnScore = 0;
              next(config);
            } else if (VPNCache[signupIP]) {
              config.vpnScore = VPNCache[signupIP];
              next(config);
            } else if (!process.env.IPBANSINDEV) {
              // we dont want to send bogus requests to gii if we are in dev
              // (this is only reachable if we are not in production or we dont have IPBANSINDEV set and if we dont have IPBANSINDEV set we are guaranteed to be in production)
              fetch(
                `https://check.getipintel.net/check.php?ip=${signupIP}&contact=${process.env.GETIPINTELAPIEMAIL}&flags=f&format=json`
              )
                .then((res) => res.json())
                .then((json) => {
                  if (new Date() < getIPIntelCounter.reset) {
                    getIPIntelCounter.count++;
                  } else {
                    getIPIntelCounter = {
                      reset: new Date(
                        new Date().getFullYear(),
                        new Date().getMonth(),
                        new Date().getDate(),
                        23,
                        59,
                        59,
                        999
                      ),
                      count: 1,
                    };
                  }
                  const vpnScore = json.result;

                  if (vpnScore < 0) {
                    res.status(501).json({
                      message: "There was an error processing your request. Please contact our moderators on Discord.",
                    });
                    console.log(
                      "Error in Get IP Intel, score given: ",
                      vpnScore,
                      "IP: ",
                      signupIP,
                      "Message: ",
                      json.message
                    );
                    return;
                  }
                  config.vpnScore = VPNCache[signupIP] = vpnScore;
                  next(config);
                })
                .catch((e) => {
                  console.log("failed getipintel", signupIP, e);
                  res.status(501).json({
                    message:
                      "There was a fatal error in processing your request. Please contact our moderators on Discord",
                  });
                  return;
                });
            } else {
              // we are in dev, just pass through a 0
              config.vpnScore = 0;
              next(config);
            }
          }
        });
      }
    });
  }
};

const continueSignup = (config) => {
  const {
    req,
    res,
    username,
    password,
    email,
    signupIP,
    save,
    hasBypass,
    vpnScore,
    bypassKey,
    isOAuth,
    type,
    profile,
  } = config;
  if (vpnScore >= 0.995 && !hasBypass) {
    const vpnSignup = new Signups({
      date: new Date(),
      userName: username,
      type: "Failed - VPN",
      ip: obfIP(signupIP),
      email: config.isOAuth
        ? `${config.type} ${config.profile.username}${config.type === "discord" ? "#" + config.profile.discriminator : ""}`
        : Boolean(email),
      unobfuscatedIP: signupIP,
      oauthID: `${config.isOAuth && config.type === "discord" ? config.profile.id : ""}`,
    });
    vpnSignup.save(() => {
      res.status(403).json({
        message:
          "Use of a VPN is currently not allowed on this site. Contact the moderators on Discord for an exception.",
      });
    });
  } else {
    if (isOAuth) {
      const accountObj = {
        username: username,
        isLocal: false,
        oauthSignupProvider: type,
        gameSettings: {
          soundStatus: "pack2",
          disableSeasonal: true,
        },
        verified: true,
        wins: 0,
        losses: 0,
        created: new Date(),
        signupIP: signupIP,
        hasNotDismissedSignupModal: true,
        verification: {
          email: type === "discord" ? profile.email : profile._json.email,
        },
        lastConnectedIP: signupIP,
      };

      if (type === "discord") {
        accountObj.discordDiscriminator = profile.discriminator;
        accountObj.discordMFA = profile.mfa_enabled;
        accountObj.discordUsername = profile.username;
        accountObj.discordUID = profile.id;
      } else {
        accountObj.githubUsername = profile.username;
      accountObj.githubUID = profile.id;
        accountObj.githubMFA = profile._json.two_factor_authentication;
        accountObj.bio = profile._json.bio;
      }

      const oauthSignup = new Signups({
        date: new Date(),
        userName: username,
        type,
        ip: obfIP(signupIP),
        email: config.isOAuth
          ? `${config.type} ${config.profile.username}${config.type === "discord" ? "#" + config.profile.discriminator : ""}`
          : Boolean(email),
        unobfuscatedIP: signupIP,
        oauthID: `${config.isOAuth && config.type === "discord" ? accountObj.discordUID : ""}`,
      });

      Account.register(new Account(accountObj), randomBytes(32).toString("hex"), (err, account) => {
        if (err) {
          // console.log(err, 'err in creating oauth account', accountObj);
          res.status(503).json({ message: "There was an error processing your request. Please try again later." });
          return;
        } else {
          if (hasBypass) consumeBypass(bypassKey, username, signupIP);
          const newPlayerBan = new BannedIP({
            bannedDate: new Date(),
            type: "new",
            ip: handleDefaultIPv6Range(signupIP),
            permanent: false,
          });

          passport.authenticate(type)(req, res, () => {
            oauthSignup.save(() => {
              newPlayerBan.save(() => {
                req.login(account, () => {
                  res.redirect("/game");
                });
              });
            });
          });
        }
      });
    } else {
      Account.register(new Account(save), password, (err) => {
        if (err) {
          console.log(err);
          res.status(500).json({ message: err.toString() });
          return;
        }
        if (hasBypass) consumeBypass(bypassKey, username, signupIP);
        if (email) {
          setVerify({ username, email });
        }
        passport.authenticate("local")(req, res, () => {
          const newPlayerBan = new BannedIP({
            bannedDate: new Date(),
            type: "new",
            ip: handleDefaultIPv6Range(signupIP),
            permanent: false,
          });
          newPlayerBan.save();
          if (!save.gameSettings.isPrivate) {
            const newSignup = new Signups({
              date: new Date(),
              userName: username,
              type: "local",
              ip: obfIP(signupIP),
              email: Boolean(email),
              unobfuscatedIP: signupIP,
              oauthID: `${config.isOAuth && config.type === "discord" ? config.profile.id : ""}`,
            });
            newSignup.save(() => {
              res.send();
            });
          } else {
            const privSignup = new Signups({
              date: new Date(),
              userName: username,
              type: "private",
              ip: obfIP(signupIP),
              email: Boolean(email),
              unobfuscatedIP: signupIP,
              oauthID: `${config.isOAuth && config.type === "discord" ? config.profile.id : ""}`,
            });

            privSignup.save(() => {
              res.send();
            });
          }
        });
      });
    }
  }
};

// Passport omits the hash and salt from the session user.
const findAccountForDeletion = (user) => Account.findById(user._id).select("+hash +salt");

module.exports.accounts = (torIpsParam) => {
  verifyRoutes();
  torIps = torIpsParam;

  app.get("/account", ensureAuthenticated, (req, res, next) => {
    findAccountForDeletion(req.user)
      .then((account) => {
        if (!account) return res.redirect("/");
        const deleteAuthMode = accountDeletionAuthMode(account);
        req.session.deleteAccountCsrf ||= newDeleteAccountCsrfToken();
        res.render("page-account", {
          isLocal: account.isLocal,
          requiresPassword: deleteAuthMode === AUTH_PASSWORD,
          oauthProvider: deleteAuthMode === AUTH_OAUTH ? account.oauthSignupProvider : null,
          deleteConfirmed: hasFreshOAuthConfirmation(req.session, account),
          showDeleteRecovery: !account.isLocal && Boolean(account.discordUID || account.githubUsername),
          deleteAccountCsrf: req.session.deleteAccountCsrf,
          prodCacheBustToken: process.env.NODE_ENV === "production" ? prodCacheBustToken.prodCacheBustToken : null,
          username: account.username,
          verified: account.verified,
          email: account.verification ? account.verification.email : "",
          discordUsername: account.discordUsername,
          discordDiscriminator: account.discordDiscriminator,
          githubUsername: account.githubUsername,
        });
      })
      .catch(next);
  });

  app.post("/account/change-password", requireAccountSession, (req, res, next) => {
    const parsed = changePasswordBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Enter your current password and the new password twice." });
    }
    const { currentPassword, newPassword, newPasswordConfirm } = parsed.data;

    if (newPassword !== newPasswordConfirm) {
      return res.status(401).json({ message: "The new passwords did not match." });
    }
    if (newPassword.length > 255 || newPassword.length < 7) {
      return res.status(400).json({ message: "Use a new password between 7 and 255 characters." });
    }

    findAccountForDeletion(req.user)
      .then(async (account) => {
        if (!account) return res.status(404).json({ message: "Account not found." });
        if (accountDeletionAuthMode(account) === AUTH_OAUTH) {
          return res.status(403).json({ message: "Use the password reset link to set a password for this account." });
        }
        const { user } = await account.authenticate(currentPassword);
        if (!user || String(user._id) !== String(account._id)) {
          return res.status(401).json({ message: "Your current password did not match." });
        }
        await account.setLocalPassword(newPassword);
        return res.send();
      })
      .catch(next);
  });

  app.post("/account/delete-account", requireAccountSession, (req, res, next) => {
    const csrfToken = req.get("x-csrf-token") || (req.body && req.body.csrfToken);
    if (!validDeleteAccountCsrf(req.session, csrfToken)) {
      return res.status(403).json({ message: "Invalid request." });
    }

    findAccountForDeletion(req.user)
      .then(async (account) => {
        if (!account) {
          return res.status(404).json({ message: "Account not found." });
        }
        if (account.isBanned || (account.isTimeout && Date.now() < new Date(account.isTimeout))) {
          return res.status(403).json({ message: "You cannot delete a banned account. " });
        }

        if (accountDeletionAuthMode(account) === AUTH_OAUTH) {
          if (!hasFreshOAuthConfirmation(req.session, account)) {
            return res.status(403).json({ message: "Please confirm with your linked provider first." });
          }
          delete req.session.deleteAccountConfirmation;
        } else {
          const password = req.body && req.body.password;
          if (typeof password !== "string" || !password) {
            return res.status(401).json({ message: "Your password is required." });
          }
          const { user } = await account.authenticate(password);
          if (!user || String(user._id) !== String(account._id)) {
            return res.status(401).json({ message: "Your password did not match." });
          }
        }

        // Stop if a password, provider link or restriction changed during verification.
        const result = await Account.deleteOne({
          _id: account._id,
          isLocal: account.isLocal ?? null,
          oauthSignupProvider: account.oauthSignupProvider ?? null,
          hash: account.hash ?? null,
          salt: account.salt ?? null,
          password: account.password ?? null,
          discordUID: account.discordUID ?? null,
          githubUID: account.githubUID ?? null,
          isBanned: { $ne: true },
          $or: [{ isTimeout: null }, { isTimeout: { $lte: new Date() } }],
        });
        if (result.deletedCount !== 1) {
          return res.status(409).json({ message: "Your account changed. Refresh the page and try again." });
        }
        req.logOut();
        await Profile.deleteOne({ _id: account.username });
        return res.send();
      })
      .catch(next);
  });

  app.post("/account/reset-password", (req, res, next) => {
    const email = req.body?.email;
    if (typeof email !== "string" || !email) {
      return next();
    }

    return Account.findOne({ "verification.email": email, verified: true })
      .then((account) => {
        if (!account) {
          return res.status(404).json({ message: "There is no verified account associated with that email." });
        }
        setVerify({ username: account.username, email, res, isResetPassword: true });
      })
      .catch(next);
  });

  app.post("/account/signup", (req, res, next) => {
    const parsed = signupBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(401).json({ message: "Your username or password cannot be empty." });
      return;
    }
    const { username, password, password2, email, isPrivate } = parsed.data;
    // from parsed.data (not req.body) so the schema's string/null typing governs these —
    // a forged object can't reach bypassKey.trim() below.
    let { bypassKey, bypass } = parsed.data;
    bypassKey = bypass || bypassKey;
    let hasBypass = false;
    if (bypassKey) {
      bypassKey = bypassKey.trim();
      if (bypassKey.length) {
        if (!verifyBypass(bypassKey)) {
          res
            .status(401)
            .json({ message: "Restriction bypass key invalid, leave that field empty if it is not needed." });
          return;
        }
        hasBypass = true;
      }
    }
    const signupIP = req.expandedIP;
    const save = {
      username,
      isLocal: true,
      hasNotDismissedSignupModal: true,
      gameSettings: {
        soundStatus: "pack2",
        disableSeasonal: true,
        isPrivate,
      },
      verification: {
        email: email || "",
      },
      verified: false,
      games: [],
      wins: 0,
      losses: 0,
      created: new Date(),
      signupIP,
      lastConnectedIP: signupIP,
    };

    if (!/^[a-z0-9]+$/i.test(username)) {
      res.status(401).json({ message: "Your username can only be alphanumeric." });
    } else if (username.length < 3) {
      res.status(401).json({ message: "Your username is too short." });
    } else if (username.length > 16) {
      res.status(401).json({ message: "Your username is too long." });
    } else if (password.length < 6) {
      res.status(401).json({ message: "Your password is too short." });
    } else if (password.length > 255) {
      res.status(401).json({ message: "Your password is too long." });
    } else if (password !== password2) {
      res.status(401).json({ message: "Your passwords did not match." });
    } else if (email && !emailRegex.test(email)) {
      res.status(401).json({
        message: `That doesn't look like a valid email address.`,
      });
    } else if (
      email &&
      email.split("@")[1] &&
      bannedEmails.includes(email.split("@")[1]) &&
      process.env.NODE_ENV === "production"
    ) {
      res.status(401).json({
        message: "Only non-disposable email providers are allowed to create verified accounts.",
      });
    } else if (blacklistedWords.some((word) => new RegExp(word, "i").test(username))) {
      res.status(401).json({
        message: "Your username contains a naughty word or part of a naughty word.",
      });
    } else if (/88$/i.test(username)) {
      const new88 = new EightEightCounter({
        date: new Date(),
        username,
      });
      new88.save(() => {
        res.status(401).json({
          message: "Usernames that end with 88 are not allowed.",
        });
      });
    } else {
      const continueSignupConfig = {
        req,
        res,
        username,
        password,
        email,
        signupIP,
        save,
        hasBypass,
        bypassKey,
        next: continueSignup,
      };
      const queryObj = email
        ? { $or: [{ username: new RegExp(`\\b${username}\\b`, "i") }, { "verification.email": email }] }
        : { username: new RegExp(`\\b${username}\\b`, "i") };
      Account.find(queryObj, (err, accounts) => {
        if (err) {
          console.log(err);
          res.status(500).json({ message: err.toString() });
          return;
        }
        if (accounts.length) {
          if (accounts.some((acc) => acc.username.toLowerCase() === username.toLowerCase())) {
            res.status(401).json({ message: "That account already exists." });
            return;
          } else {
            res.status(401).json({
              message:
                "That email address is being used by another verified account, please change that or use another email.",
            });
            return;
          }
        }

        checkIP(continueSignupConfig);
      });
    }
  });

  app.post(
    "/account/signin",
    (req, res, next) => {
      testIP(req.expandedIP, (banType, unbanTime, permanent) => {
        if (banType && banType !== "new" && banType !== "fragbanSmall" && banType !== "fragbanLarge") {
          if (banType === "nocache")
            res.status(403).json({ message: "The server is still getting its bearings, try again in a few moments." });
          else if (banType === "small" || banType === "big" || banType === "tiny") {
            req.ipBanned = banType;
            req.ipBanEnd = unbanTime;
            req.permanentIPBan = permanent;
            return next();
          } else {
            console.log(`Unhandled IP ban type: ${banType}`);
            res.status(403).json({
              message:
                "You can no longer access this service.  If you believe this is in error, contact the moderators on Discord.",
            });
          }
        } else return next();
      });
    },
    passport.authenticate("local"),
    (req, res, next) => {
      Account.findOne({
        username: req.user.username,
      }).then((player) => {
        if (req.ipBanned && req.ipBanned !== "") {
          const ipbannedLogin = new Signups({
            date: new Date(),
            userName: req.user.username,
            type: `Failed Login - IPBanned ${req.permanentIPBan ? "permanent " : ""}${req.ipBanned}`,
            ip: obfIP(req.expandedIP),
            email: "",
            unobfuscatedIP: req.expandedIP,
          });

          ipbannedLogin.save();

          if ((req.ipBanned === "small" || req.ipBanned === "big") && !player.gameSettings.ignoreIPBans) {
            req.logOut();
            res.status(403).json({
              message:
                "You can no longer access this service.  If you believe this is in error, contact the moderators on Discord.",
            });
            return next();
          } else if (req.ipBanned === "tiny") {
            req.logOut();
            res.status(403).json({
              message: `Your IP address was timed out.  If you believe this is in error, contact the moderators on Discord. Your timeout expires on ${new Date(
                req.ipBanEnd
              )}`,
            });
            return next();
          }
        }

        if (!player) {
          res.status(403).json({
            message: "There is no account with that username.",
          });
          return next();
        }
        if (player.isBanned) {
          req.logOut();
          res.status(403).json({
            message:
              "Your account has been banned.  If you believe this is in error, contact the moderators on Discord.",
            // TODO: include the reason moderators provided for the account ban, if it exists
          });
          return next();
        }

        if (torIps.includes(req.expandedIP)) {
          const torSignup = new Signups({
            date: new Date(),
            userName: req.user.username,
            type: "Failed Login - TOR",
            ip: obfIP(req.expandedIP),
            email: "",
            unobfuscatedIP: req.expandedIP,
          });

          torSignup.save();
          req.logOut();
          res.status(403).json({
            message: "Use of TOR is not allowed on this site.",
          });
          return next();
        }

        let ip = req.expandedIP;

        try {
          ip = expandAndSimplify(ip);
        } catch (e) {
          console.log(e);
        }

        player.lastConnectedIP = ip;
        if (
          (player.ipHistory && player.ipHistory.length === 0) ||
          (player.ipHistory.length > 0 && player.ipHistory[player.ipHistory.length - 1].ip !== ip)
        ) {
          player.ipHistory.push({
            date: new Date(),
            ip: ip,
          });
        }
        player.save(() => {
          res.send();
        });

        if (player.isTimeout && new Date() < player.isTimeout) {
          req.logOut();
          res.status(403).json({
            message: `Your account has been timed out.  If you believe this is in error, contact the moderators on Discord. Your timeout expires on ${new Date(
              player.isTimeout
            )}`,
            // TODO: include the reason moderators provided for the account timeout, if it exists
          });
        }
        const email = player.verification.email;
        if (email && email.split("@")[1] && bannedEmails.includes(email.split("@")[1])) {
          player.verified = false;
          player.verification.email = "";
        }
      });
    }
  );

  app.post("/account/add-email", ensureAuthenticated, (req, res, next) => {
    if (req.user.isLocal === false) {
      return res.status(403).json({ message: "Passwordless accounts use the email from their original sign-in provider." });
    }
    const parsed = emailBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return next(); // intentional: mirrors this route's existing absent-email fall-through (not an explicit status)
    }
    const { email } = parsed.data;
    const { username } = req.user;

    if (!email) {
      return next();
    }

    if (email.split("@")[1] && bannedEmails.includes(email.split("@")[1]) && process.env.NODE_ENV === "production") {
      res.status(401).json({
        message: "Only non-disposible email providers are allowed to create verified accounts.",
      });
    } else if (!emailRegex.test(email)) {
      res.status(401).json({
        message: `That doesn't look like a valid email address.`,
      });
    } else {
      Account.findOne({ "verification.email": email }, (err, account) => {
        if (err) {
          return next();
        }

        if (account && process.env.NODE_ENV === "production") {
          res.status(401).json({
            message:
              "That email address is being used by another verified account, please change that or use another email.",
          });
        } else {
          Account.findOne({ username })
            .then((account) => {
              account.verification.email = email;
              account.save(() => {
                setVerify({ username: req.user.username, email, res });
              });
            })
            .catch((err) => {
              console.log(err, "err in account in add email");
            });
        }
      });
    }
  });

  app.post("/account/change-email", ensureAuthenticated, (req, res, next) => {
    if (req.user.isLocal === false) {
      return res.status(403).json({ message: "Passwordless accounts use the email from their original sign-in provider." });
    }
    const parsed = emailBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return next(); // intentional: mirrors this route's existing absent-email fall-through (not an explicit status)
    }
    const { email } = parsed.data;
    const { username } = req.user;

    if (
      email &&
      email.split("@")[1] &&
      bannedEmails.includes(email.split("@")[1]) &&
      process.env.NODE_ENV === "production"
    ) {
      res.status(401).json({
        message: "Only non-disposible email providers are allowed to create verified accounts.",
      });
    } else if (email && !emailRegex.test(email)) {
      res.status(401).json({
        message: `That doesn't look like a valid email address.`,
      });
    } else {
      Account.findOne({ "verification.email": email }, (err, account) => {
        if (err) {
          return next();
        }

        if (account && process.env.NODE_ENV === "production") {
          res.status(401).json({
            message:
              "That email address is being used by another verified account, please change that or use another email.",
          });
        } else {
          Account.findOne({ username }, (err, account) => {
            if (err) {
              return next();
            }

            account.verification.email = email;
            account.verified = false;
            account.save(() => {
              setVerify({ username, email, res });
            });
          });
        }
      });
    }
  });

  app.post("/account/request-verification", ensureAuthenticated, (req, res, next) => {
    const { verification } = req.user;
    const { email } = verification;

    if (verification && email) {
      Account.findOne({ "verification.email": email }, (err, account) => {
        if (err) {
          return next();
        }

        if (account && process.env.NODE_ENV === "production") {
          res.status(401).json({
            message:
              "That email address is being used by another verified account, please change that or use another email.",
          });
        } else {
          setVerify({ username: req.user.username, email, res });
        }
      });
    }
  });

  app.post("/account/logout", ensureAuthenticated, (req, res) => {
    req.logOut();
    res.send();
  });

  app.get("/getipintel-status", (req, res) => {
    res.send(
      `Current GetIPIntel counter is at ${getIPIntelCounter.count} - resets in ${(getIPIntelCounter.reset - new Date()) / 1000 / 60} minutes`
    );
  });

  app.post("/account/confirm-delete/:type", ensureAuthenticated, (req, res, next) => {
    const type = req.params.type;
    if (type !== "discord" && type !== "github") {
      return res.status(400).send();
    }
    if (!validDeleteAccountCsrf(req.session, req.body?.csrfToken)) {
      return res.status(403).send("Invalid request.");
    }
    findAccountForDeletion(req.user)
      .then((account) => {
        if (accountDeletionAuthMode(account) !== AUTH_OAUTH || !linkedProviderId(account, type)) {
          return res.status(403).send("Provider confirmation is not available for this account.");
        }
        const state = newDeleteAccountOAuthRequest(req.session, account, type);
        if (type === "github") {
          return passport.authenticate("github", { scope: ["read:user", "user:email"], state })(req, res, next);
        }
        return passport.authenticate("discord", { state })(req, res, next);
      })
      .catch(next);
  });

  app.get("/discord-login", passport.authenticate("discord"));

  app.get("/github-login", passport.authenticate("github", { scope: ["read:user", "user:email"] }));

  const oAuthAuthentication = (req, res, next, type) => {
    let deleteRequest;
    if (isDeleteAccountOAuthState(req.query?.state)) {
      deleteRequest = takeDeleteAccountOAuthRequest(req.session, req.user, type, req.query.state);
      if (!deleteRequest) return res.status(403).send("Deletion confirmation expired. Start again on your account page.");
    }
    const ip = req.expandedIP;
    testIP(ip, (banType, unbanTime) => {
      if (banType && banType !== "new" && banType !== "fragbanSmall" && banType !== "fragbanLarge") {
        if (banType === "nocache")
          res.status(403).json({ message: "The server is still getting its bearings, try again in a few moments." });
        else if (banType === "small" || banType === "big") {
          res.status(403).json({
            message:
              "You can no longer access this service.  If you believe this is in error, contact the moderators on our discord channel.",
          });
        } else if (banType === "tiny") {
          res.status(403).json({
            message: `Your IP address was timed out.  If you believe this is in error, contact the moderators on Discord. Your timeout expires on ${new Date(
              unbanTime
            )}`,
          });
        } else {
          console.log(`Unhandled IP ban type: ${banType}`);
          res.status(403).json({
            message:
              "You can no longer access this service.  If you believe this is in error, contact the moderators on our discord channel.",
          });
        }
      } else {
        passport.authenticate(type, (profile) => {
          if (deleteRequest) {
            if (profile?.id !== deleteRequest.providerId) {
              return res.status(403).send("Provider does not match the linked account.");
            }
            confirmAccountDeletion(req.session, deleteRequest);
            return res.redirect("/account");
          }

          if (!profile || !profile.id) {
            return next();
          }

          if (req.user) {
            if (
              req.user.isLocal === false &&
              req.user.oauthSignupProvider === type &&
              linkedProviderId(req.user, type) !== profile.id
            ) {
              return res.status(403).send("You can only sign in with the original linked provider for this account.");
            }
            if (type === "discord") {
              req.user.discordUsername = profile.username;
              req.user.discordDiscriminator = profile.discriminator;
              req.user.discordMFA = profile.mfa_enabled;
              req.user.discordUID = profile.id;
            } else {
              req.user.githubUsername = profile.username;
              req.user.githubUID = profile.id;
              req.user.githubMFA = profile.two_factor_authentication;
            }
            req.user.verified = true;
            req.user.save(() => {
              res.redirect("/game");
            });
          } else {
            // see if their oauth information matches an account, if so sign them in
            const queryObj = type === "discord" ? { discordUID: profile.id } : { githubUsername: profile.username };

            Account.findOne(queryObj)
              .then((account) => {
                if (account) {
                  req.login(account, () => res.redirect("/game"));
                } else {
                  if (accountCreationDisabled.status) {
                    res.status(403).json({
                      message:
                        "Creating new accounts is temporarily disabled most likely due to a spam/bot/griefing attack.  If you need an exception, please contact our moderators on discord.",
                    });
                  } else {
                    // see if there's an existing sh account with their oauth name, if so have them select a new username, if not make an account.
                    Account.findOne({ username: new RegExp(profile.username, "i") })
                      .then((account) => {
                        req.session.oauthType = type;
                        if (account) {
                          req.session.oauthProfile = profile;
                          res.redirect("/oauth-select-username");
                        } else if (/88$/i.test(profile.username)) {
                          const new88 = new EightEightCounter({
                            date: new Date(),
                            username: profile.username,
                          });
                          new88.save(() => {
                            req.session.oauthProfile = profile;
                            res.redirect("/oauth-select-username");
                          });
                        } else if (
                          !/^[a-z0-9]+$/i.test(profile.username) ||
                          !profile.username ||
                          profile.username.length < 3 ||
                          profile.username.length > 12 ||
                          accountCreationDisabled.status
                        ) {
                          req.session.oauthProfile = profile;
                          res.redirect("/oauth-select-username");
                        } else {
                          const continueSignupConfig = {
                            req,
                            res,
                            username: profile.username,
                            email: type === "discord" ? profile.email : profile._json.email,
                            signupIP: ip,
                            next: continueSignup,
                            isOAuth: true,
                            type,
                            profile,
                          };
                          checkIP(continueSignupConfig);
                        }
                      })
                      .catch((err) => {
                        console.log(err, "err in oauth1");
                      });
                  }
                }
              })
              .catch((err) => {
                console.log(err, "err in oauth2");
              });
          }
        })(req, res, next);
      }
    });
  };

  app.get("/github/login-callback", (req, res, next) => {
    oAuthAuthentication(req, res, next, "github");
  });

  app.get("/discord/login-callback", (req, res, next) => {
    oAuthAuthentication(req, res, next, "discord");
  });

  app.get("/oauth-select-username", (req, res, next) => {
    if (!req.session.oauthProfile) {
      return next();
    }

    res.render("page-new-username");
  });

  app.post("/oauth-select-username", (req, res, next) => {
    const parsed = usernameBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(401).send();
      return;
    }
    const { username } = parsed.data;
    const { oauthProfile, oauthType } = req.session;

    if (
      !req.session.oauthProfile ||
      !username ||
      !/^[a-z0-9]+$/i.test(username) ||
      username.length < 3 ||
      username.length > 12 ||
      accountCreationDisabled.status
    ) {
      res.status(401).send();
      return;
    }
    const ip = req.expandedIP;
    testIP(ip, (banType, unbanTime) => {
      if (banType) {
        if (banType === "new") {
          res.status(403).json({
            message:
              "You can only make accounts once per day. If you feel you need an exception to this rule, contact the moderators on our discord server.",
          });
        } else if (banType === "nocache") {
          res.status(403).json({ message: "The server is still getting its bearings, try again in a few moments." });
        } else if (banType === "small" || banType === "big") {
          res.status(403).json({
            message:
              "You can no longer access this service.  If you believe this is in error, contact the moderators on our discord channel.",
          });
        } else if (banType === "tiny") {
          res.status(403).json({
            message: `Your IP address was timed out.  If you believe this is in error, contact the moderators on Discord. Your timeout expires on ${new Date(
              unbanTime
            )}`,
          });
        } else {
          console.log(`Unhandled IP ban type: ${banType}`);
          res.status(403).json({
            message:
              "You can no longer access this service.  If you believe this is in error, contact the moderators on our discord channel.",
          });
        }
      } else {
        const continueSignupConfig = {
          req,
          res,
          username,
          email:
            oauthType === "discord"
              ? oauthProfile && oauthProfile.email
              : oauthProfile && oauthProfile._json && oauthProfile._json.email,
          signupIP: ip,
          next: continueSignup,
          isOAuth: true,
          type: oauthType,
          profile: oauthProfile,
        };
        checkIP(continueSignupConfig);
      }
    });
  });

  app.get("/revoke-discord", ensureAuthenticated, (req, res) => {
    if (req.user.isLocal === false && req.user.oauthSignupProvider === "discord") {
      return res.status(403).send("Set a password before unlinking your original sign-in provider.");
    }
    req.user.discordUsername = null;
    req.user.discordDiscriminator = null;
    req.user.discordUID = null;
    req.user.discordMFA = null;
    req.user.save(() => {
      res.redirect("/account");
    });
  });

  app.get("/revoke-github", ensureAuthenticated, (req, res) => {
    if (req.user.isLocal === false && req.user.oauthSignupProvider === "github") {
      return res.status(403).send("Set a password before unlinking your original sign-in provider.");
    }
    req.user.githubUsername = null;
    req.user.githubUID = null;
    req.user.githubMFA = null;
    req.user.save(() => {
      res.redirect("/account");
    });
  });

  app.get("*", (req, res) => {
    renderPage(req, res, "404", "404");
  });

  console.log("All Routes Successfully Initialized");
};
