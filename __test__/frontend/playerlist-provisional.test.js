import React from "react";
import { shallow } from "enzyme";
import ConnectedPlayerlist from "../../src/frontend-scripts/components/section-right/Playerlist";

const Playerlist = ConnectedPlayerlist.WrappedComponent;
const render = (user = {}, settings = {}) =>
  shallow(
    <Playerlist
      userInfo={{ gameSettings: { blacklist: [], ...settings } }}
      userList={{ list: [{ userName: "Ada", eloSeason: 1500, eloOverall: 2200, ...user }] }}
      socket={{}}
    />
  );

it.each([
  false,
  true,
])("shows a provisional seasonal score in either list layout (legacy=%s)", (disableAggregations) => {
  const wrapper = render({ winsSeason: 4, lossesSeason: 5 }, { disableAggregations });
  if (!disableAggregations) wrapper.setState({ expandInfo: { inexp: true } });
  const row = wrapper.find(".user-container");
  expect(row.find(".userlist-stats").text()).toBe("1500 P");
  expect(row.find("abbr").prop("aria-label")).toBe("Provisional seasonal rating");
  expect(row.find("abbr").prop("title")).toContain("fewer than 10 ranked games this season");
});

it("removes the marker at ten games while the public score stays visible", () => {
  const wrapper = render({ winsSeason: 4, lossesSeason: 6 }, { disableAggregations: true });
  expect(wrapper.find(".user-container abbr")).toHaveLength(0);
  expect(wrapper.find(".user-container .userlist-stats").text()).toBe("1500");
});

it("uses total season counts even in the Rainbow filter", () => {
  const wrapper = render({
    isRainbowSeason: true,
    winsSeason: 3,
    lossesSeason: 6,
    rainbowWinsSeason: 20,
    rainbowLossesSeason: 20,
  });
  wrapper.setState({ userListFilter: "rainbow" });
  expect(wrapper.find(".user-container abbr")).toHaveLength(1);
});

it.each([
  { disableSeasonal: true },
  { disableElo: true },
])("does not mark overall ratings or the win/loss display (%j)", (settings) => {
  const wrapper = render({ winsSeason: 1, lossesSeason: 0 }, { disableAggregations: true, ...settings });
  expect(wrapper.find(".user-container abbr")).toHaveLength(0);
});

it("honors the staff visibility setting", () => {
  const wrapper = render({ staffDisableVisibleElo: true }, { disableAggregations: true });
  expect(wrapper.find(".user-container .userlist-stats")).toHaveLength(0);
  expect(wrapper.find(".user-container abbr")).toHaveLength(0);
});

it.each([undefined, 0, -100])("uses 1500 for an absent score and preserves finite public totals (%p)", (eloSeason) => {
  const wrapper = render({ eloSeason }, { disableAggregations: true });
  expect(wrapper.find(".user-container .userlist-stats").text()).toBe(
    `${eloSeason === undefined ? 1500 : eloSeason} P`
  );
});
