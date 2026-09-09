/* eslint-disable */
"use strict";

import $ from "jquery";
import Transition from "semantic-ui-transition";

$.fn.transition = Transition;

export default () => {
  const desktopLayout = window.matchMedia("(min-width: 951px)");
  const restoreDesktopChat = ({ matches }) => {
    // The mobile Chat button disappears on desktop, so its hidden/animating state cannot survive that switch.
    if (matches) {
      $(".game > .ui.grid .chat-container")
        .transition("stop all")
        .transition("reset")
        .removeClass("hidden visible")
        .css("display", "");
    }
  };
  desktopLayout.addListener(restoreDesktopChat);

  $("body").on("click", "#chatsidebar", (event) => {
    event.preventDefault();

    if (window.location.href.indexOf("#/replay/") !== -1) {
      $("#playerlist").transition({
        animation: "slide left",
        displayType: "flex",
      });
      $("#playerlist").css({ position: "relative", right: "55%" });
    } else if (window.location.href.indexOf("#/table/") === -1) {
      $("#playerlist").transition({
        animation: "slide left",
        displayType: "flex",
      });
      $("#playerlist").css({ position: "", right: "" });
    } else {
      $(".chat-container").transition({
        animation: "slide left",
        displayType: "flex",
      });
    }
  });

  return () => {
    desktopLayout.removeListener(restoreDesktopChat);
    $("body").off("click", "#chatsidebar");
  };
};
