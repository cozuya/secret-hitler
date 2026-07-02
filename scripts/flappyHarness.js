/* Headless 5-player flappy harness: signs in the quick-login accounts, creates and starts a
 * 5p game, sends /forceflappy as Uther, and auto-pilots both birds through the gaps.
 * Requires: server running on :8080, accounts created (pnpm create-accounts), Uther assigned
 * admin (pnpm assign-local-mod) BEFORE the server was started (staff roles are cached at boot).
 * Usage: node scripts/flappyHarness.js            (auto-plays, fascists crash after 20s)
 *        DEMO_SECONDS=600 node scripts/flappyHarness.js   (keeps both birds alive 10 min so you can watch)
 */
const http = require("http");
const io = require("socket.io-client");

const BASE = "http://localhost:8080";
const USERS = ["Uther", "Jaina", "Rexxar", "Thrall", "Valeera"];
const PASSWORD = "snipsnap";

const log = (...args) => console.log(new Date().toISOString().slice(11, 23), ...args);

const signin = (username) =>
  new Promise((resolve, reject) => {
    const body = JSON.stringify({ username, password: PASSWORD });
    const req = http.request(
      {
        method: "POST",
        hostname: "localhost",
        port: 8080,
        path: "/account/signin",
        headers: { "content-type": "application/json; charset=UTF-8", "content-length": Buffer.byteLength(body) },
      },
      (res) => {
        res.resume();
        res.on("end", () => {
          const cookies = res.headers["set-cookie"];
          if (res.statusCode === 200 && cookies) {
            resolve(cookies.map((c) => c.split(";")[0]).join("; "));
          } else {
            reject(new Error(`signin ${username} failed: ${res.statusCode} cookies=${Boolean(cookies)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.end(body);
  });

const connect = (cookie) =>
  new Promise((resolve, reject) => {
    const socket = io(BASE, {
      forceNew: true,
      reconnection: false,
      transports: ["polling", "websocket"],
      transportOptions: { polling: { extraHeaders: { Cookie: cookie } } },
    });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", reject);
    setTimeout(() => reject(new Error("connect timeout")), 8000);
  });

const gamePayload = {
  gameName: "flappy harness",
  gameType: "casual",
  flag: "none",
  minPlayersCount: 5,
  excludedPlayerCount: [6, 7, 8, 9],
  maxPlayersCount: 10,
  experiencedMode: true,
  playerChats: "enabled",
  disableObserverLobby: false,
  disableObserver: false,
  isTourny: false,
  isVerifiedOnly: false,
  disableGamechat: false,
  rainbowgame: false,
  blindMode: false,
  flappyMode: true,
  flappyOnlyMode: false,
  timedMode: false,
  rebalance6p: false,
  rebalance7p: false,
  rebalance9p2f: false,
  eloSliderValue: null,
  xpSliderValue: null,
  unlistedGame: false,
  privatePassword: false,
  privateAnonymousRemakes: false,
  customGameSettings: undefined,
  avalonSH: false,
  withPercival: false,
  monarchistSH: false,
  noTopdecking: 0,
};

const main = async () => {
  const clients = {};

  for (const name of USERS) {
    const cookie = await signin(name);
    const socket = await connect(cookie);
    socket.emit("confirmTOU");
    socket.emit("getUserGameSettings");
    socket.on("sendAlert", (msg) => log(`ALERT for ${name}:`, msg));
    clients[name] = { socket, name, lastGame: null };
    log(`connected ${name}`);
  }

  // confirmTOU saves to mongo async; give it a moment so isRestricted clears before addNewGame
  await new Promise((r) => setTimeout(r, 2000));

  const creator = clients[USERS[0]];

  const uid = await new Promise((resolve, reject) => {
    creator.socket.on("joinGameRedirect", (gameUid) => resolve(gameUid));
    creator.socket.emit("addNewGame", gamePayload);
    setTimeout(() => reject(new Error("no joinGameRedirect")), 8000);
  });
  log(`game created uid=${uid}`);
  log(
    `WATCH IT HERE: http://localhost:8080 -> quick-login a player in the top dev bar -> click the game, or observe without logging in`
  );

  // everyone joins room + takes a seat
  for (const name of USERS) {
    const { socket } = clients[name];
    socket.on("gameUpdate", (game) => {
      if (game && game.gameState) clients[name].lastGame = game;
    });
    socket.emit("getGameInfo", uid);
    socket.emit("updateSeatedUser", { uid });
  }

  // wait for tracks flipped (game fully started)
  await new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = setInterval(() => {
      const g = creator.lastGame;
      const seated = g ? g.publicPlayersState.length : 0;
      if (g && g.gameState.isTracksFlipped) {
        clearInterval(poll);
        resolve();
      } else if (Date.now() - started > 60000) {
        clearInterval(poll);
        reject(new Error(`game never started; seated=${seated} status=${g && g.general.status}`));
      }
    }, 500);
  });
  log("game started (tracks flipped)");

  // snapshot + result plumbing
  let lastSnapshot = null;
  let snapshotCount = 0;
  creator.socket.on("flappyUpdate", (snap) => {
    if (snap && snap.type === "snapshot") {
      lastSnapshot = snap;
      snapshotCount++;
    }
  });

  await new Promise((r) => setTimeout(r, 3000)); // let role dealing finish
  creator.socket.emit("addNewGameChat", { uid, chat: "/forceflappy" });
  log("sent /forceflappy");

  await new Promise((resolve, reject) => {
    const started = Date.now();
    let retries = 0;
    const poll = setInterval(() => {
      if (lastSnapshot) {
        clearInterval(poll);
        resolve();
      } else if (Date.now() - started > 3000 * (retries + 1) && retries < 2) {
        retries++;
        log(`retrying /forceflappy (${retries})`);
        creator.socket.emit("addNewGameChat", { uid, chat: "/forceflappy" });
      } else if (Date.now() - started > 12000) {
        clearInterval(poll);
        const g = creator.lastGame;
        const recent = (g.chats || [])
          .filter((c) => c.gameChat)
          .slice(-5)
          .map((c) => c.chat.map((s) => s.text).join(""));
        log("recent chats:", JSON.stringify(recent));
        log("phase:", g.gameState.phase, "flappyState:", JSON.stringify(g.flappyState || null).slice(0, 200));
        reject(new Error("no flappy snapshots after /forceflappy"));
      }
    }, 200);
  });
  log(
    `flappy running. controllers: lib=${lastSnapshot.liberal.controllerUserName} fas=${lastSnapshot.fascist.controllerUserName}`
  );
  log(`phase=${creator.lastGame.gameState.phase} status="${creator.lastGame.general.status}"`);

  // negative test: a non-controller flap must be ignored
  const libController = lastSnapshot.liberal.controllerUserName;
  const nonController = USERS.find((u) => u !== libController && u !== lastSnapshot.fascist.controllerUserName);
  const libBirdBefore = lastSnapshot.liberal.bird.velocity;
  clients[nonController].socket.emit("flappyEvent", { uid, type: "flap" });

  // pilot both birds through gaps for ~20s (tests gap passing), then let the fascist bird fall
  const flappyStart = Date.now();
  const pilot = (team) => {
    const snap = lastSnapshot;
    const cfg = snap.config;
    const bird = snap[team].bird;
    const nextPylon = snap.pylons.filter((p) => p.x + cfg.pylonWidth > cfg.birdX).sort((a, b) => a.x - b.x)[0];
    const targetY = nextPylon ? (nextPylon.gapTop + nextPylon.gapBottom) / 2 : cfg.laneHeight / 2;
    if (bird.y + cfg.birdHeight / 2 > targetY) {
      clients[snap[team].controllerUserName].socket.emit("flappyEvent", { uid, type: "flap" });
    }
  };
  const bothAliveMs = process.env.DEMO_SECONDS ? parseInt(process.env.DEMO_SECONDS, 10) * 1000 : 20000;
  const flapLoop = setInterval(() => {
    if (!lastSnapshot || lastSnapshot.status !== "running") return;
    pilot("liberal");
    if (Date.now() - flappyStart < bothAliveMs) {
      pilot("fascist");
    }
  }, 100);

  const result = await new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = setInterval(() => {
      const g = creator.lastGame;
      if (lastSnapshot.status === "finished" || (g && g.gameState.isCompleted)) {
        clearInterval(poll);
        clearInterval(flapLoop);
        setTimeout(() => resolve(g), 1500); // allow completeGame's timeout to run
      } else if (Date.now() - started > bothAliveMs + 90000) {
        clearInterval(poll);
        clearInterval(flapLoop);
        reject(new Error("flappy never finished"));
      }
    }, 250);
  });

  log(`flappy finished. snapshots received: ${snapshotCount}`);
  log(`winner (snapshot): ${lastSnapshot.winningTeam}`);
  const finalGame = creator.lastGame;
  log(`gameState.isCompleted: ${finalGame.gameState.isCompleted}`);
  log(`final status: "${finalGame.general.status}"`);
  const winChat = (finalGame.chats || [])
    .filter((c) => c.gameChat)
    .map((c) => c.chat.map((s) => s.text).join(""))
    .slice(-6);
  log("last game chats:", JSON.stringify(winChat, null, 1));
  log(`passedGapCount: ${lastSnapshot.passedGapCount}`);
  log(`non-controller flap test: sent from ${nonController} (velocity before=${libBirdBefore})`);

  const pass =
    lastSnapshot.winningTeam === "liberal" &&
    finalGame.gameState.isCompleted === "liberal" &&
    snapshotCount > 20 &&
    lastSnapshot.passedGapCount > 0;
  log(
    pass
      ? "RESULT: PASS"
      : `RESULT: CHECK (winner=${lastSnapshot.winningTeam}, isCompleted=${finalGame.gameState.isCompleted}, snaps=${snapshotCount}, gaps=${lastSnapshot.passedGapCount})`
  );

  Object.values(clients).forEach((c) => c.socket.close());
  process.exit(0);
};

main().catch((err) => {
  console.error("HARNESS FAILED:", err.message);
  process.exit(1);
});
