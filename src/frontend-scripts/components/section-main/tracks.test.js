import React from "react"; // eslint-disable-line
import { shallow } from "enzyme";
import Tracks from "./Tracks";

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
});
