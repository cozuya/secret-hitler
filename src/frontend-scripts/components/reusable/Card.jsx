import React from "react"; // eslint-disable-line
import classnames from "classnames";
import Icon from "./Icon";

/**
 * @param {object} type - todo
 * @param {object} icon - todo
 * @return {jsx}
 */
const Card = ({ type, icon }) => {
  // `icon` is a Semantic icon spec like "huge red ban": the last token is the glyph name and
  // the leading tokens are size/color modifiers (mirrored by .lucide-icon shim classes). Only
  // single-word glyph names are passed here (currently just the discard-pile "ban").
  let renderedIcon = null;
  if (icon) {
    const parts = icon.split(" ");
    const name = parts.pop();
    renderedIcon = <Icon name={name} className={parts.join(" ")} />;
  }

  return <div className={classnames(type, "card")}>{renderedIcon}</div>;
};

export default Card;
