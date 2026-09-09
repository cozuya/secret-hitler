import $ from "jquery";
import initializeChatAnimation from "./chatanimation";

describe("chat visibility after resizing", () => {
  let desktopLayout, onChange, cleanup;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    desktopLayout = {
      matches: false,
      addListener: jest.fn((listener) => {
        onChange = listener;
      }),
      removeListener: jest.fn(),
    };
    window.matchMedia = jest.fn(() => desktopLayout);
    document.body.innerHTML = `
      <style>.chat-container { display: flex; }
      .transition.hidden { display: none; visibility: hidden; }
      .transition.visible { visibility: visible; }</style>
      <section class="game"><div class="ui grid"><div class="chat-container transition" style="display: flex">Chat</div></div></section>
      <div class="other-chat transition">Other chat</div>`;
    cleanup = initializeChatAnimation();
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    window.matchMedia = originalMatchMedia;
  });

  it("restores chat hidden on mobile when the desktop restore button is absent", () => {
    const chat = $(".chat-container");
    chat.transition("setting", "displayType", "flex").transition("hide");
    $(".other-chat").transition("hide");
    expect(chat.css("visibility")).toBe("hidden");
    onChange({ matches: true });
    expect(chat.hasClass("hidden")).toBe(false);
    expect(chat.css("display")).toBe("flex");
    expect(chat.css("visibility")).not.toBe("hidden");
    expect(chat.hasClass("visible")).toBe(false);
    expect($(".other-chat").hasClass("hidden")).toBe(true);
  });

  it("leaves mobile visibility alone and works across repeated resize cycles", () => {
    const chat = $(".chat-container");
    for (let cycle = 0; cycle < 2; cycle++) {
      chat.transition("setting", "displayType", "flex").transition("hide");
      onChange({ matches: false });
      expect(chat.hasClass("hidden")).toBe(true);
      onChange({ matches: true });
      expect(chat.hasClass("hidden")).toBe(false);
    }
  });
});
