// OpenSkill rating engine for ranked Secret Hitler.
//
// Replaces the legacy team-averaged Elo (`rateEloGame`). Each player carries a per-track
// (mu, sigma); team strength is a combination of member skills (not a mean), team sizes are
// asymmetric, and uncertainty (sigma) gives a self-tuning update size that shrinks as a player
// settles — fixing the three defects of the old model (own rating never entered the update, no
// uncertainty, fixed K).
//
// This module is PURE: it reads account ratings and returns the deltas/new values to apply. It
// does NOT touch the database — the caller (end-game.js) applies and persists once. That is the
// whole reason this is finally testable, and it removes the old mid-loop / double-save.

const { rate } = require("openskill");
const { biasMuPerFascist } = require("./bias.js");
const { DEFAULT_SIGMA, displayRating, seedMuFromLegacy, freshRating } = require("./display.js");

// Rainbow games historically moved ratings ~2.25x faster (legacy k was size*9 vs size*4). We
// preserve that as a product behavior by scaling the mu delta only — sigma (uncertainty) still
// shrinks at the normal per-game rate, so faster progression doesn't fake confidence.
const RAINBOW_MU_MULT = 9 / 4;

// Ranked XP is otherwise decoupled from rating movement (OpenSkill deltas have no Elo scale, and
// early sigma-driven swings would distort XP): a flat award per result. Rainbow wins are the one
// exception — scaled by RAINBOW_MU_MULT (below) to preserve the historical ~2.25x rainbow XP pacing.
const WIN_XP = 2;
const LOSS_XP = 1;

// XP award for one player's result. Rainbow scales the WIN award only (legacy losses were always a
// flat 1, regardless of rainbow). Rounded so cumulative XP stays integer (a rainbow win is 5, not
// 4.5, which kept the ~2.25x pacing but rendered .5 in profile/leaderboard exports). Shared by the
// engine (replay deltas) and end-game's apply step.
const xpAward = (won, rainbow) => (won ? Math.round(WIN_XP * (rainbow ? RAINBOW_MU_MULT : 1)) : LOSS_XP);

// An account is "migrated" once the Season-24 cutover has stamped this on it (see
// scripts/seasonCutover24.js — must match its RATING_VERSION). Used to decide whether a missing
// season rating means "cold-started by the migration" or "a game ran before the migration reached
// this account" (in which case we must NOT cold-reset their live season standing).
// TODO(next cutover): this 24 is duplicated across RATING_VERSION (seasonCutover24.js),
// CURRENTSEASONNUMBER (node-constants.js), and the winsSeason24 schema fields, coupled only by
// comments. Consolidate into one shared cutover-version constant so an S25 bump can't miss a site.
const SEASON_MIGRATED_VERSION = 24;

const getRating = (account, track) => {
  const r = account.rating && account.rating[track];
  // Require finite values, not just typeof "number": NaN is a number, and OpenSkill sums team mu,
  // so a single NaN would poison every player's update and make Mongoose reject the whole save.
  if (r && Number.isFinite(r.mu) && Number.isFinite(r.sigma)) {
    return { mu: r.mu, sigma: r.sigma };
  }
  // No usable rating for this track yet. Overall is continuous across seasons, so always soft-reset
  // it from the legacy Elo mirror (high sigma re-settles) — a 2400 player isn't treated as fresh.
  if (track === "overall") {
    return { mu: seedMuFromLegacy(account.eloOverall), sigma: DEFAULT_SIGMA };
  }
  // SEASON track. Behaviour depends on whether the Season-24 migration has reached this account:
  //  - NOT migrated (ratingVersion < 24): a ranked game is running before the cutover seeded this
  //    account. Preserve the live season standing from the eloSeason mirror — DO NOT cold-reset it.
  //    This turns the deploy-ordering requirement (engine must ship atomically with the migration)
  //    into a code invariant, so a window slip can't wipe seasonal standings one game at a time.
  //  - migrated: the migration already cold-started rating.season, so a missing one means cold.
  if (!(account.ratingVersion >= SEASON_MIGRATED_VERSION)) {
    return { mu: seedMuFromLegacy(account.eloSeason), sigma: DEFAULT_SIGMA };
  }
  return freshRating();
};

// computeRatingUpdates(game, accounts, winningPlayerNames, seatedUsernames)
// `seatedUsernames` is the full seated roster (so absent accounts don't shrink the OpenSkill teams);
// it defaults to the resolved accounts when omitted.
// -> map username -> {
//      change, changeSeason,            // display-rating deltas (overall, season) for replay chats
//      xpChange, xpChangeSeason,        // fixed XP awards
//      overall: { mu, sigma, display }, // new authoritative values
//      season:  { mu, sigma, display },
//    }
const computeRatingUpdates = (game, accounts, winningPlayerNames, seatedUsernames) => {
  const winners = new Set(winningPlayerNames);
  // The winning faction is exactly winningPlayerNames; isCompleted names which side won, so the
  // fascist team is the winners iff fascists won. (Bias is keyed to faction, not win/loss.)
  const fascistWon = game.gameState.isCompleted === "fascist";

  // Resolve each real account's current per-track rating exactly once, then read everything else
  // through `ratingFor` (map lookup, no recompute). Missing players resolve to a fresh placeholder.
  const current = new Map();
  for (const a of accounts) {
    current.set(a.username, { overall: getRating(a, "overall"), season: getRating(a, "season") });
  }
  const ratingFor = (name, track) => current.get(name)?.[track] ?? freshRating();
  const isReal = (name) => current.has(name);

  // Full roster keeps team sizes correct even when an account didn't resolve (deleted/renamed mid
  // game). Faction = win/loss combined with which side won.
  const roster = seatedUsernames && seatedUsernames.length ? seatedUsernames : accounts.map((a) => a.username);
  // A name is on the fascist team iff "won" matches "fascists won"; liberals are the complement.
  const fascistNames = roster.filter((n) => winners.has(n) === fascistWon);
  const liberalNames = roster.filter((n) => winners.has(n) !== fascistWon);

  // Per-fascist mu boost, calibrated against the full fascist count (in bias.js) so the team's total
  // offset matches the calibrated win-prior regardless of how many fascists have accounts.
  const offsetPerFascist = biasMuPerFascist(game);
  const rainbow = Boolean(game.general.rainbowgame);

  // Rate one track. Closure over the rosters/offset/rainbow above; teams use the full roster
  // (placeholders for absent accounts) so OpenSkill sees correct sizes, and only real accounts are
  // emitted. rank 1 = winner (lower is better); [fascist, liberal] order matches the offset.
  const rateTrack = (track) => {
    const fasInput = fascistNames.map((n) => {
      const { mu, sigma } = ratingFor(n, track);
      return { mu: mu + offsetPerFascist, sigma };
    });
    const libInput = liberalNames.map((n) => ratingFor(n, track));
    const [fasOut, libOut] = rate([fasInput, libInput], { rank: fascistWon ? [1, 2] : [2, 1] });

    const out = {};
    const collect = (names, input, output) => {
      names.forEach((n, i) => {
        if (!isReal(n)) return; // placeholder for a missing player — fills the team, persists nothing
        const muDelta = (output[i].mu - input[i].mu) * (rainbow ? RAINBOW_MU_MULT : 1);
        const mu = ratingFor(n, track).mu + muDelta;
        const sigma = output[i].sigma; // unaffected by the constant offset; not rainbow-scaled
        out[n] = { mu, sigma, display: displayRating(mu) };
      });
    };
    collect(fascistNames, fasInput, fasOut);
    collect(liberalNames, libInput, libOut);
    return out;
  };

  const overall = rateTrack("overall");
  const season = rateTrack("season");

  const updates = {};
  for (const account of accounts) {
    const u = account.username;
    const o = overall[u];
    const s = season[u];
    if (!o || !s) continue; // account wasn't on the roster (shouldn't happen) — nothing to apply
    const cur = current.get(u);
    const won = winners.has(u);
    updates[u] = {
      // change/changeSeason are whole-point display deltas. A settled (low-sigma) player's small mu
      // nudge can round to 0 — shown as "+0.0" with a flat pastElo point. Intentional: they've
      // converged, it isn't a dropped update.
      change: o.display - displayRating(cur.overall.mu),
      changeSeason: s.display - displayRating(cur.season.mu),
      // XP is decoupled from rating, so the season and overall awards are identical here. Kept as
      // two fields to match the season/overall split used everywhere else (and the replay's
      // parenthetical) — not a copy-paste bug.
      xpChange: xpAward(won, rainbow),
      xpChangeSeason: xpAward(won, rainbow),
      overall: o,
      season: s,
    };
  }
  return updates;
};

module.exports = {
  RAINBOW_MU_MULT,
  xpAward,
  computeRatingUpdates,
  SEASON_MIGRATED_VERSION,
};
