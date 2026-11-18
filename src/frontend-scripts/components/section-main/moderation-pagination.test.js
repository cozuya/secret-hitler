import React from "react";
import { shallow } from "enzyme";
import Moderation from "./Moderation";

let socket, wrapper;
beforeEach(() => {
  jest.useFakeTimers();
  socket = { on: jest.fn(), off: jest.fn(), emit: jest.fn() };
  wrapper = shallow(<Moderation socket={socket} />, { disableLifecycleMethods: true });
  wrapper.setState({ modLogLoading: false });
});
afterEach(() => {
  wrapper.unmount();
  jest.clearAllTimers();
  jest.useRealTimers();
});

const latestAck = () => socket.emit.mock.calls.at(-1)[2];
const respond = (actions) => latestAck()({ success: true, actions, hasMore: true, nextCursor: "c".repeat(24) });
const respondToRefresh = (info = {}, ack = latestAck()) =>
  ack({
    success: true,
    info: {
      userList: [],
      gameList: [],
      modReports: [],
      accountCreationDisabled: { status: false },
      ipbansNotEnforced: { status: false },
      gameCreationDisabled: { status: false },
      limitNewPlayers: { status: false },
      bypassVPNCheck: { status: false },
      ...info,
    },
  });

it("refreshes the full snapshot and serializes refreshes with paging", () => {
  wrapper.setState({ modLogPage: 1, modLogCursors: [null, "a".repeat(24)] });
  wrapper.find(".refreshModlog").simulate("click");
  wrapper.instance().requestModLog("a".repeat(24), 1);
  expect(socket.emit.mock.calls).toEqual([["getModInfo", 1, expect.any(Function)]]);
  expect(wrapper.state("modLogLoading")).toBe(true);

  const userList = [{ userName: "Player", ip: "-1.2.3.4", email: "+example.com" }];
  const gameList = [{ uid: "game" }];
  const modReports = [{ _id: "latest", actionTaken: "warn", modUserName: "Mod" }];
  respondToRefresh({ userList, gameList, modReports });
  expect(wrapper.state()).toMatchObject({ userList, gameList, log: modReports, modLogPage: 0, modLogLoading: false });

  wrapper.instance().requestModLog("a".repeat(24), 1);
  wrapper.find(".refreshModlog").simulate("click");
  expect(socket.emit).toHaveBeenCalledTimes(2);
  respond([{ _id: "older" }]);
  expect(wrapper.state()).toMatchObject({ modLogPage: 1, log: [{ _id: "older" }] });
});

it("ignores a late refresh after its timeout while a newer page request is pending", () => {
  wrapper.find(".refreshModlog").simulate("click");
  const refreshAck = latestAck();
  jest.advanceTimersByTime(10000);
  expect(wrapper.state("modLogError")).toMatch(/timed out/);

  wrapper.instance().requestModLog("a".repeat(24), 1);
  respondToRefresh({ modReports: [{ _id: "stale" }] }, refreshAck);
  expect(wrapper.state("modLogLoading")).toBe(true);
  respond([{ _id: "older" }]);
  expect(wrapper.state()).toMatchObject({ modLogPage: 1, log: [{ _id: "older" }], modLogError: "" });
});

it("keeps recent ban and timeout highlights while browsing older pages", () => {
  const userList = [
    { userName: "BannedIP", ip: "-1.2.3.4", email: "+example.com" },
    { userName: "TimedPlayer", ip: "-5.6.7.8", email: "+example.com" },
    { userName: "OtherPlayer", ip: "-9.10.11.12", email: "+example.com" },
  ];
  const modReports = [
    { actionTaken: "ban", ip: "-1.2.3.4" },
    { actionTaken: "timeOut2", userActedOn: "TimedPlayer" },
  ];
  wrapper.instance().refreshModInfo();
  respondToRefresh({ userList, modReports });
  expect(wrapper.find("a.isbannedbefore").text()).toBe("BannedIP");
  expect(wrapper.find("a.istimedbefore").text()).toBe("TimedPlayer");

  wrapper.instance().requestModLog("a".repeat(24), 1);
  respond([{ actionTaken: "ban", ip: "-9.10.11.12" }]);
  expect(wrapper.find("a.isbannedbefore").text()).toBe("BannedIP");
  expect(wrapper.find("a.istimedbefore").text()).toBe("TimedPlayer");

  wrapper.instance().requestModLog(null, 0);
  respond([]);
  expect(wrapper.find("a.isbannedbefore")).toHaveLength(0);
  expect(wrapper.find("a.istimedbefore")).toHaveLength(0);
});

it("fetches only the requested older page and prevents repeated clicks from amplifying requests", () => {
  wrapper.setState({ log: [{ _id: "latest", modNotes: "Newest" }] });
  wrapper.instance().requestModLog("a".repeat(24), 1);
  wrapper.instance().requestModLog("a".repeat(24), 1);
  expect(socket.emit).toHaveBeenCalledTimes(1);
  expect(socket.emit.mock.calls[0].slice(0, 2)).toEqual(["getModActions", { before: "a".repeat(24) }]);
  const actions = Array.from({ length: 500 }, (_, index) => ({ _id: String(index), modNotes: "Historical" }));
  respond(actions);
  expect(wrapper.state("log")).toEqual(actions);
  expect(wrapper.state("log")).toHaveLength(500);
  expect(wrapper.state("modLogCursors")).toEqual([null, "a".repeat(24)]);
  wrapper.instance().requestModLog(null, 0);
  respond([{ _id: "latest", modNotes: "Newest" }]);
  expect(wrapper.state("log")).toEqual([{ _id: "latest", modNotes: "Newest" }]);
  expect(wrapper.state("modLogCursors")).toEqual([null]);
});

it("recovers loading controls on timeout and ignores a stale late response", () => {
  wrapper.instance().requestModLog();
  const firstAck = latestAck();
  jest.advanceTimersByTime(10000);
  expect(wrapper.state("modLogLoading")).toBe(false);
  expect(wrapper.state("modLogError")).toMatch(/timed out/);
  wrapper.instance().requestModLog();
  respond([{ _id: "current" }]);
  firstAck({ success: true, actions: [{ _id: "stale" }] });
  expect(wrapper.state("log")).toEqual([{ _id: "current" }]);
});

it("shows a failed request without discarding the current page", () => {
  wrapper.setState({ log: [{ _id: "keep" }] });
  wrapper.instance().requestModLog();
  socket.emit.mock.calls[0][2]({ success: false, error: "Please wait" });
  expect(wrapper.state()).toMatchObject({ log: [{ _id: "keep" }], modLogLoading: false, modLogError: "Please wait" });
});
