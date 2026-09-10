import React from "react"; // eslint-disable-line
import { shallow } from "enzyme";
import Reports from "./Reports";

describe("Reports", () => {
  it("should initialize correctly", () => {
    const initialState = {
      reports: [],
      sortType: "date",
      sortDirection: "descending",
    };

    const component = shallow(<Reports socket={{ emit: jest.fn(), on: jest.fn() }} />);

    expect(component.state()).toEqual(initialState);
  });

  it("renders retained evidence and identifies the reported message without interpreting markup", () => {
    const component = shallow(<Reports socket={{ emit: jest.fn(), on: jest.fn() }} />);
    component.setState({
      reports: [
        {
          date: new Date(),
          gameUid: "table",
          neighborMessageId: "reported",
          comment: "reason",
          neighborChatContext: [
            { neighborChat: { id: "earlier" }, chat: [{ text: "Earlier context" }] },
            { neighborChat: { id: "reported" }, chat: [{ text: "Sender: " }, { text: "<img src=x>" }] },
          ],
        },
      ],
    });
    expect(component.find("details summary").text()).toBe("Neighbor Chat evidence");
    expect(component.find("details strong").text()).toBe("Sender: <img src=x>");
    expect(component.find("details img")).toHaveLength(0);
    expect(component.find("details").text()).toContain("Earlier context");
  });

  it("explains evidence withheld during play", () => {
    const component = shallow(<Reports socket={{ emit: jest.fn(), on: jest.fn() }} />);
    component.setState({ reports: [{ date: new Date(), gameUid: "table", neighborMessageId: "reported" }] });
    expect(component.find("details")).toHaveLength(0);
    expect(component.text()).toContain("Chat evidence is available after the game.");
  });
});
