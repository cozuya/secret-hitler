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

describe("previous-government marker placement", () => {
  const seat = (marker) => `
    <div class="player-container">
      <div class="player-number">1. Alpha</div>
      ${marker ? `<span class="previous-government-token ${marker}"><span class="previous-government-art"></span><span class="previous-government-prefix">Prev.</span></span>` : ""}
      <div class="government-token isPendingPresident"></div>
      <div class="card-container"><i class="large file icon blacklist"></i></div>
    </div>`;
  const px = (value) => parseFloat(value);

  beforeEach(() => {
    host.innerHTML = `<div class="players-container"><section class="players">${seat("wasChancellor")}${seat("wasPresident")}${seat()}</section></div>`;
  });

  it("keeps names at the same position with or without a marker", () => {
    const [withMarker, , without] = host.querySelectorAll(".player-container");
    for (const container of [withMarker, without]) {
      expect(window.getComputedStyle(container).marginTop).toBe("18px");
      expect(window.getComputedStyle(container.querySelector(".player-number")).marginTop).toBe("-21px");
    }
  });

  it("puts the marker in the band below the cardback, apart from the current government token", () => {
    const container = host.querySelector(".player-container");
    const cardHeight = px(window.getComputedStyle(container).height);
    const band = px(window.getComputedStyle(container).marginBottom);
    const marker = window.getComputedStyle(container.querySelector(".previous-government-token"));
    const current = window.getComputedStyle(container.querySelector(".government-token"));
    expect(marker.position).toBe("absolute");
    expect(px(marker.top)).toBeGreaterThanOrEqual(cardHeight);
    expect(px(marker.top) + px(marker.height)).toBeLessThanOrEqual(cardHeight + band);
    // The current/pending token stays on the card, so both can show on one seat without overlapping.
    expect(px(current.top) + px(current.height)).toBeLessThanOrEqual(px(marker.top));
    expect(px(marker.opacity)).toBeLessThan(1);
  });

  it("keeps the hidden role card clear of the marker band", () => {
    const container = host.querySelector(".player-container");
    const bottomOfBand =
      px(window.getComputedStyle(container).height) + px(window.getComputedStyle(container).marginBottom);
    const card = host.querySelector(".card-container");
    expect(px(window.getComputedStyle(card).top)).toBeGreaterThan(bottomOfBand);
    card.classList.add("showing");
    expect(window.getComputedStyle(card).top).toBe("1px");
  });

  it("stays hoverable so the Previous president/chancellor tooltip shows", () => {
    const marker = host.querySelector(".previous-government-token");
    expect(window.getComputedStyle(marker).pointerEvents).not.toBe("none");
  });

  it("drops the whole Prev. label, never the token art, when a seat is too narrow for both", () => {
    const marker = window.getComputedStyle(host.querySelector(".previous-government-token"));
    const prefix = window.getComputedStyle(host.querySelector(".previous-government-prefix"));
    const art = window.getComputedStyle(host.querySelector(".previous-government-art"));
    // The label is the later item, so it is the one that wraps onto the hidden second line.
    expect(marker.flexWrap).toBe("wrap");
    expect(marker.flexDirection).toBe("row-reverse");
    expect(marker.overflow).toBe("hidden");
    // One 16px line: a wrapped second line (the label) is clipped away.
    expect(marker.height).toBe("16px");
    // jsdom keeps the gap shorthand unexpanded; its first value is the row gap.
    expect(px(marker.getPropertyValue("gap"))).toBeGreaterThanOrEqual(px(marker.height));
    expect(prefix.flexShrink).toBe("0");
    expect(px(art.minWidth)).toBeGreaterThanOrEqual(20);
  });

  it("keeps the blacklist icon at the top of the seat while the role card is hidden", () => {
    const card = host.querySelector(".card-container");
    const icon = window.getComputedStyle(card.querySelector(".blacklist"));
    expect(px(icon.top) + px(window.getComputedStyle(card).top)).toBe(0);
  });

  it.each([
    [0, "chancellor-token.png"],
    [1, "president-token.png"],
  ])("uses the token art for seat %i (%s)", (index, image) => {
    const art = host.querySelectorAll(".previous-government-art")[index];
    expect(window.getComputedStyle(art).backgroundImage).toContain(image);
  });
});
