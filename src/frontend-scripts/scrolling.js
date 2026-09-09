export const canScrollHorizontally = (element) =>
  Boolean(
    element &&
      element.clientWidth > 0 &&
      element.scrollWidth > element.clientWidth &&
      ["auto", "scroll"].includes(window.getComputedStyle(element).overflowX)
  );
