"use strict";

const DEFAULT_INTERVAL_MS = 60 * 1000;
const DEFAULT_TOP_COUNT = 20;

const diagnosticsState = require("../bandwidth-diagnostics-state");

const intervalMs = Number.parseInt(process.env.BANDWIDTH_DIAGNOSTICS_INTERVAL_MS || "", 10) || DEFAULT_INTERVAL_MS;
const topCount = Number.parseInt(process.env.BANDWIDTH_DIAGNOSTICS_TOP_COUNT || "", 10) || DEFAULT_TOP_COUNT;
const localSocketEvents = new Set(["disconnect", "disconnecting", "error", "newListener", "removeListener"]);
const activeSockets = new Set();
const socketOriginalEmits = new WeakMap();
let originalNamespaceEmit = null;
const eventStats = new Map();
const transportStats = {
  connections: {},
  activeAtEnable: {},
  upgrades: {},
  disconnects: {},
};

const resetStats = () => {
  eventStats.clear();
  transportStats.connections = {};
  transportStats.activeAtEnable = {};
  transportStats.upgrades = {};
  transportStats.disconnects = {};
};

const increment = (obj, key, amount = 1) => {
  obj[key] = (obj[key] || 0) + amount;
};

const getTransportName = (socket) =>
  socket && socket.conn && socket.conn.transport ? socket.conn.transport.name : "unknown";

const estimatePacketBytes = (eventName, args) => {
  try {
    return Buffer.byteLength(JSON.stringify([eventName, ...args]));
  } catch (e) {
    return 0;
  }
};

const recordEvent = (transport, eventName, estimatedBytes, count) => {
  const key = `${transport} ${eventName}`;
  const current = eventStats.get(key) || {
    count: 0,
    estimatedBytes: 0,
    maxEstimatedBytes: 0,
  };

  current.count += count;
  current.estimatedBytes += estimatedBytes * count;
  current.maxEstimatedBytes = Math.max(current.maxEstimatedBytes, estimatedBytes);
  eventStats.set(key, current);
};

const getNamespaceSocket = (namespace, socketId) =>
  (namespace.connected && namespace.connected[socketId]) || (namespace.sockets && namespace.sockets[socketId]);

const getBroadcastSocketIds = (namespace) => {
  const rooms = Array.isArray(namespace.rooms) ? namespace.rooms : [];
  if (!rooms.length) {
    return Object.keys(namespace.connected || namespace.sockets || {});
  }

  const socketIds = new Set();
  rooms.forEach((room) => {
    const adapterRoom = namespace.adapter && namespace.adapter.rooms && namespace.adapter.rooms[room];
    if (!adapterRoom || !adapterRoom.sockets) return;
    Object.keys(adapterRoom.sockets).forEach((socketId) => socketIds.add(socketId));
  });

  return [...socketIds];
};

const recordBroadcast = (namespace, eventName, args) => {
  if (localSocketEvents.has(eventName)) return;

  const estimatedBytes = estimatePacketBytes(eventName, args);
  const transportCounts = {};

  getBroadcastSocketIds(namespace).forEach((socketId) => {
    increment(transportCounts, getTransportName(getNamespaceSocket(namespace, socketId)));
  });

  Object.keys(transportCounts).forEach((transport) => {
    recordEvent(transport, `broadcast ${eventName}`, estimatedBytes, transportCounts[transport]);
  });
};

const patchSocket = (socket) => {
  if (socketOriginalEmits.has(socket)) return;

  const emit = socket.emit;
  socketOriginalEmits.set(socket, emit);
  socket.emit = function instrumentedEmit(eventName, ...args) {
    if (typeof eventName === "string" && !localSocketEvents.has(eventName)) {
      recordEvent(getTransportName(socket), eventName, estimatePacketBytes(eventName, args), 1);
    }

    return emit.apply(this, arguments);
  };
};

const unpatchSocket = (socket) => {
  const emit = socketOriginalEmits.get(socket);
  if (!emit) return;
  socket.emit = emit;
  socketOriginalEmits.delete(socket);
};

const patchNamespace = () => {
  if (originalNamespaceEmit || !global.io || !io.sockets) return;

  originalNamespaceEmit = io.sockets.emit;
  io.sockets.emit = function instrumentedNamespaceEmit(eventName, ...args) {
    if (typeof eventName === "string") {
      recordBroadcast(this, eventName, args);
    }

    return originalNamespaceEmit.apply(this, arguments);
  };
};

const unpatchNamespace = () => {
  if (!originalNamespaceEmit || !global.io || !io.sockets) return;
  io.sockets.emit = originalNamespaceEmit;
  originalNamespaceEmit = null;
};

const enable = () => {
  resetStats();
  activeSockets.forEach((socket) => {
    increment(transportStats.activeAtEnable, getTransportName(socket));
    patchSocket(socket);
  });
  patchNamespace();
};

const disable = () => {
  activeSockets.forEach(unpatchSocket);
  unpatchNamespace();
  resetStats();
};

diagnosticsState.onChange((enabled) => {
  if (enabled) enable();
  else disable();
});

const timer = setInterval(() => {
  if (!diagnosticsState.isEnabled()) {
    resetStats();
    return;
  }

  const top = [...eventStats.entries()]
    .map(([key, value]) => ({
      key,
      count: value.count,
      estimatedBytes: value.estimatedBytes,
      avgEstimatedBytes: Math.round(value.estimatedBytes / value.count),
      maxEstimatedBytes: value.maxEstimatedBytes,
    }))
    .sort((a, b) => b.estimatedBytes - a.estimatedBytes)
    .slice(0, topCount);
  const hasTransportStats =
    Object.keys(transportStats.connections).length ||
    Object.keys(transportStats.activeAtEnable).length ||
    Object.keys(transportStats.upgrades).length ||
    Object.keys(transportStats.disconnects).length;

  if (top.length || hasTransportStats) {
    console.log(
      "Socket bandwidth diagnostics:",
      JSON.stringify({
        windowMs: intervalMs,
        transports: transportStats,
        top,
      })
    );
  }

  resetStats();
}, intervalMs);
// Real Node timers should not keep the process alive; some test timer shims omit unref().
if (timer.unref) timer.unref();

module.exports.instrumentSocket = (socket) => {
  activeSockets.add(socket);

  if (diagnosticsState.isEnabled()) {
    increment(transportStats.connections, getTransportName(socket));
    patchSocket(socket);
  }

  if (socket.conn) {
    const initialTransport = getTransportName(socket);
    socket.conn.on("upgrade", (transport) => {
      if (diagnosticsState.isEnabled()) {
        increment(transportStats.upgrades, `${initialTransport}->${transport.name || "unknown"}`);
      }
    });
  }

  socket.on("disconnect", () => {
    if (diagnosticsState.isEnabled()) {
      increment(transportStats.disconnects, getTransportName(socket));
    }

    activeSockets.delete(socket);
    unpatchSocket(socket);
  });
};
