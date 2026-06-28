/* eslint-disable */
"use strict";

import $ from "jquery";
import Transition from "semantic-ui-transition";

$.fn.transition = Transition;

export default () => {
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
};
