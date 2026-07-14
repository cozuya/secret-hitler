"use strict";

const net = require("net");
const { expandAndSimplify, obfIP } = require("./ip-obf");

const MAX_TRACKED_KEYS = 10000;
const PRUNE_INTERVAL_MS = 60 * 1000;
const CONNECTION_WINDOW_MS = 10 * 60 * 1000;
const USER_LIST_WINDOW_MS = 10 * 60 * 1000;
const CONNECTION_IP_THRESHOLD = 25;
const CONNECTION_USER_THRESHOLD = 60;
const USER_LIST_IP_THRESHOLD = 240;
const USER_LIST_USER_THRESHOLD = 120;
const USER_LIST_SOCKET_THRESHOLD = 60;
const USER_LIST_THROTTLE_BLOCK_MS = 10 * 1000;

const counters = new Map();
let lastPruneAt = 0;
let lastCapacityWarningAt = 0;

const normalizeIP = (ip) => {
  const candidate = String(ip).trim();
  const bracketedIPv6 = candidate.match(/^\[([^\]]+)\](?::\d+)?$/);
  const ipv4WithPort = candidate.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  const normalized = bracketedIPv6 ? bracketedIPv6[1] : ipv4WithPort ? ipv4WithPort[1] : candidate;

  if (!net.isIP(normalized)) return "invalid";
  return expandAndSimplify(net.isIP(normalized) === 6 ? normalized.toLowerCase() : normalized);
};

const getSocketIP = (socket) => {
  if (socket && socket._abuseMonitorIP) return socket._abuseMonitorIP;

  // Match app.js's Render/Cloudflare header precedence; malformed forwarded headers fall back
  // to the socket peer address so junk headers don't disable IP counters for this socket.
  const headers = (socket && socket.handshake && socket.handshake.headers) || {};
  const fallbackIP =
    (socket && socket.conn && socket.conn.remoteAddress) ||
    (socket && socket.request && socket.request.connection && socket.request.connection.remoteAddress) ||
    "";
  const ip = headers["cf-connecting-ip"] || headers["x-real-ip"] || headers["x-forwarded-for"] || fallbackIP;

  const firstIp = String(ip).split(",")[0].trim();
  let normalizedIP = firstIp ? normalizeIP(firstIp) : "unknown";

  if (normalizedIP === "invalid" && fallbackIP && fallbackIP !== ip) {
    const firstFallbackIP = String(fallbackIP).split(",")[0].trim();
    normalizedIP = firstFallbackIP ? normalizeIP(firstFallbackIP) : "invalid";
  }

  if (socket) socket._abuseMonitorIP = normalizedIP;
  return normalizedIP;
};

const getLogIP = (ip) => {
  if (ip === "unknown" || ip === "invalid") return ip;

  try {
    const obfuscatedIP = obfIP(ip);
    return obfuscatedIP === "!!IPv6 NOT READY!!" ? "invalid" : obfuscatedIP;
  } catch (e) {
    return "invalid";
  }
};

const getSocketUser = (socket) =>
  (socket && socket.handshake && socket.handshake.session && socket.handshake.session.passport
    ? socket.handshake.session.passport.user
    : "") || "anonymous";

const getSocketKey = (socket) => (socket && socket.id ? socket.id : "");

const resetIfExpired = (counter, now, windowMs, threshold) => {
  if (now - counter.windowStart < windowMs) return counter;

  counter.windowStart = now;
  counter.count = 0;
  counter.blockedUntil = 0;
  counter.nextThrottleCount = threshold;
  return counter;
};

const pruneExpiredCounters = (now) => {
  for (const [key, counter] of counters) {
    if (now - counter.windowStart > counter.windowMs) counters.delete(key);
  }
};

const pruneCountersIfNeeded = (now) => {
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;

  lastPruneAt = now;
  pruneExpiredCounters(now);
};

const evictOldestCounter = (now) => {
  const oldestKey = counters.keys().next().value;
  if (oldestKey) counters.delete(oldestKey);

  if (now - lastCapacityWarningAt < PRUNE_INTERVAL_MS) return;

  lastCapacityWarningAt = now;
  console.warn("Socket abuse monitor at capacity; evicting oldest counters");
};

const record = ({ metric, keyType, keyValue, logKeyValue, windowMs, threshold, blockMs, details }) => {
  const now = Date.now();
  const key = `${metric}:${keyType}:${keyValue}`;

  pruneCountersIfNeeded(now);
  const existingCounter = counters.get(key);

  const counter = resetIfExpired(
    existingCounter || {
      windowStart: now,
      count: 0,
      windowMs,
      blockedUntil: 0,
      nextThrottleCount: threshold,
    },
    now,
    windowMs,
    threshold
  );

  const wasBlocked = counter.blockedUntil && now < counter.blockedUntil;
  counter.windowMs = windowMs;
  if (!counter.nextThrottleCount) counter.nextThrottleCount = threshold;
  counter.count++;

  if (!existingCounter && counters.size >= MAX_TRACKED_KEYS) evictOldestCounter(now);
  // Refresh insertion order so the capacity eviction drops the least recently seen counter.
  if (existingCounter) counters.delete(key);
  counters.set(key, counter);

  if (wasBlocked) return true;
  if (counter.count < counter.nextThrottleCount) return false;

  console.warn(
    "Socket abuse suspect:",
    JSON.stringify({
      metric,
      keyType,
      keyValue: typeof logKeyValue === "function" ? logKeyValue() : logKeyValue || keyValue,
      count: counter.count,
      windowMs,
      ...(typeof details === "function" ? details() : details),
    })
  );

  counter.nextThrottleCount += threshold;

  // The long window is for detection/accounting. User-list enforcement is a short cooldown so a
  // legitimate client is not hard-blocked for the rest of the 10-minute window after one burst.
  if (!blockMs) return false;

  counter.blockedUntil = now + blockMs;
  return true;
};

module.exports.recordSocketConnection = (socket) => {
  const ip = getSocketIP(socket);
  const user = getSocketUser(socket);

  if (ip !== "unknown" && ip !== "invalid") {
    record({
      metric: "socketConnections",
      keyType: "ip",
      keyValue: ip,
      logKeyValue: () => getLogIP(ip),
      windowMs: CONNECTION_WINDOW_MS,
      threshold: CONNECTION_IP_THRESHOLD,
      details: { user },
    });
  }

  if (user !== "anonymous") {
    record({
      metric: "socketConnections",
      keyType: "user",
      keyValue: user,
      windowMs: CONNECTION_WINDOW_MS,
      threshold: CONNECTION_USER_THRESHOLD,
      details: () => ({ ip: getLogIP(ip) }),
    });
  }
};

module.exports.recordUserListRequest = (socket, eventName) => {
  const ip = getSocketIP(socket);
  const user = getSocketUser(socket);
  const socketKey = getSocketKey(socket);
  let shouldThrottle = false;

  // The socket counter catches tight same-connection loops; IP/user counters survive reconnect loops.
  if (socketKey) {
    shouldThrottle = record({
      metric: "userListRequests",
      keyType: "socket",
      keyValue: socketKey,
      windowMs: USER_LIST_WINDOW_MS,
      threshold: USER_LIST_SOCKET_THRESHOLD,
      blockMs: USER_LIST_THROTTLE_BLOCK_MS,
      details: () => ({ ip: getLogIP(ip), user, eventName }),
    });
  }

  // IP is diagnostic only for user-list pulls: shared NATs can contain many legitimate players,
  // and forwarded-header identity is not strong enough to enforce against without proxy hardening.
  if (ip !== "unknown" && ip !== "invalid") {
    record({
      metric: "userListRequests",
      keyType: "ip",
      keyValue: ip,
      logKeyValue: () => getLogIP(ip),
      windowMs: USER_LIST_WINDOW_MS,
      threshold: USER_LIST_IP_THRESHOLD,
      details: { user, eventName },
    });
  }

  if (user !== "anonymous") {
    shouldThrottle =
      record({
        metric: "userListRequests",
        keyType: "user",
        keyValue: user,
        windowMs: USER_LIST_WINDOW_MS,
        threshold: USER_LIST_USER_THRESHOLD,
        blockMs: USER_LIST_THROTTLE_BLOCK_MS,
        details: () => ({ ip: getLogIP(ip), eventName }),
      }) || shouldThrottle;
  }

  return shouldThrottle;
};

module.exports.recordSocketDisconnect = (socket) => {
  const socketKey = getSocketKey(socket);
  if (socketKey) counters.delete(`userListRequests:socket:${socketKey}`);
};
