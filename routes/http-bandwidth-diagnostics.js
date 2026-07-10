"use strict";

const DEFAULT_INTERVAL_MS = 60 * 1000;
const DEFAULT_TOP_COUNT = 20;
const MAX_STAT_KEYS = 200;

const diagnosticsState = require("./bandwidth-diagnostics-state");

const staticExtensionPattern = /\.([a-z0-9]{1,8})$/i;
const staticPrefixPatterns = [
  [/^\/images\//, "/images/*"],
  [/^\/sounds\//, "/sounds/*"],
  [/^\/scripts\//, "/scripts/*"],
  [/^\/styles\//, "/styles/*"],
  [/^\/assets\//, "/assets/*"],
];
const exactStaticPaths = new Set([
  "/favicon.ico",
  "/scripts/bundle.js",
  "/scripts/bundle.js.map",
  "/styles/style-main.css",
  "/styles/style-dark.css",
  "/styles/style-web.css",
]);

const normalizePath = (req) => {
  if (req.path === "/socket.io/") {
    return `/socket.io/${req.query.transport || "unknown"}`;
  }

  if (req.path.startsWith("/images/custom-cardbacks/")) {
    return "/images/custom-cardbacks/*";
  }

  if (exactStaticPaths.has(req.path)) {
    return req.path;
  }

  const staticMatch = staticExtensionPattern.exec(req.path);
  if (staticMatch) {
    const prefix = staticPrefixPatterns.find(([pattern]) => pattern.test(req.path));
    return `${prefix ? prefix[1] : "/*"}.${staticMatch[1].toLowerCase()}`;
  }

  return req.route && req.route.path ? req.route.path : "unmatched";
};

const getStatusBucket = (statusCode) => `${Math.floor(statusCode / 100)}xx`;

const buildMiddleware = () => {
  const stats = new Map();
  const intervalMs = Number.parseInt(process.env.BANDWIDTH_DIAGNOSTICS_INTERVAL_MS || "", 10) || DEFAULT_INTERVAL_MS;
  const topCount = Number.parseInt(process.env.BANDWIDTH_DIAGNOSTICS_TOP_COUNT || "", 10) || DEFAULT_TOP_COUNT;

  const timer = setInterval(() => {
    if (!diagnosticsState.isEnabled()) {
      stats.clear();
      return;
    }

    const top = [...stats.entries()]
      .map(([key, value]) => ({
        key,
        count: value.count,
        bytes: value.bytes,
        avgBytes: Math.round(value.bytes / value.count),
        maxBytes: value.maxBytes,
        statuses: value.statuses,
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, topCount);

    if (top.length) {
      console.log(
        "HTTP bandwidth diagnostics:",
        JSON.stringify({
          windowMs: intervalMs,
          top,
        })
      );
      stats.clear();
    }
  }, intervalMs);
  timer.unref();

  return (req, res, next) => {
    if (!diagnosticsState.isEnabled()) {
      return next();
    }

    const socket = res.socket;
    const startBytes = socket ? socket.bytesWritten : 0;

    res.on("finish", () => {
      const endBytes = socket ? socket.bytesWritten : startBytes;
      const bytes = Math.max(0, endBytes - startBytes);
      const key = `${req.method} ${normalizePath(req)}`;
      const boundedKey = stats.has(key) || stats.size < MAX_STAT_KEYS ? key : "OTHER";
      const current = stats.get(boundedKey) || {
        count: 0,
        bytes: 0,
        maxBytes: 0,
        statuses: {},
      };

      current.count++;
      current.bytes += bytes;
      current.maxBytes = Math.max(current.maxBytes, bytes);
      const statusBucket = getStatusBucket(res.statusCode);
      current.statuses[statusBucket] = (current.statuses[statusBucket] || 0) + 1;
      stats.set(boundedKey, current);
    });

    next();
  };
};

module.exports = buildMiddleware();
