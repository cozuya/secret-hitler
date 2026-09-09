import React from "react";
import { shallow } from "enzyme";
import Leaderboard from "./Leaderboards";

const boards = () => ({
  seasonalLeaderboardElo: [],
  seasonalLeaderboardXP: [],
  dailyLeaderboardElo: [],
  dailyLeaderboardXP: [],
  rainbowLeaderboard: [],
});
const originalFetch = global.fetch;
let wrapper;
beforeEach(() => {
  global.fetch = jest.fn();
  wrapper = shallow(<Leaderboard />, { disableLifecycleMethods: true });
  jest.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  wrapper.unmount();
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});
const respond = (data) => global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });

it("shows loading instead of claiming there is no data before the response arrives", () => {
  expect(wrapper.text()).toContain("Loading leaderboards");
  expect(wrapper.text()).not.toContain("No leaderboard results");
});

it("shows XP boards even when nobody has qualified for seasonal Elo", async () => {
  respond({ ...boards(), seasonalLeaderboardXP: [{ userName: "Player1", xp: 30 }] });
  await wrapper.instance().loadLeaderboard();
  expect(wrapper.find("a[href='#/profile/Player1']")).toHaveLength(1);
  expect(wrapper.text()).toContain("Seasonal XP leaders");
  expect(wrapper.text()).not.toContain("No leaderboard results");
});

it("distinguishes a cron that has not published from a failed database read", async () => {
  respond({ ...boards(), status: "pending", updatedAt: null });
  await wrapper.instance().loadLeaderboard();
  expect(wrapper.text()).toContain("Standings have not been published yet");
  expect(wrapper.find("[role='alert']")).toHaveLength(0);
  respond({ ...boards(), status: "unavailable", updatedAt: null });
  await wrapper.instance().loadLeaderboard();
  expect(wrapper.find("[role='alert']").text()).toContain("temporarily unavailable");
});

it("reports HTTP errors and allows a retry", async () => {
  global.fetch.mockResolvedValue({ ok: false, status: 503 });
  await wrapper.instance().loadLeaderboard();
  expect(wrapper.find("[role='alert']")).toHaveLength(1);
  respond({ ...boards(), status: "ready", seasonalLeaderboardElo: [{ userName: "Player1", elo: 1600 }] });
  await wrapper.find("button").prop("onClick")();
  expect(wrapper.find("[role='alert']")).toHaveLength(0);
  expect(wrapper.text()).toContain("1600");
});

it("shows the last successful refresh and flags old standings", async () => {
  respond({ ...boards(), status: "ready", updatedAt: "2020-01-01T09:00:00.000Z" });
  await wrapper.instance().loadLeaderboard();
  expect(wrapper.find("time").prop("dateTime")).toBe("2020-01-01T09:00:00.000Z");
  expect(wrapper.text()).toContain("waiting for a fresh update");
});
