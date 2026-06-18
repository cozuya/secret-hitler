const { z } = require("zod");
const { LEGALCHARACTERS } = require("../../../src/frontend-scripts/node-constants");

// ---- shared coercion helpers -------------------------------------------------

// number, or non-empty numeric string -> number; everything else passes through
// unchanged so the following validator can reject it (objects, NaN, booleans).
const coerceNumeric = (v) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : v);

const intCoerce = z.preprocess(coerceNumeric, z.number().int());

// player counts may be absent or null (handler defaults + clamps them); when
// present they must coerce to an integer. Mirrors the old toInt/Number.isInteger guards.
const optionalNullableInt = z.preprocess(coerceNumeric, z.union([z.number().int(), z.null(), z.undefined()]));

// rejects only objects (incl. arrays/null), matching `typeof x === 'object'` guards.
const notObject = z.any().refine((v) => typeof v !== "object", { message: "must not be an object" });

// ---- custom game settings (validated only when enabled) ----------------------

const VALID_POWERS = ["investigate", "deckpeek", "election", "bullet", "reverseinv", "peekdrop"];

// '', 'null', null and undefined all mean "no power"; otherwise must be a known power.
const powerSchema = z.preprocess(
  (v) => (v == null || v === "" || v === "null" ? null : v),
  z.enum(VALID_POWERS).nullable()
);

const customGameSettingsSchema = z
  .object({
    enabled: z.literal(true),
    // legacy 'fax' typo: fall back to it for 'fas' when fas is absent
    deckState: z.preprocess(
      (d) => (d && typeof d === "object" && d.fax != null && d.fas == null ? { ...d, fas: d.fax } : d),
      z
        .object({
          lib: intCoerce.refine((n) => n >= 5 && n <= 8),
          fas: intCoerce.refine((n) => n >= 5 && n <= 19),
        })
        .passthrough()
    ),
    trackState: z
      .object({
        lib: intCoerce.refine((n) => n >= 0 && n <= 4),
        fas: intCoerce.refine((n) => n >= 0 && n <= 5),
      })
      .passthrough(),
    fascistCount: intCoerce.refine((n) => n >= 1), // fascistCount-vs-playerCount is checked in the handler
    hitlerZone: intCoerce.refine((n) => n >= 1 && n <= 5),
    vetoZone: intCoerce.refine((n) => n >= 1 && n <= 5),
    powers: z.array(powerSchema).length(5),
  })
  .passthrough()
  .refine((s) => s.vetoZone > s.trackState.fas, { message: "vetoZone must exceed trackState.fas" })
  .refine((s) => s.deckState.lib + s.deckState.fas >= 13, { message: "deck needs at least 13 cards" });

// ---- top-level create-game payload ------------------------------------------
// Only fields that previously had inline type/shape guards are typed here; all
// other flags flow through via .passthrough() and are consumed as-is downstream.

const createGameSchema = z
  .object({
    minPlayersCount: optionalNullableInt,
    maxPlayersCount: optionalNullableInt,
    // singular — the client (Creategame.jsx / App.jsx) emits `excludedPlayerCount`; there is no
    // plural `excludedPlayerCounts` (that mismatch was the regression fixed in create-game.js).
    excludedPlayerCount: z.array(z.any()).optional(),
    gameName: z
      .string()
      .min(1)
      .max(20)
      .refine((name) => LEGALCHARACTERS(name), { message: "illegal characters in game name" }),
    // Client sends null by default (XP limit off), a number from the slider, or a string from the
    // typed XP box; the handler parseInts it. Accept all three so a normal create-game isn't rejected.
    xpSliderValue: z.union([z.string(), z.number()]).nullable().optional(),
    noTopdecking: notObject.optional(),
    // Client sends the password string for private games, or the literal `false` sentinel for
    // public/unlisted games (Creategame.jsx / App.jsx). Both must pass; the handler treats
    // `false` as "not private" in boolean/sentinel contexts downstream.
    privatePassword: z.union([z.string(), z.literal(false)]).optional(),
    // presence/enabled handled here; the strict shape is validated by
    // customGameSettingsSchema in the handler (it needs playerCounts context).
    customGameSettings: z.object({}).passthrough().optional(),
  })
  .passthrough();

const updateWhitelistSchema = z
  .object({
    uid: z.string(),
    password: z.string().optional(),
    whitelistPlayers: z.array(z.string()),
  })
  .passthrough();

module.exports = { createGameSchema, customGameSettingsSchema, updateWhitelistSchema, VALID_POWERS };
