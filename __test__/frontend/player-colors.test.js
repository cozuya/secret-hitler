import { PLAYERCOLORS as frontendColors } from "../../src/frontend-scripts/constants";
import { PLAYERCOLORS as serverColors } from "../../src/frontend-scripts/node-constants";

describe.each([
  ["frontend", frontendColors],
  ["server", serverColors],
])("%s player colors", (name, colors) => {
  const graduate = { isRainbowOverall: true, isRainbowSeason: true };

  it.each([
    undefined,
    null,
    NaN,
    Infinity,
    -Infinity,
  ])("uses the 1500 color for an absent/invalid rating (%p)", (rating) => {
    const user = { ...graduate, eloOverall: rating, eloSeason: rating };
    expect(colors(user, false, "player")).toBe("player elo0");
    expect(colors(user, true, "player")).toBe("player elo0");
  });

  it.each([
    [0, "elo0"],
    [-50, "elo0"],
    [1600, "elo20"],
    [2500, "elo120"],
  ])("retains the color for a finite rating of %i", (rating, color) => {
    const user = { ...graduate, eloOverall: rating, eloSeason: rating };
    expect(colors(user, false, "player")).toBe(`player ${color}`);
    expect(colors(user, true, "player")).toBe(`player ${color}`);
  });

  it("uses the selected rating track and leaves grey/staff/hidden-Elo colors unchanged", () => {
    const user = { ...graduate, eloOverall: 1600 };
    expect(colors(user, false, "player")).toBe("player elo20");
    expect(colors(user, true, "player")).toBe("player elo0");
    expect(colors({}, false, "player")).toBe("player");
    expect(colors({ staffRole: "admin" }, false, "player")).toBe("player admin");
    expect(colors(graduate, false, "player", true)).toBe("player");
  });
});
