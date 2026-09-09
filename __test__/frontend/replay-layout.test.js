import React from "react";
import { mount, shallow } from "enzyme";
import { List } from "immutable";
import sass from "sass";
import path from "path";
import Main from "../../src/frontend-scripts/components/section-main/Main";
import Policies from "../../src/frontend-scripts/components/section-main/Policies";

let stylesheet, host;
beforeAll(() => {
  stylesheet = document.createElement("style");
  // Use the real stylesheet cascade; jsdom cannot verify viewport geometry or card animations.
  stylesheet.textContent = sass.compile(path.resolve(__dirname, "../../src/scss/style-dark.scss"), {
    logger: { warn() {}, debug() {} },
  }).css;
  document.head.appendChild(stylesheet);
});
beforeEach(() => {
  host = document.createElement("div");
  host.id = "game-container";
  document.body.appendChild(host);
});
afterEach(() => host.remove());
afterAll(() => stylesheet.remove());

it("gives replay content its own vertical scroll boundary inside the clipped app", () => {
  const main = shallow(<Main midSection="replay" userInfo={{}} />, { disableLifecycleMethods: true });
  host.innerHTML = `<section class="body-container game"><section class="${main.prop("className")}"></section></section>`;
  const panel = host.querySelector(".section-main");
  expect(window.getComputedStyle(panel).overflowY).toBe("auto");
  const live = shallow(<Main midSection="game" userInfo={{}} gameInfo={{}} />, { disableLifecycleMethods: true });
  panel.className = live.prop("className");
  expect(window.getComputedStyle(panel).overflowY).not.toBe("auto");
});

it.each([false, true])("clips unused card backs inside their piles (started: %s)", (isStarted) => {
  host.innerHTML = '<div class="players-container"><section class="players"></section></div>';
  const row = host.querySelector(".players");
  const policies = mount(
    <Policies
      gameInfo={{
        gameState: { isStarted, undrawnPolicyCount: 10 },
        trackState: { liberalPolicyCount: 2, fascistPolicyCount: 2 },
      }}
      deckShown
      deckInfo={List(["liberal", "fascist"])}
    />,
    { attachTo: row }
  );
  const pileHeight = parseFloat(window.getComputedStyle(row.querySelector(".policies-container")).height);
  for (const pile of row.querySelectorAll(".draw, .discard")) {
    const style = window.getComputedStyle(pile);
    expect(style.overflow).toBe("hidden");
    for (const card of pile.querySelectorAll(".offscreen")) {
      expect(parseFloat(window.getComputedStyle(card).top)).toBeGreaterThan(pileHeight);
    }
  }
  expect(row.querySelectorAll(".offscreen").length).toBeGreaterThan(0);
  // The intentional Show deck fan is a sibling of the clipped piles, not part of either pile.
  const fan = row.querySelector("#splay1");
  expect(fan.closest(".draw, .discard")).toBeNull();
  policies.unmount();
});
