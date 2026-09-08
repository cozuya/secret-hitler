import React from "react";
import { shallow } from "enzyme";
import RemakeButton from "../../src/frontend-scripts/components/section-main/RemakeButton";

describe("remake vote hydration", () => {
  it("restores a vote after a board remount and rescinds it on the next click", () => {
    const socket = { on: jest.fn(), removeListener: jest.fn(), emit: jest.fn() };
    const gameInfo = {
      general: { uid: "game" },
      gameState: { isStarted: true, isTracksFlipped: true },
      remakeStatus: true,
    };
    const props = { socket, gameInfo, userInfo: { userName: "Ada", isSeated: true } };
    const tracksButton = shallow(<RemakeButton {...props} />);
    tracksButton.unmount();
    const flappyButton = shallow(<RemakeButton {...props} />);
    expect(flappyButton.find("i").hasClass("enabled")).toBe(true);
    flappyButton.find("i").simulate("click");
    expect(socket.emit).toHaveBeenCalledWith("updateRemake", { uid: "game", remakeStatus: false });
    flappyButton.setProps({ gameInfo: { ...gameInfo, remakeStatus: false } });
    expect(flappyButton.find("i").hasClass("enabled")).toBe(false);
    flappyButton.unmount();
  });
});
