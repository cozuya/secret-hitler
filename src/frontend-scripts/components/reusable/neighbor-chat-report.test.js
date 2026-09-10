import React from "react";
import { shallow } from "enzyme";
import Swal from "sweetalert2";
import socket from "../../socket";
import NeighborChatReport from "./NeighborChatReport";

jest.mock("sweetalert2", () => ({ fire: jest.fn(), showValidationMessage: jest.fn(), isLoading: jest.fn() }));
jest.mock("../../socket", () => ({ emit: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  Swal.fire.mockResolvedValue({});
});

const render = (metadata, username = "Recipient") =>
  shallow(
    <NeighborChatReport
      chat={{ neighborChat: { id: "message-id", ...metadata } }}
      username={username}
      gameUid="table"
    />
  );

it.each([
  { incoming: true },
  { sender: "Sender", recipient: "Recipient" },
])("lets the live/replay recipient report %j", (metadata) => {
  expect(render(metadata).find("button")).toHaveLength(1);
});

it.each([
  { incoming: false },
  { sender: "Recipient", recipient: "Sender" },
  { sender: "Other", recipient: "Stranger" },
  {},
])("does not offer a report for non-incoming row %j", (metadata) => {
  expect(render(metadata).isEmptyRender()).toBe(true);
});

it("does not offer reports to anonymous viewers", () => {
  expect(render({ incoming: true }, "").isEmptyRender()).toBe(true);
});

it("sends only the message reference and reason and confirms server success", async () => {
  render({ incoming: true }).simulate("click");
  const dialog = Swal.fire.mock.calls[0][0];
  expect(dialog.inputValidator(" ")).toBeTruthy();
  socket.emit.mockImplementation((event, payload, ack) => ack({ success: true }));
  await expect(dialog.preConfirm("harassment")).resolves.toBe(true);
  expect(socket.emit).toHaveBeenCalledWith(
    "reportNeighborChat",
    {
      gameUid: "table",
      messageId: "message-id",
      comment: "harassment",
    },
    expect.any(Function)
  );
});

it("keeps the dialog open and shows a rejected report", async () => {
  render({ incoming: true }).simulate("click");
  socket.emit.mockImplementation((event, payload, ack) => ack({ success: false, error: "Unavailable" }));
  await expect(Swal.fire.mock.calls[0][0].preConfirm("reason")).resolves.toBe(false);
  expect(Swal.showValidationMessage).toHaveBeenCalledWith("Unavailable");
});

it("allows retry when the acknowledgement times out", async () => {
  jest.useFakeTimers();
  try {
    socket.emit.mockImplementation(() => {});
    render({ incoming: true }).simulate("click");
    const pending = Swal.fire.mock.calls[0][0].preConfirm("reason");
    jest.advanceTimersByTime(10000);
    await expect(pending).resolves.toBe(false);
    expect(Swal.showValidationMessage).toHaveBeenCalledWith(expect.stringContaining("try again"));
  } finally {
    jest.useRealTimers();
  }
});
