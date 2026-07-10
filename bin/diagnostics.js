"use strict";

// Best-effort runtime diagnostics written to the PERSISTENT DISK so they survive the instance
// dying. The host's log buffer is ephemeral ("Live logs are unavailable after an instance fails"),
// so an external OOM / health-check kill (SIGKILL — no JS runs, no stack trace) would otherwise
// leave nothing to look at after the fact. Nothing in here may ever throw into the caller: a
// diagnostics failure must never be the thing that takes the server down.

const fs = require("fs");
const path = require("path");
const os = require("os");
const v8 = require("v8");

// Persist on the mounted disk so these survive the instance dying. On Render the persistent disk is
// mounted AT CARDBACK_DIR (/var/data/cardbacks) — NOT at its parent /var/data, which is a root-owned
// ephemeral dir the service user (uid 1000) can't write to. So the old sibling path
// ("<CARDBACK_DIR>/../diagnostics") was both unwritable (EACCES) and non-persistent, and silently
// logged nothing. Instead we nest a DOT-prefixed dir INSIDE the writable mount; app.js serves
// CARDBACK_DIR with dotfiles:"deny", so crash logs and heap snapshots (which can contain session
// data) stay private despite living under the static-served tree. Try candidates in order, first
// writable one wins: an explicit DIAGNOSTICS_DIR (render.yaml) first, then the in-mount dot-dir, then
// the OS temp dir for local dev. This self-heals even if DIAGNOSTICS_DIR is stale/unset.
const candidateDirs = [
  process.env.DIAGNOSTICS_DIR,
  process.env.CARDBACK_DIR && path.join(process.env.CARDBACK_DIR, ".diagnostics"),
  path.join(os.tmpdir(), "secret-hitler-diagnostics"),
].filter(Boolean);

// Resolved lazily by ensureDir() (the first candidate we can actually mkdir), so it stays null until
// then — read it through the exported getter, never capture it at module load.
let baseDir = null;
let warned = false;
function ensureDir() {
  if (baseDir) return true;
  for (const dir of candidateDirs) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      baseDir = dir;
      return true;
    } catch {
      // not writable (e.g. EACCES under the root-owned mount parent) — fall through to the next
    }
  }
  if (!warned) {
    // Warn once, then stay silent — never spam the log, never throw.
    warned = true;
    console.error("diagnostics: could not create any of", candidateDirs.join(", "));
  }
  return false;
}

function appendLine(file, line) {
  if (!ensureDir()) return;
  try {
    fs.appendFileSync(path.join(baseDir, file), line + "\n");
  } catch {
    // best-effort only
  }
}

// --- crash logging ------------------------------------------------------------------------------
// Mirror the fatal handlers' console.error to a durable file. The console copy is ephemeral on the
// host; this one is recoverable from the Render Shell (`cat`) long after the instance restarted.
// Synchronous append on purpose: the caller exits immediately after, so an async write wouldn't
// flush. Note: this only fires when our code actually THROWS — an external OOM/health kill produces
// no stack trace anywhere (the memory sampler below is the signal for those).
function logCrash(kind, errOrReason, context) {
  const stack = (errOrReason && errOrReason.stack) || String(errOrReason);
  const block = [
    `===== ${new Date().toISOString()} ${kind} =====`,
    stack,
    context ? `last socket packet (may be related): ${JSON.stringify(context)}` : "",
    "",
  ]
    .filter(Boolean)
    .join("\n");
  appendLine("crashes.log", block);
}

// --- platform-termination marker ----------------------------------------------------------------
// Distinguishes "the platform stopped us" (deploy, or an OOM/health-check kill that arrives as
// SIGTERM) from "our code threw" (uncaughtException). Without it the two are indistinguishable after
// the fact — exactly the ambiguity that sent us chasing a benign deprecation warning. Logs a marker,
// then exits as Node's default would. Production-only so it doesn't fight nodemon's signal handling
// in local dev.
function installSignalMarkers() {
  if (process.env.NODE_ENV !== "production") return;
  for (const sig of ["SIGTERM", "SIGINT"]) {
    process.on(sig, () => {
      const mem = process.memoryUsage();
      appendLine(
        "lifecycle.log",
        `${new Date().toISOString()} ${sig} received (rss=${Math.round(mem.rss / 1048576)}MB) — exiting`
      );
      process.exit(0);
    });
  }
}

// --- memory sampler ------------------------------------------------------------------------------
// One JSONL line per interval: the memory curve plus the live load (games/users) to read it
// against. This is what settles leak-vs-undersized — a ramp that tracks player count is just load;
// a ramp that climbs regardless of players is accumulation. ~200KB/day at the default interval.
const emptyLoadSample = () => ({
  games: null,
  users: null,
  sockets: null,
  socketWriteBufferPackets: null,
  maxSocketWriteBufferPackets: null,
  openModDMs: null,
  completedGames: null,
  abandonedGames: null,
  gameChatEntries: null,
});

function sampleLoad() {
  const sample = emptyLoadSample();
  try {
    // Lazy require so we hit the already-initialized module cache (the sampler is started after
    // app boot) and never trigger models' side effects ourselves.
    const models = require("../routes/socket/models");
    const gameValues =
      models.games && typeof models.games === "object"
        ? Object.keys(models.games).map((uid) => models.games[uid])
        : null;
    const games = gameValues ? gameValues.length : null;
    const users = Array.isArray(models.userList) ? models.userList.length : null;
    const openModDMs = models.modDMs && typeof models.modDMs === "object" ? Object.keys(models.modDMs).length : null;
    const socketValues =
      global.io && global.io.sockets && global.io.sockets.sockets
        ? Object.keys(global.io.sockets.sockets).map((id) => global.io.sockets.sockets[id])
        : null;
    let socketWriteBufferPackets = null;
    let maxSocketWriteBufferPackets = null;
    if (socketValues) {
      const writeBufferLengths = socketValues.map((socket) =>
        socket && socket.conn && Array.isArray(socket.conn.writeBuffer) ? socket.conn.writeBuffer.length : 0
      );
      socketWriteBufferPackets = writeBufferLengths.reduce((sum, length) => sum + length, 0);
      maxSocketWriteBufferPackets = writeBufferLengths.reduce((max, length) => Math.max(max, length), 0);
    }

    let completedGames = null;
    let abandonedGames = null;
    let gameChatEntries = null;
    if (gameValues) {
      completedGames = gameValues.filter((game) => game && game.gameState && game.gameState.isCompleted).length;
      abandonedGames = gameValues.filter((game) => game && game.general && game.general.timeAbandoned).length;
      gameChatEntries = gameValues.reduce((total, game) => {
        if (!game) return total;
        const privateState = game.private || {};
        const seatedPlayerChats = Array.isArray(privateState.seatedPlayers)
          ? privateState.seatedPlayers.reduce(
              (sum, player) => sum + (player && Array.isArray(player.gameChats) ? player.gameChats.length : 0),
              0
            )
          : 0;
        return (
          total +
          (Array.isArray(game.chats) ? game.chats.length : 0) +
          (Array.isArray(privateState.unSeatedGameChats) ? privateState.unSeatedGameChats.length : 0) +
          (Array.isArray(privateState.replayGameChats) ? privateState.replayGameChats.length : 0) +
          (Array.isArray(privateState.hiddenInfoChat) ? privateState.hiddenInfoChat.length : 0) +
          seatedPlayerChats
        );
      }, 0);
    }

    Object.assign(sample, {
      games,
      users,
      sockets: socketValues ? socketValues.length : null,
      socketWriteBufferPackets,
      maxSocketWriteBufferPackets,
      openModDMs,
      completedGames,
      abandonedGames,
      gameChatEntries,
    });
  } catch {
    // Best-effort diagnostics: retain the complete null-shaped schema if live state is unreadable.
  }
  return sample;
}

function startMemorySampler(intervalMs = 60000) {
  const tick = () => {
    try {
      const m = process.memoryUsage();
      const load = sampleLoad();
      const heapStatistics = v8.getHeapStatistics();
      const heapSpaces = v8.getHeapSpaceStatistics();
      const spaceUsed = (name) => {
        const space = heapSpaces.find((candidate) => candidate.space_name === name);
        return space ? space.space_used_size : null;
      };
      const activeResources =
        typeof process.getActiveResourcesInfo === "function" ? process.getActiveResourcesInfo() : [];
      appendLine(
        "memory.jsonl",
        JSON.stringify({
          t: new Date().toISOString(),
          pid: process.pid,
          uptime: Math.floor(process.uptime()),
          mallocArenaMax: process.env.MALLOC_ARENA_MAX || null,
          rss: m.rss,
          heapUsed: m.heapUsed,
          heapTotal: m.heapTotal,
          external: m.external,
          arrayBuffers: m.arrayBuffers,
          oldSpaceUsed: spaceUsed("old_space"),
          largeObjectSpaceUsed: spaceUsed("large_object_space"),
          newSpaceUsed: spaceUsed("new_space"),
          mallocedMemory: heapStatistics.malloced_memory,
          peakMallocedMemory: heapStatistics.peak_malloced_memory,
          // Node reports both ref'ed setTimeout and setInterval handles as "Timeout"; the sampler's
          // own interval is unref'ed below, so it does not create a permanent floor in this count.
          activeTimeouts: activeResources.filter((resource) => resource === "Timeout").length,
          ...load,
        })
      );
    } catch {
      // Sampling is strictly best-effort; diagnostics must never be the reason the process exits.
    }
  };
  tick(); // baseline at boot
  const timer = setInterval(tick, intervalMs);
  if (timer.unref) timer.unref(); // never keep the process alive just for sampling
  return timer;
}

// --- on-demand heap snapshot --------------------------------------------------------------------
// `kill -USR2 <pid>` from the Render Shell writes a .heapsnapshot to the disk; grab one at a low-mem
// floor and one near the ceiling, then diff them in Chrome DevTools to see exactly what's retained.
// Manual (not threshold-triggered) on purpose: auto-writing a multi-hundred-MB snapshot while
// already near the memory wall could be the thing that pushes us over. Production-only to avoid
// colliding with nodemon's SIGUSR2 restart in local dev.
function installHeapSnapshotHandler() {
  if (process.env.NODE_ENV !== "production") return;
  process.on("SIGUSR2", () => {
    if (!ensureDir()) return;
    try {
      const file = path.join(baseDir, `heap-${Date.now()}.heapsnapshot`);
      v8.writeHeapSnapshot(file);
      console.log("diagnostics: wrote heap snapshot", file);
    } catch (err) {
      console.error("diagnostics: heap snapshot failed", (err && err.message) || err);
    }
  });
}

module.exports = {
  // Getter, not a value: baseDir is null until ensureDir() picks a writable candidate, so a plain
  // value export would freeze it at null. (Currently unread, but keep it honest.)
  get baseDir() {
    return baseDir;
  },
  logCrash,
  installSignalMarkers,
  startMemorySampler,
  installHeapSnapshotHandler,
};
