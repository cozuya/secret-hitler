import React from "react"; // eslint-disable-line
import { shallow } from "enzyme";
import { Popup } from "semantic-ui-react";
import Tracks from "./Tracks";

const renderTracks = (general = {}) =>
  shallow(
    <Tracks gameInfo={{ general, publicPlayersState: [], cardFlingerState: [], trackState: {}, gameState: {} }} />
  );

describe("Tracks", () => {
  it("should initialize correctly", () => {
    // remakeStatus moved to the extracted RemakeButton component (shared by Tracks and Flappy)
    const initialState = {
      minutes: 0,
      seconds: 0,
      timedMode: false,
      showTimer: false,
    };

    const component = shallow(
      <Tracks gameInfo={{ general: {}, publicPlayersState: [], cardFlingerState: [], trackState: {}, gameState: {} }} />
    );

    expect(component.state()).toEqual(initialState);
  });

  it("shows the Neighbor Chat icon and explains live privacy and public replays", () => {
    const component = renderTracks({ neighborChat: true });
    const popup = component.find(Popup).filterWhere((item) => item.prop("trigger").props.className === "exchange icon");
    expect(popup).toHaveLength(1);
    expect(popup.prop("trigger").type).toBe("i");
    expect(popup.prop("inverted")).toBe(true);
    expect(popup.prop("content")).toBe(
      "Neighbor Chat - /l and /r message your nearest living neighbor to the left or right; messages are visible only to you, your neighbor, and authorized moderators, including after the game."
    );
  });

  it.each([false, undefined])("omits the Neighbor Chat icon and tooltip when the flag is %s", (neighborChat) => {
    const component = renderTracks({ neighborChat });
    expect(component.find(Popup).someWhere((item) => item.prop("trigger").props.className === "exchange icon")).toBe(
      false
    );
    expect(component.find(Popup).someWhere((item) => item.prop("content").includes("Neighbor Chat"))).toBe(false);
    expect(component.find(".option-icons").html()).toBe(renderTracks().find(".option-icons").html());
  });
});
