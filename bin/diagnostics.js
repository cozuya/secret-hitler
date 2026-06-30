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

// Persist under the mounted disk (CARDBACK_DIR == the disk's mountPath) when it exists; fall back to
// the OS temp dir in local dev so we never write into the repo tree. DIAGNOSTICS_DIR overrides both.
const baseDir =
  process.env.DIAGNOSTICS_DIR ||
  (process.env.CARDBACK_DIR
    ? path.join(process.env.CARDBACK_DIR, "diagnostics")
    : path.join(os.tmpdir(), "secret-hitler-diagnostics"));

let ready = false;
let warned = false;
function ensureDir() {
  if (ready) return true;
  try {
    fs.mkdirSync(baseDir, { recursive: true });
    ready = true;
  } catch (err) {
    if (!warned) {
      // Warn once, then stay silent — never spam the log, never throw.
      warned = true;
      console.error("diagnostics: could not create", baseDir, (err && err.message) || err);
    }
  }
  return ready;
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
function sampleLoad() {
  try {
    // Lazy require so we hit the already-initialized module cache (the sampler is started after
    // app boot) and never trigger models' side effects ourselves.
    const models = require("../routes/socket/models");
    const games = models.games && typeof models.games === "object" ? Object.keys(models.games).length : null;
    const users = Array.isArray(models.userList) ? models.userList.length : null;
    return { games, users };
  } catch {
    return { games: null, users: null };
  }
}

function startMemorySampler(intervalMs = 60000) {
  const tick = () => {
    const m = process.memoryUsage();
    const load = sampleLoad();
    appendLine(
      "memory.jsonl",
      JSON.stringify({
        t: new Date().toISOString(),
        rss: m.rss,
        heapUsed: m.heapUsed,
        heapTotal: m.heapTotal,
        external: m.external,
        arrayBuffers: m.arrayBuffers,
        games: load.games,
        users: load.users,
      })
    );
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
  baseDir,
  logCrash,
  installSignalMarkers,
  startMemorySampler,
  installHeapSnapshotHandler,
};
