const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const favicon = require("serve-favicon");
const socketSession = require("express-socket.io-session");
const passport = require("passport");
const mongoose = require("mongoose");
const compression = require("compression");
const LocalStrategy = require("passport-local").Strategy;
const DiscordStrategy = require("passport-discord").Strategy;
const GithubStrategy = require("passport-github2").Strategy;
const session = require("express-session");
const helmet = require("helmet");

const routesIndex = require("./routes/index");
const Account = require("./models/account");
const Leaderboard = require("./models/leaderboard");
const { expandAndSimplify } = require("./routes/socket/ip-obf");
const { CARDBACK_DIR } = require("./routes/cardback-store");
const { getRedisClientOptions } = require("./routes/redis-client-options");

let store;

if (process.env.NODE_ENV !== "production") {
  const MongoDBStore = require("connect-mongodb-session")(session);
  store = new MongoDBStore({
    uri: "mongodb://localhost:27017/secret-hitler-app",
    collection: "sessions",
  });
} else {
  // Prod uses a shared Render Key Value (Valkey) instance (it also backs another app) via REDIS_URL.
  // All of SH.io stays on db >= 10 so its keys can't collide with the other app on db 0-9: sessions
  // on db 10 (here), global settings on db 11 (routes/socket/models.js). The client now carries the
  // connection, so connect-redis no longer needs the old (and, with a client passed, ignored) host/port.
  const redis = require("redis").createClient(getRedisClientOptions(10));
  redis.on("error", (err) => {
    console.error("Redis session client error:", err);
  });
  const RedisStore = require("connect-redis")(session);
  store = new RedisStore({
    client: redis,
    ttl: 2 * 604800, // 2 weeks
  });
}

// needs to be first
app.use((req, res, next) => {
  try {
    decodeURIComponent(req.path);
    next();
  } catch (e) {
    console.error(`Malformed URI: ${req.path}`);
    console.error(
      `IP data: ${req.headers["cf-connecting-ip"]} | ${req.headers["x-real-ip"]} | ${req.headers["X-Real-IP"]} | ${req.headers["X-Forwarded-For"]} | ${req.headers["x-forwarded-for"]} | ${req.connection.remoteAddress}`
    );
    res.status(500).send("An error occurred.");
  }
});

app.use((req, res, next) => {
  const IP =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-real-ip"] ||
    req.headers["X-Real-IP"] ||
    req.headers["X-Forwarded-For"] ||
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress;
  if (IP.includes(",")) req.expandedIP = expandAndSimplify(IP.split(",")[0].trim());
  else req.expandedIP = expandAndSimplify(IP.trim());
  next();
});

// Behind Render's proxy (and Cloudflare): trust X-Forwarded-* so req.protocol/req.secure reflect the
// real https scheme. Needed for OAuth (passport reads x-forwarded-proto via `proxy: true` on the
// strategies below) and correct secure-cookie behavior. The app's own IP extraction reads
// cf-connecting-ip/x-forwarded-for headers directly, so it's unaffected by this.
// SECURITY NOTE: `true` trusts the entire X-Forwarded-For chain, so a direct caller could spoof
// req.ip / req.secure. Tolerable today because ban/IP logic uses cf-connecting-ip (above), not
// req.ip — but any future req.ip consumer should not treat it as trusted. If that changes, switch
// to a fixed hop count (Cloudflare + Render) or a CIDR allowlist instead of `true`.
app.set("trust proxy", true);
app.set("views", `${__dirname}/views`);
app.set("view engine", "pug");
app.locals.pretty = true;
app.use(compression());
app.use(bodyParser.json({ limit: "10kb" })); // limit can be lower since this should not have a lot of data per request (helps protect against json expansion attacks I guess)
app.use(bodyParser.urlencoded({ extended: false, limit: "200kb" })); // limit needs to be decently high to account for cardback uploads
app.use(favicon(`${__dirname}/public/favicon.ico`));
app.use(cookieParser());
// Serve the daily-generated leaderboards from Mongo (written by the Render Cron Job). Registered
// BEFORE express.static on purpose: the old host's generator wrote a public/leaderboardData.json
// file, and if any such stale file is present the static handler would otherwise shadow this route
// and serve outdated data. Falls back to empty (correctly-shaped) boards until the first cron run.
// TODO(perf): this does a Mongo findById per request for data the cron rewrites once/day (and the
// frontend fetches no-store) — could cache the payload in module memory (short TTL / cron-invalidated).
app.get("/leaderboardData.json", (req, res) => {
  Leaderboard.findById("current")
    .lean()
    .then((doc) => res.json((doc && doc.payload) || Leaderboard.freshBoard()))
    .catch(() => res.json(Leaderboard.freshBoard()));
});
// Serve user-uploaded cardbacks from CARDBACK_DIR (a Render Persistent Disk in prod, the in-repo
// public/ path in dev). Mounted before the general static handler so it stays authoritative even
// though it maps to the same /images/custom-cardbacks/ URL the frontend already requests.
app.use("/images/custom-cardbacks", express.static(CARDBACK_DIR, { maxAge: 86400000 * 28 }));
app.use(express.static(`${__dirname}/public`, { maxAge: 86400000 * 28 }));
app.use(
  helmet.frameguard({
    action: "deny",
  })
);

// Opts out of Google's FLoC - https://plausible.io/blog/google-floc
app.use((req, res, next) => {
  res.set("Permissions-Policy", "interest-cohort=()");
  next();
});

const sessionSettings = {
  secret: process.env.SECRETSESSIONKEY || "hunter2",
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 28, // 4 weeks
  },
  store,
  resave: true,
  saveUninitialized: true,
};

io.use(
  socketSession(session(sessionSettings), {
    // Socket handlers only read passport data from the handshake session; they do not mutate
    // session state. autoSave hashes the full session twice per incoming socket event, which
    // turns into heavy JSON.stringify/crc32 CPU and GC churn under production traffic.
    autoSave: false,
  })
);

app.use(session(sessionSettings));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(Account.authenticate()));

if (process.env.DISCORDCLIENTID) {
  passport.use(
    new DiscordStrategy(
      {
        clientID: process.env.DISCORDCLIENTID,
        clientSecret: process.env.DISCORDCLIENTSECRET,
        callbackURL: "/discord/login-callback",
        scope: ["identify", "email"],
        // Render terminates TLS at its proxy and forwards plain HTTP + x-forwarded-proto. Without
        // this, passport resolves the relative callbackURL above to an http:// redirect_uri that
        // won't match the https:// URI registered with Discord, breaking OAuth on Render. `proxy:
        // true` makes passport honor x-forwarded-proto so it resolves to https://secrethitler.io/...
        proxy: true,
      },
      (accessToken, refreshToken, profile, cb) => {
        cb(profile);
      }
    )
  );

  passport.use(
    new GithubStrategy(
      {
        clientID: process.env.GITHUBCLIENTID,
        clientSecret: process.env.GITHUBCLIENTSECRET,
        callbackURL: "/github/login-callback",
        proxy: true, // resolve callback via x-forwarded-proto on Render — see Discord strategy above
      },
      (accessToken, refreshToken, profile, cb) => {
        cb(profile);
      }
    )
  );
} else {
  console.error("WARN: No oauth client data in .env");
}

passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());
// Prod connects to MongoDB Atlas via MONGO_URL; dev falls back to the local mongod. The db name
// (secret-hitler-app) must be in the Atlas SRV string's path, e.g. ...mongodb.net/secret-hitler-app?...
mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017/secret-hitler-app", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.set("useCreateIndex", true);
mongoose.set("useFindAndModify", false);
mongoose.Promise = global.Promise;

routesIndex();
