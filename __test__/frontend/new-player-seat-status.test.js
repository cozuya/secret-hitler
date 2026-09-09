import React from "react";
import { mount } from "enzyme";
import $ from "jquery";
import ConnectedPlayers from "../../src/frontend-scripts/components/section-main/Players.jsx";

const Players = ConnectedPlayers.WrappedComponent;
const originalModal = $.fn.modal;
let wrapper, socket;

beforeEach(() => {
  $.fn.modal = jest.fn();
  socket = { on: jest.fn(), off: jest.fn(), emit: jest.fn() };
  wrapper = mount(
    <Players
      socket={socket}
      userInfo={{ userName: "RainbowObserver", isRainbowOverall: true, gameSettings: { disablePlayerNotes: true } }}
      userList={{ list: [] }}
      gameInfo={{
        general: { uid: "NewPlayerSeats", maxPlayersCount: 7 },
        gameState: { undrawnPolicyCount: 17 },
        trackState: { liberalPolicyCount: 0, fascistPolicyCount: 0 },
        publicPlayersState: [],
        playersState: [],
      }}
    />
  );
});

afterEach(() => {
  if (wrapper.length) wrapper.unmount();
  if (originalModal) $.fn.modal = originalModal;
  else delete $.fn.modal;
});

it.each([
  ["newPlayerOnly", "This game is reserved for players who haven't reached Rainbow yet."],
  ["blacklisted", "This game's creator has you blacklisted."],
])("shows the corresponding rejection modal for %s", (status, message) => {
  const onStatus = socket.on.mock.calls.find(([event]) => event === "gameJoinStatusUpdate")[1];
  onStatus({ status });
  expect($.fn.modal).toHaveBeenCalledTimes(1);
  expect($.fn.modal).toHaveBeenCalledWith("show");
  const shownModal = $.fn.modal.mock.instances[0];
  expect(shownModal.is(".ui.basic.small.modal")).toBe(true);
  expect(shownModal.find(".ui.header").text()).toBe(message);
  expect(socket.emit).not.toHaveBeenCalled();
});

it("ignores unknown statuses and removes the listener on unmount", () => {
  const onStatus = socket.on.mock.calls.find(([event]) => event === "gameJoinStatusUpdate")[1];
  onStatus({ status: "unknown" });
  expect($.fn.modal).not.toHaveBeenCalled();
  wrapper.unmount();
  expect(socket.off).toHaveBeenCalledWith("gameJoinStatusUpdate");
});
