"use strict";

const DEFAULT_DURATION_MS = 10 * 60 * 1000;
const MAX_DURATION_MS = 30 * 60 * 1000;

let enabled = false;
let enabledUntil = 0;
let enabledBy = "";
const listeners = new Set();

const clampDuration = (durationMs) => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return DEFAULT_DURATION_MS;
  return Math.min(durationMs, MAX_DURATION_MS);
};

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener(enabled);
    } catch (err) {
      console.error("Bandwidth diagnostics listener failed:", err);
    }
  });
};

const setEnabled = (nextEnabled) => {
  if (enabled === nextEnabled) return;
  enabled = nextEnabled;
  notifyListeners();
};

const expireIfNeeded = () => {
  if (enabled && enabledUntil && Date.now() > enabledUntil) {
    enabledUntil = 0;
    enabledBy = "";
    setEnabled(false);
    console.log("Bandwidth diagnostics disabled: expired");
  }
};

module.exports.isEnabled = () => {
  expireIfNeeded();
  return enabled;
};

module.exports.enable = ({ durationMs, userName }) => {
  const duration = clampDuration(durationMs);

  enabledUntil = Date.now() + duration;
  enabledBy = userName || "";
  setEnabled(true);

  console.log(
    "Bandwidth diagnostics enabled:",
    JSON.stringify({
      durationMs: duration,
      enabledBy,
      enabledUntil,
    })
  );

  return module.exports.status();
};

module.exports.disable = ({ userName } = {}) => {
  enabledUntil = 0;
  enabledBy = "";
  setEnabled(false);

  console.log(
    "Bandwidth diagnostics disabled:",
    JSON.stringify({
      disabledBy: userName || "",
    })
  );

  return module.exports.status();
};

module.exports.status = () => {
  expireIfNeeded();

  return {
    enabled,
    enabledBy,
    enabledUntil: enabled ? enabledUntil : 0,
    remainingMs: enabled ? Math.max(0, enabledUntil - Date.now()) : 0,
  };
};

module.exports.onChange = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
