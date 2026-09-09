# Season 25 backtest: synthetic results

**MONGO_URL was absent. No corpus connection or read was attempted. No empirical player result was measured. Every result below is synthetic.** Recorded 2026-09-09 UTC, assignment s25-backtest-harness, attempt 1.

The read-only [harness](../scripts/ratingBacktest25.js) imports the production ranked engine, predictor, public ladder, bias and hidden-rating modules and applies their returned updates directly in memory. No rating math is recreated. No product parameter, threshold, eligibility, end-game or cutover code changed in this pass.

## Reproduction and assumptions

Run: rtk node scripts/ratingBacktest25.js. JSON goes to stdout; there is no write mode or output-file option. The --help option lists bounded sizing/date arguments. Recorded configuration:

~~~json
{
  "seed": 250925,
  "population": 240,
  "games": 12000,
  "trials": 32,
  "careerGames": 10000,
  "corpusLimit": 5000
}
~~~

Two consecutive native Node runs produced byte-identical output (about 1.7 seconds each). [Full results JSON](rating-backtest25-results.json) retains all distributions, denominators and six production-module SHA-256 fingerprints. Its SHA-256 is a4e31ea783d3055b7919f97203560c05eba006437218ab89670be897b86883fa.

The main population crosses true mu 10/20/30/40 with scheduling weights 1/2/4 (20 players per cell), starting hidden fresh and public 1500. Twelve configurations are sampled uniformly: base 5–10 players and rebalance flags. The 9p 2f flag changes the deck, not faction sizes, matching start-game.js. The legacy rebalance9p probe is included even though start-game currently leaves it false. This configuration mix does not model live traffic. Rainbow is sampled at 50%; its public/hidden path is identical and XP is not analyzed.

Outcomes are Bernoulli draws from the production predictor with fixed true skills and sigma zero (performance noise remains). This matches the estimator's assumed model and favors it. It omits collusion, changing meta, skill-gated lobby selection, departures, season boundaries and inactivity eligibility. Quantiles use floor((n−1)p) order statistics. Trials are exploratory samples, not live prevalence estimates; shared-game players and population pair comparisons are dependent.

## Public movement, trajectories and prediction

**SYNTHETIC — per-player delta distribution; 93717 updates**

| Magnitude | Win count | Loss count |
| --- | --- | --- |
| 16 | 23768 | 24014 |
| 17 | 3950 | 4040 |
| 18 | 3602 | 3681 |
| 19 | 3338 | 3316 |
| 20 | 3018 | 3051 |
| 21 | 2523 | 2443 |
| 22 | 2003 | 1977 |
| 23 | 1569 | 1582 |
| 24 | 2958 | 2884 |

Observed min/max: -24 / 24; mean -0.0363. Zero invariant violations: actual public helper matched every update, both public tracks agreed, bounds held and hidden outputs stayed finite/nonnegative. Unequal faction sizes mean total points across players need not sum to zero.

**SYNTHETIC — public score after each player's own game count**

| Games | N | Min | P10 | Median | P90 | Max |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | 240 | 1314 | 1399 | 1497 | 1605 | 1684 |
| 25 | 240 | 1212 | 1342 | 1505 | 1666 | 1773 |
| 50 | 240 | 1058 | 1202 | 1504 | 1781 | 1966 |
| 100 | 240 | 668 | 964 | 1507 | 2020 | 2365 |

**SYNTHETIC — final population distributions**

| Measure | N | Min | P10 | Median | P90 | Max | Mean |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Public score | 240 | -2350.00 | -407.00 | 1486.00 | 3264.00 | 5490.00 | 1485.83 |
| Games | 240 | 143.00 | 165.00 | 334.00 | 679.00 | 706.00 | 390.49 |
| Sigma | 240 | 1.26 | 1.31 | 1.85 | 2.61 | 2.86 | 1.92 |

Negative scores follow the unbounded accumulator. Public score correlates 0.870 with known true mu. Final centered hidden mean absolute error is 1.901 mu; centering removes the unidentifiable common location shift. Mean sigma at 10/25/50/100 games: 6.817 / 5.514 / 4.353 / 3.268.

Score at game 25 correlates 0.559 with win rate at games 26–50 across 240 players. The score uses no future outcomes. Model-matched pregame Brier score: 0.1488; this is not validation on real outcomes.

**SYNTHETIC — game-25 score versus subsequent outcomes**

| Quintile | Players | Mean score at 25 | WR at 26–50 |
| --- | --- | --- | --- |
| 1 | 48 | 1325.00 | 37.75% |
| 2 | 48 | 1416.27 | 45.00% |
| 3 | 48 | 1498.56 | 49.00% |
| 4 | 48 | 1581.63 | 57.33% |
| 5 | 48 | 1678.60 | 59.33% |

**SYNTHETIC — retrospective final-WR quartile trajectories**

| Group | Players | Final mean WR | Mean score 10 | 25 | 50 | 100 |
| --- | --- | --- | --- | --- | --- | --- |
| low | 60 | 34.49% | 1441.92 | 1372.13 | 1241.30 | 995.28 |
| high | 60 | 64.92% | 1555.23 | 1627.03 | 1739.62 | 1983.92 |

These quartiles use final WR among players reaching 100 games: descriptive retrospective selection, unlike the preceding subsequent-outcome comparison.

## Activity versus skill

**SYNTHETIC — population skill/activity groups**

| True mu | Weight | N | Mean games | Mean WR | Mean public |
| --- | --- | --- | --- | --- | --- |
| 10 | 1 | 20 | 174.15 | 34.58% | 620.75 |
| 10 | 2 | 20 | 331.95 | 35.12% | -37.65 |
| 10 | 4 | 20 | 664.75 | 34.40% | -1705.45 |
| 20 | 1 | 20 | 166.75 | 44.29% | 1193.55 |
| 20 | 2 | 20 | 333.80 | 45.11% | 983.35 |
| 20 | 4 | 20 | 669.20 | 44.95% | 463.95 |
| 30 | 1 | 20 | 176.85 | 53.78% | 1721.50 |
| 30 | 2 | 20 | 339.70 | 55.08% | 2034.10 |
| 30 | 4 | 20 | 663.00 | 55.20% | 2560.70 |
| 40 | 1 | 20 | 167.80 | 64.07% | 2275.25 |
| 40 | 2 | 20 | 337.70 | 65.25% | 3104.95 |
| 40 | 4 | 20 | 660.20 | 65.09% | 4614.95 |

Among lower-true-skill/higher-games pairs, 455/10770 (4.22%) reversed public rank. This depends on the available skill/activity pairs; it is not a controlled volume threshold.

The controlled comparison uses true mu 30 versus 35, hidden initially calibrated at sigma 2.5, public 1500, and separate rotating populations of 239 mu-25 peers. The higher-skilled player plays 100 games; 32 seeded trial pairs compare the lower player's increasing checkpoints. All peers receive actual hidden updates.

**SYNTHETIC — lower skill outranking higher skill by volume**

| Ratio | Low/high games | Reversals/trials | Rate | Low mean score | High mean score | Low mean WR | High mean WR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 100/100 | 6/32 | 18.75% | 1773.13 | 1983.63 | 60.69% | 69.34% |
| 1.25 | 125/100 | 10/32 | 31.25% | 1848.03 | 1983.63 | 60.83% | 69.34% |
| 1.5 | 150/100 | 13/32 | 40.63% | 1916.56 | 1983.63 | 60.83% | 69.34% |
| 2 | 200/100 | 20/32 | 62.50% | 2059.16 | 1983.63 | 60.92% | 69.34% |
| 3 | 300/100 | 28/32 | 87.50% | 2361.13 | 1983.63 | 61.17% | 69.34% |
| 5 | 500/100 | 32/32 | 100.00% | 2740.75 | 1983.63 | 60.22% | 69.34% |

**Activity can overwhelm skill.** First tested ratio with majority reversal: 2×. Equal-volume reversals already occur from outcome variance; 2× is not a universal onset or sharp threshold. Rates from 32 trials change in 3.125-point steps.

The separately prescribed exact 60% case (180 wins / 120 losses, shuffled) finishes at 2482, versus the fixed-20 reference 2700 (difference -218). Across the population, error against 1500 + 20 × (wins−losses) spans -1245…1150. That formula explains accumulation direction, not exact scores. The Controller's 2165 example was not replicated with this seed/setup; its precise population and seed were not supplied.

## Community failure modes

Each mode runs 32 trials of 100 games with neutral-prior 7p rebalanced lobbies and 239 rotating peers, initially true/hidden mu 25, sigma 2.5. The balanced-elite control moves all true/hidden means to 45. Each trial meets 174–192 distinct opposing players. Delta ranges below belong to the focal player; opponent losses exclude teammates.

**SYNTHETIC — focal-player outcomes**

| Scenario | Initial public | Mean WR | Win deltas | Loss deltas | Mean final public | Worst opponent loss |
| --- | --- | --- | --- | --- | --- | --- |
| Fresh elite alt | 1500 | 84.38% | +16…+21 | -24…-20 | 2522.69 | -21 |
| Settled elite vs average peers | 2200 | 84.38% | +16…+16 | -24…-24 | 3175.00 | -16 |
| Settled elite vs elite peers | 2200 | 50.44% | +18…+22 | -22…-19 | 2215.56 | -22 |
| Ordinary balanced | 1500 | 50.44% | +18…+22 | -22…-19 | 1515.56 | -22 |

**SYNTHETIC — fresh true-mu-45 alt learning from mu 25 / sigma 8.333**

| Games | Mean raw mu | P10 / P90 mu | Mean sigma | Mean centered abs error | Mean public |
| --- | --- | --- | --- | --- | --- |
| 10 | 34.33 | 30.14 / 36.75 | 6.086 | 10.67 | 1618.22 |
| 20 | 37.90 | 33.95 / 41.94 | 5.087 | 7.09 | 1728.47 |
| 25 | 38.51 | 35.43 / 40.79 | 4.745 | 6.49 | 1768.94 |
| 50 | 41.57 | 38.29 / 43.15 | 3.743 | 3.87 | 2020.03 |
| 100 | 43.90 | 41.13 / 45.74 | 2.864 | 2.06 | 2522.69 |

At 20 games mean mu was 37.90, not the Controller's single-run 43.8. At 100 it was 43.90, with centered mean absolute error 2.06. Initial learning is fast, but near-complete learning by 20 is not supported across this population. Worst opponent loss was −21, beyond the earlier example's −20 but within −24.

All 32 alts reached public 2000: earliest game 35, median 48, latest 63. First crossing required at least 33 wins (median 41). The 2000 checkpoint is an experiment definition, not a proposed threshold. There is no hidden-to-public promotion. For settled modes already above 2000, the JSON's first recorded above-2000 observation is game 1 and is not a climb measurement.

Settled elites against average peers get exactly +16/−24 because they are strongly favored. Balanced elites reproduce ordinary-lobby movement with public scores offset by 700; neither mode produces +2/−20. High public score alone does not suppress awards. Ordinary learned noise produces deltas near 20 rather than always exactly ±20.

## Lifetime uncertainty and changed skill

One independent career starts at true/hidden mu 25 and sigma 8.333, rotates through settled mu-25 peers, plays 10,000 fixed-skill games, then jumps to true mu 45 for 1,000 more games. Production tau stays zero. These counts stress a long career; actual career-count prevalence was not measured.

**SYNTHETIC — stable career, tau = 0**

| Games | Sigma | Raw mu | Aligned mu | Absolute error |
| --- | --- | --- | --- | --- |
| 100 | 2.585744 | 21.628 | 21.615 | 3.385 |
| 300 | 1.501929 | 21.902 | 21.890 | 3.110 |
| 1000 | 0.836261 | 24.102 | 24.123 | 0.877 |
| 3000 | 0.481599 | 24.725 | 24.759 | 0.241 |
| 10000 | 0.262183 | 24.845 | 24.891 | 0.109 |

**SYNTHETIC — adaptation after true mu 25 → 45**

| New-skill games | Sigma | Aligned mu | Absolute error |
| --- | --- | --- | --- |
| 10 | 0.262036 | 24.905 | 20.095 |
| 100 | 0.260813 | 25.043 | 19.957 |
| 300 | 0.258208 | 25.382 | 19.618 |
| 1000 | 0.249891 | 26.650 | 18.350 |

Sigma first drops below 1 at game 702. It never becomes zero/nonfinite: this is practical overconfidence, not numerical collapse. After 1,000 new-skill games (828 wins), aligned mu is only 26.650 against true 45. A separate fresh-start comparator reaches 43.133 after 1,000 games; its different seed/population prevents a paired causal interpretation of any parameter change.

The Controller's sigma 2.935/1.766 at 100/300 games is not exactly replicated; this career produces 2.586/1.502. Both show contraction, extended here to slow adaptation. **Any assumption that this unchanged lifetime estimator remains responsive to major skill drift is contradicted by this synthetic stress test.** No recovery parameter was tuned.

## Faction and player-count effects

**SYNTHETIC — realized population faction effects; player appearances**

| Count/faction | Appearances | WR | Mean delta |
| --- | --- | --- | --- |
| 5p-fascist | 2074 | 49.66% | -0.202 |
| 5p-liberal | 3111 | 50.34% | 0.202 |
| 6p-fascist | 4048 | 47.97% | -0.670 |
| 6p-liberal | 8096 | 52.03% | 0.670 |
| 7p-fascist | 6135 | 49.83% | -0.114 |
| 7p-liberal | 8180 | 50.17% | 0.114 |
| 8p-fascist | 2958 | 50.51% | 0.269 |
| 8p-liberal | 4930 | 49.49% | -0.269 |
| 9p-fascist | 19580 | 53.09% | 0.900 |
| 9p-liberal | 24475 | 46.91% | -0.900 |
| 10p-fascist | 4052 | 52.81% | 0.801 |
| 10p-liberal | 6078 | 47.19% | -0.801 |

**SYNTHETIC — equal-skill probes using the production predictor**

| Configuration | F prior / prediction | F win/loss | L win/loss |
| --- | --- | --- | --- |
| 5p | 0.518 / 0.518 | 20 / -20 | 20 / -20 |
| 6p | 0.455 / 0.455 | 21 / -19 | 19 / -21 |
| 7p | 0.525 / 0.525 | 20 / -20 | 20 / -20 |
| 8p | 0.478 / 0.478 | 20 / -20 | 20 / -20 |
| 9p | 0.604 / 0.604 | 18 / -22 | 22 / -18 |
| 10p | 0.543 / 0.543 | 19 / -21 | 21 / -19 |
| 6p-rebalanced | 0.500 / 0.500 | 20 / -20 | 20 / -20 |
| 7p-rebalanced | 0.500 / 0.500 | 20 / -20 | 20 / -20 |
| 9p-rebalanced | 0.500 / 0.500 | 20 / -20 | 20 / -20 |
| 9p-rerebalanced | 0.500 / 0.500 | 20 / -20 | 20 / -20 |
| 9p-2f-deck | 0.550 / 0.550 | 19 / -21 | 21 / -19 |
| 9p-2f-deck-rerebalanced | 0.550 / 0.550 | 19 / -21 | 21 / -19 |

Uniform variant frequency and uneven faction sizes affect realized appearance-weighted means; these are not current community balance estimates. Probes demonstrate configured prior/precedence behavior, not that priors match current play. Historical calibration comments in bias.js are not newly verified corpus evidence.

## Corpus mode and limits

When MONGO_URL is provided, the CLI first uses the native Mongo driver to read gamesummaries and closes it. Reads project only required fields, sort by date then _id, and are bounded by --corpus-limit (default 5000), a 60-second server-operation timeout and 15-second connection-selection timeout. --from YYYY-MM-DD is inclusive; --to is exclusive. Without a date window it reads the earliest bounded date-typed records, not a representative recent sample. A large sort may require an existing suitable index. Failure is reported with nonzero exit, never relabeled as a successful measurement.

Supported completed ranked summaries use the existing enhanced-summary winner decoder, including Flappy. Casual/practice/unlisted/custom/Avalon/monarchist, malformed and unconfirmed outcomes are excluded and counted. Identities start counterfactually at public 1500/hidden fresh. hashUid is preferred; username fallback or missing hashes/renames may split identities. Output contains no identities or raw records. GameSummary has no season field: choose dates deliberately. Missing historical Rainbow flags do not alter the analyzed public/hidden path.

Successful corpus output is labeled MEASURED-FROM-CORPUS counterfactual S25 replay, never historical live ratings or evidence of S24 deployment. Known true skill and true activity/skill reversals cannot be inferred from outcomes alone. Insufficient samples yield zero denominators/null statistics. Native-driver boundaries and a real repository summary fixture were tested without a server. No live corpus replay was validated here.

## Recommended owner review and post-launch tunables

- **Accumulation and activity policy:** 2× majority reversal and 5× 32/32 show public score measures accumulated performance alongside skill. Monitor scores by games played and subsequent WR before choosing rating-based thresholds. PUBLIC_DELTA_CENTER and season duration alter score spread; changing the center alone cannot eliminate volume bias in a net-win accumulator. A cap, alternative rank rule or decay is an owner product decision, not a hidden implementation fix.
- **Lifetime uncertainty refresh:** prioritize an owner-reviewed experiment with process noise (tau), a sigma floor or time-based uncertainty refresh. Sigma 0.262 at 10,000 and post-shift error 18.35 justify investigating responsiveness. No numeric replacement is supported here; predictor and updater must remain consistent if uncertainty handling changes.
- **Placement confidence:** retain authorized 10-game provisional / 20-game board eligibility values in this pass. Monitor alt error and prediction calibration at 10/20/50/100. Mean alt mu 37.9 at 20 shows the provisional marker is not proof of fully learned skill.
- **Bounds and priors:** all +16…+24 / −24…−16 checks passed, so these results do not support expanding the bound. Re-estimate priors and check calibration by player count/rebalance against a recent corpus before changing them. A synthetic world using those same priors cannot independently endorse them.

## Validation

Two full default outputs matched exactly; the JSON hash is above. Tests cover production-engine delegation, seed reproduction, balanced-elite score invariance, the 9p deck roster, summary decoding/exclusions, cursor cleanup, absent/failed corpus handling and CLI rejection of write/invalid options. No database write or gameplay session ran. Final repository check outcomes are recorded in the [consolidated plan's validation section](season-25-plan.md#11-validation-backtest-and-limits).
