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

const respond = (actions, extra = {}) => {
  const [, , ack] = socket.emit.mock.calls[socket.emit.mock.calls.length - 1];
  ack({ success: true, actions, hasMore: true, nextCursor: "c".repeat(24), ...extra });
};

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
  const firstAck = socket.emit.mock.calls[0][2];
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
