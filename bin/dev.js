"use strict";

const http = require("http");
const express = require("express");
require("dotenv").config();

// Crash-with-context. Every socket/game handler is now zod-typed, so a surviving unhandled
// rejection or uncaught exception means genuine corruption — log it loudly so it's diagnosable,
// then let the process die. Continuing on half-mutated game state is worse than a clean restart
// (the process manager brings us back up). Registering these handlers overrides Node's default
// crash, so we MUST exit here; this logs, it never swallows.
process.on("uncaughtException", (err) => {
  console.error("FATAL uncaughtException — exiting:", (err && err.stack) || err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("FATAL unhandledRejection — exiting:", (reason && reason.stack) || reason);
  process.exit(1);
});

const port = (() => {
  const val = process.env.PORT || "8080";
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
})();

global.app = express();

const debug = require("debug")("app:server");
const server = http.createServer(app);

// socket.io was bumped 2.0.3 -> 2.4.1 in the Node-24 migration; the engine.io 3.x it pulls in
// turns message compression (websocket permessage-deflate + HTTP/polling gzip) ON by default.
// Compressing every message for every client pegs the event loop (the deflate/crc32 cost was the
// hot path in profiling) — main never paid this. Disable both to restore the prior behavior.
global.io = require("socket.io")(server, {
  perMessageDeflate: false,
  httpCompression: false,
});
global.notify = require("node-notifier");

app.set("port", port);
app.set("strict routing", true);
server.listen(port);

function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
  console.log("Listening on " + bind);
  require("../app");
}

server.on("error", onError);
server.on("listening", onListening);
